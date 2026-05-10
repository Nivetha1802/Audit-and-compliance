import os
import re
import json
import io
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import werkzeug
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
# ── Gemini setup ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)
CORS(app)


def amounts_match(extracted: float, expected: float, tolerance_pct: float = 1.0) -> bool:
    if expected == 0:
        return extracted == 0
    return abs(extracted - expected) / abs(expected) * 100 <= tolerance_pct


def extract_amount_with_gemini(file_bytes: bytes, mime_type: str) -> dict:
    """
    Upload the file to Gemini and ask it to extract the grand total.
    Returns {'total_amount': float|None, 'currency': str, 'is_final': bool, 'raw': str}
    """
    if not GEMINI_API_KEY:
        return {'total_amount': None, 'currency': 'INR', 'is_final': False,
                'error': 'GEMINI_API_KEY not set'}

    model = genai.GenerativeModel('gemini-2.5-flash')

    # Write bytes to a temp file so genai.upload_file can read it
    suffix = '.pdf' if 'pdf' in mime_type else '.jpg'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        uploaded = genai.upload_file(path=tmp_path, mime_type=mime_type)
        prompt = (
            "Analyze this document carefully. "
            "1. Identify the 'Grand Total' or 'Total Amount Payable' including all taxes. "
            "2. Return ONLY a valid JSON object with exactly these keys: "
            "'total_amount' (number, no currency symbol), "
            "'currency' (string, e.g. 'INR'), "
            "'is_final' (boolean, true if this is the final payable amount). "
            "Do not include any explanation or markdown — only the raw JSON object."
        )
        response = model.generate_content([uploaded, prompt])
        raw = response.text.strip()
        print(f"[DEBUG] Gemini raw response: {raw!r}", flush=True)

        # Strip markdown code fences if present
        clean = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.MULTILINE).strip()
        result = json.loads(clean)
        result['raw'] = raw
        return result
    except Exception as e:
        print(f"[DEBUG] Gemini extraction failed: {e}", flush=True)
        return {'total_amount': None, 'currency': 'INR', 'is_final': False, 'error': str(e)}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


# ── /validate-evidence ────────────────────────────────────────────────────────

@app.route('/validate-evidence', methods=['POST'])
def validate_evidence():
    print(f"[DEBUG] Content-Type: {request.content_type}", flush=True)
    print(f"[DEBUG] form keys: {list(request.form.keys())}", flush=True)
    print(f"[DEBUG] files keys: {list(request.files.keys())}", flush=True)

    extracted_amount = None
    method = 'none'

    # ── Case 1: image/PDF file uploaded ──────────────────────────────────────
    if 'file' in request.files:
        file = request.files['file']
        original_filename = request.form.get('original_filename') or file.filename or 'evidence'
        content_type = file.content_type or 'application/octet-stream'
        file_bytes = file.read()

        print(f"[DEBUG] file={original_filename!r}, content_type={content_type!r}, size={len(file_bytes)}", flush=True)

        gemini_result = extract_amount_with_gemini(file_bytes, content_type)
        print(f"[DEBUG] gemini_result={gemini_result}", flush=True)

        if gemini_result.get('total_amount') is not None:
            extracted_amount = float(gemini_result['total_amount'])
            method = 'gemini'
        else:
            method = 'no_extraction'

        try:
            transaction = json.loads(request.form.get('transaction', '{}'))
        except Exception:
            transaction = {}

    # ── Case 2: JSON body with pre-extracted metadata ────────────────────────
    else:
        body = request.get_json(force=True, silent=True) or {}
        transaction = body.get('transaction', {})
        evidence = body.get('evidence', {})
        extracted_amount = evidence.get('extractedAmount') or evidence.get('amount')
        method = evidence.get('method', 'metadata')

    # ── Compare amounts ───────────────────────────────────────────────────────
    tx_amount = float(transaction.get('amount', 0) or 0)
    issues = []

    if extracted_amount is None:
        status = 'NEEDS_REVIEW'
        confidence = 0.2
        match = False
        issues.append('Could not extract amount from evidence document')
    else:
        match = amounts_match(extracted_amount, tx_amount)
        diff = abs(extracted_amount - tx_amount)
        diff_pct = (diff / tx_amount * 100) if tx_amount else 0

        if match:
            status = 'VALIDATED'
            confidence = 0.97
        else:
            status = 'MISMATCH'
            confidence = 0.95
            issues.append(
                f'Amount mismatch: extracted ₹{extracted_amount:,.2f} vs '
                f'transaction ₹{tx_amount:,.2f} (diff: ₹{diff:,.2f} / {diff_pct:.1f}%)'
            )

    return jsonify({
        'result': status,
        'validation_status': status,
        'confidence': confidence,
        'needs_human_review': status != 'VALIDATED',
        'amount_match': match,
        'extracted_amount': extracted_amount,
        'transaction_amount': tx_amount,
        'extraction_method': method,
        'issues': issues,
    })


# ── Other endpoints ───────────────────────────────────────────────────────────

@app.route('/extract-document', methods=['POST'])
def extract_document():
    """
    Extract structured data from a document (PO, GRN, or Invoice).
    Accepts multipart/form-data with 'file' and optional 'doc_type' hint.
    Returns: { amount, vendor, date, doc_number, doc_type, currency, confidence }
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    doc_type_hint = request.form.get('doc_type', '')
    content_type = file.content_type or 'application/octet-stream'
    file_bytes = file.read()

    if not GEMINI_API_KEY:
        return jsonify({'error': 'GEMINI_API_KEY not set'}), 500

    model = genai.GenerativeModel('gemini-2.5-flash')
    suffix = '.pdf' if 'pdf' in content_type else '.jpg'

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        uploaded = genai.upload_file(path=tmp_path, mime_type=content_type)
        prompt = (
            f"Analyze this {'Purchase Order' if 'po' in doc_type_hint.lower() else 'GRN' if 'grn' in doc_type_hint.lower() else 'Invoice' if 'invoice' in doc_type_hint.lower() else 'financial document'} carefully. "
            "Extract the following fields and return ONLY a valid JSON object with these exact keys: "
            "'amount' (number — the total/grand total payable amount including taxes, no currency symbol), "
            "'vendor' (string — vendor/supplier name), "
            "'date' (string — document date in YYYY-MM-DD format if possible), "
            "'doc_number' (string — PO number, GRN number, or Invoice number), "
            "'doc_type' (string — one of: PO, GRN, INVOICE), "
            "'currency' (string — e.g. INR). "
            "If a field cannot be found, use null. Return only the raw JSON object, no markdown."
        )
        response = model.generate_content([uploaded, prompt])
        raw = response.text.strip()
        print(f"[DEBUG] extract_document Gemini response: {raw!r}", flush=True)
        clean = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.MULTILINE).strip()
        result = json.loads(clean)
        result['confidence'] = 0.95
        return jsonify(result)
    except Exception as e:
        print(f"[DEBUG] extract_document failed: {e}", flush=True)
        return jsonify({'error': str(e), 'amount': None, 'vendor': None, 'doc_number': None, 'doc_type': doc_type_hint, 'confidence': 0.0}), 200
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.route('/three-way-match-from-docs', methods=['POST'])
def three_way_match_from_docs():
    """
    Accepts extracted data from PO, GRN, and Invoice documents and runs three-way match.
    Body: { po: {amount, vendor, doc_number}, grn: {amount, vendor, doc_number}, invoice: {amount, vendor, doc_number}, transaction_amount: number }
    """
    body = request.get_json(force=True, silent=True) or {}
    po = body.get('po') or {}
    grn = body.get('grn') or {}
    invoice = body.get('invoice') or {}
    tx_amount = float(body.get('transaction_amount') or 0)

    po_amount  = float(po.get('amount') or 0)
    grn_amount = float(grn.get('amount') or 0)
    inv_amount = float(invoice.get('amount') or 0)
    po_vendor  = po.get('vendor') or ''
    inv_vendor = invoice.get('vendor') or ''

    issues = []
    matched_docs = []

    if po_amount and inv_amount:
        if amounts_match(inv_amount, po_amount, 2.0):
            matched_docs.append('PO ↔ Invoice ✓')
        else:
            issues.append(f'Invoice ₹{inv_amount:,.2f} does not match PO ₹{po_amount:,.2f}')

    if grn_amount and inv_amount:
        if amounts_match(inv_amount, grn_amount, 2.0):
            matched_docs.append('GRN ↔ Invoice ✓')
        else:
            issues.append(f'Invoice ₹{inv_amount:,.2f} does not match GRN ₹{grn_amount:,.2f}')

    if po_amount and grn_amount:
        if amounts_match(grn_amount, po_amount, 2.0):
            matched_docs.append('PO ↔ GRN ✓')
        else:
            issues.append(f'GRN ₹{grn_amount:,.2f} does not match PO ₹{po_amount:,.2f}')

    if po_vendor and inv_vendor and po_vendor.lower() != inv_vendor.lower():
        issues.append(f'Vendor mismatch: PO "{po_vendor}" vs Invoice "{inv_vendor}"')

    if tx_amount and inv_amount and not amounts_match(inv_amount, tx_amount, 1.0):
        issues.append(f'Invoice ₹{inv_amount:,.2f} does not match ledger transaction ₹{tx_amount:,.2f}')

    status = 'VALIDATED' if not issues else 'MISMATCH'
    return jsonify({
        'result': status,
        'confidence': 0.95 if not issues else 0.88,
        'needs_human_review': bool(issues),
        'issues': issues,
        'matched': matched_docs,
        'extracted': {
            'po_amount': po_amount,
            'grn_amount': grn_amount,
            'invoice_amount': inv_amount,
            'po_vendor': po_vendor,
            'invoice_vendor': inv_vendor,
        }
    })
    body = request.get_json(force=True, silent=True) or {}
    po_amount  = float(body.get('po_amount') or 0)
    wp_amount  = float(body.get('work_progress_amount') or 0)
    inv_amount = float(body.get('invoice_amount') or 0)
    po_vendor  = body.get('po_vendor', '')
    inv_vendor = body.get('invoice_vendor', '')

    issues = []
    if po_amount and inv_amount and not amounts_match(inv_amount, po_amount, 2.0):
        issues.append(f'Invoice ₹{inv_amount:,.2f} does not match PO ₹{po_amount:,.2f}')
    if wp_amount and inv_amount and not amounts_match(inv_amount, wp_amount, 5.0):
        issues.append(f'Invoice ₹{inv_amount:,.2f} does not match work progress ₹{wp_amount:,.2f}')
    if po_vendor and inv_vendor and po_vendor.lower() != inv_vendor.lower():
        issues.append(f'Vendor mismatch: "{po_vendor}" vs "{inv_vendor}"')

    status = 'VALIDATED' if not issues else 'MISMATCH'
    return jsonify({
        'result': status, 'confidence': 0.92 if not issues else 0.85,
        'needs_human_review': bool(issues), 'issues': issues,
    })


@app.route('/budget-variance', methods=['POST'])
def budget_variance():
    body = request.get_json(force=True, silent=True) or {}
    categories = body.get('categories', [])
    threshold  = float(body.get('alert_threshold_pct', 10.0))
    alerts = []
    for cat in categories:
        budgeted = float(cat.get('budgeted') or 0)
        actual   = float(cat.get('actual') or 0)
        if budgeted > 0:
            variance_pct = (actual - budgeted) / budgeted * 100
            if abs(variance_pct) >= threshold:
                alerts.append({'category': cat.get('name', 'Unknown'),
                                'budgeted': budgeted, 'actual': actual,
                                'variance_pct': round(variance_pct, 2)})
    status = 'CLEARED' if not alerts else 'NEEDS_REVIEW'
    return jsonify({
        'overall_status': status, 'result': status, 'confidence': 0.95,
        'needs_human_review': bool(alerts), 'alerts': alerts,
        'issues': [f"{a['category']}: {a['variance_pct']:+.1f}% variance" for a in alerts],
    })


@app.route('/duplicate-detection', methods=['POST'])
def duplicate_detection():
    body = request.get_json(force=True, silent=True) or {}
    transactions = body.get('transactions', [])
    duplicates, seen = [], {}
    for tx in transactions:
        key = (str(tx.get('amount', '')), str(tx.get('date', '')), str(tx.get('vendor', '')))
        if key in seen:
            duplicates.append({'original': seen[key], 'duplicate': tx.get('id')})
        else:
            seen[key] = tx.get('id')
    status = 'CLEARED' if not duplicates else 'DUPLICATE_FOUND'
    return jsonify({
        'result': status, 'overall_status': status, 'confidence': 0.95,
        'needs_human_review': bool(duplicates), 'duplicates': duplicates,
        'issues': [f"Duplicate: {d['original']} / {d['duplicate']}" for d in duplicates],
    })


if __name__ == '__main__':
    app.run(port=5000, debug=True)
