package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiAnalysisService {

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    private final AiAnalysisResultRepository resultRepository;
    private final TransactionRepository transactionRepository;
    private final DocumentRepository documentRepository;
    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    public AiAnalysisService(AiAnalysisResultRepository resultRepository,
                              TransactionRepository transactionRepository,
                              DocumentRepository documentRepository,
                              ChecklistRepository checklistRepository,
                              ChecklistItemRepository checklistItemRepository,
                              SecurityUtils securityUtils) {
        this.resultRepository = resultRepository;
        this.transactionRepository = transactionRepository;
        this.documentRepository = documentRepository;
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.securityUtils = securityUtils;
    }

    // ── Three-Way Match from uploaded checklist documents ────────────────────

    /**
     * Finds PO, GRN, and Invoice documents from the transaction's checklist items
     * (matched by description keywords), extracts amounts using Gemini, then runs
     * the three-way match comparison.
     *
     * Checklist item descriptions must contain keywords:
     *   PO:      "purchase order", "po"
     *   GRN:     "grn", "goods receipt", "delivery note"
     *   Invoice: "invoice", "bill"
     */
    @Transactional
    public AiAnalysisResult runThreeWayMatchFromDocuments(UUID transactionId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        // Walk: transaction → checklist → checklist items → documents
        Checklist checklist = checklistRepository.findByTransactionId(transactionId)
                .orElse(null);

        Map<String, JsonNode> extracted = new HashMap<>();

        if (checklist != null) {
            List<ChecklistItem> items = checklistItemRepository.findByChecklistId(checklist.getId());
            for (ChecklistItem item : items) {
                if (item.getDocumentId() == null) continue;

                String desc = item.getDescription() != null ? item.getDescription().toLowerCase() : "";
                String docType;
                if (desc.contains("purchase order") || desc.contains(" po") || desc.startsWith("po")) {
                    docType = "PO";
                } else if (desc.contains("grn") || desc.contains("goods receipt") || desc.contains("delivery note")) {
                    docType = "GRN";
                } else if (desc.contains("invoice") || desc.contains("bill")) {
                    docType = "INVOICE";
                } else {
                    continue;
                }

                if (extracted.containsKey(docType)) continue; // use first match per type

                documentRepository.findById(item.getDocumentId()).ifPresent(doc -> {
                    JsonNode docData = extractDocumentData(doc, docType);
                    extracted.put(docType, docData);
                });
            }
        }

        if (extracted.isEmpty()) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("result", "NEEDS_REVIEW");
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            ArrayNode issues = error.putArray("issues");
            issues.add("No PO, GRN, or Invoice documents found. Upload evidence with checklist item " +
                    "descriptions containing 'Purchase Order', 'GRN', or 'Invoice'.");
            return saveResult(transactionId, orgId, "THREE_WAY_MATCH", error);
        }

        // Build payload
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
        payload.set("po",      extracted.getOrDefault("PO",      objectMapper.createObjectNode()));
        payload.set("grn",     extracted.getOrDefault("GRN",     objectMapper.createObjectNode()));
        payload.set("invoice", extracted.getOrDefault("INVOICE", objectMapper.createObjectNode()));

        JsonNode response = callAiService("/three-way-match-from-docs", payload);

        // Persist extracted values back onto the transaction
        persistExtracted(tx, extracted);
        transactionRepository.save(tx);

        return saveResult(transactionId, orgId, "THREE_WAY_MATCH", response);
    }

    private void persistExtracted(Transaction tx, Map<String, JsonNode> extracted) {
        if (extracted.containsKey("PO")) {
            JsonNode po = extracted.get("PO");
            if (!po.path("amount").isMissingNode() && !po.path("amount").isNull())
                tx.setPoAmount(java.math.BigDecimal.valueOf(po.path("amount").asDouble()));
            if (!po.path("doc_number").isMissingNode() && !po.path("doc_number").isNull())
                tx.setPoNumber(po.path("doc_number").asText());
            if (!po.path("vendor").isMissingNode() && !po.path("vendor").isNull() && tx.getVendorCustomer() == null)
                tx.setVendorCustomer(po.path("vendor").asText());
        }
        if (extracted.containsKey("GRN")) {
            JsonNode grn = extracted.get("GRN");
            if (!grn.path("amount").isMissingNode() && !grn.path("amount").isNull())
                tx.setGrnAmount(java.math.BigDecimal.valueOf(grn.path("amount").asDouble()));
            if (!grn.path("doc_number").isMissingNode() && !grn.path("doc_number").isNull())
                tx.setGrnNumber(grn.path("doc_number").asText());
        }
        if (extracted.containsKey("INVOICE")) {
            JsonNode inv = extracted.get("INVOICE");
            if (!inv.path("amount").isMissingNode() && !inv.path("amount").isNull())
                tx.setInvoiceAmount(java.math.BigDecimal.valueOf(inv.path("amount").asDouble()));
            if (!inv.path("doc_number").isMissingNode() && !inv.path("doc_number").isNull())
                tx.setInvoiceNumber(inv.path("doc_number").asText());
        }
    }

    private JsonNode extractDocumentData(Document doc, String docTypeHint) {
        try {
            byte[] fileBytes = Files.readAllBytes(Paths.get(doc.getFilePath()));
            String mimeType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
            String fileName = doc.getFileName() != null ? doc.getFileName() : "document";

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
            fileHeaders.setContentDispositionFormData("file", fileName);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override public String getFilename() { return fileName; }
            };
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);

            HttpHeaders typeHeaders = new HttpHeaders();
            typeHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> typePart = new HttpEntity<>(docTypeHint, typeHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);
            body.add("doc_type", typePart);

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, requestHeaders);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + "/extract-document", requestEntity, String.class);

            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage());
            return err;
        }
    }

    // ── Three-Way Match (manual amounts) ─────────────────────────────────────

    @Transactional
    public AiAnalysisResult runThreeWayMatch(UUID transactionId,
                                              Double poAmount,
                                              Double workProgressAmount,
                                              Double invoiceAmount,
                                              String poVendor,
                                              String invoiceVendor) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", transactionId.toString());
        payload.put("po_amount", poAmount);
        payload.put("work_progress_amount", workProgressAmount);
        payload.put("invoice_amount", invoiceAmount);
        payload.put("po_vendor", poVendor != null ? poVendor : "");
        payload.put("invoice_vendor", invoiceVendor != null ? invoiceVendor : "");

        JsonNode response = callAiService("/three-way-match", payload);
        return saveResult(transactionId, orgId, "THREE_WAY_MATCH", response);
    }

    // ── Budget Variance ──────────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult runBudgetVariance(UUID projectId,
                                               List<Map<String, Object>> categories,
                                               Double alertThresholdPct) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("project_id", projectId.toString());
        payload.put("alert_threshold_pct", alertThresholdPct != null ? alertThresholdPct : 10.0);
        payload.set("categories", objectMapper.valueToTree(categories));

        JsonNode response = callAiService("/budget-variance", payload);
        return saveResult(null, orgId, "BUDGET_VARIANCE", response);
    }

    // ── Duplicate Detection ──────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult runDuplicateDetection(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        List<Transaction> transactions = transactionRepository
                .findByOrganizationIdAndProjectId(orgId, projectId);

        ArrayNode txArray = objectMapper.createArrayNode();
        for (Transaction t : transactions) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("id", t.getId().toString());
            node.put("reference_no", t.getReferenceNo() != null ? t.getReferenceNo() : "");
            node.put("amount", t.getAmount() != null ? t.getAmount().doubleValue() : 0);
            node.put("vendor", t.getVendorCustomer() != null ? t.getVendorCustomer() : "");
            node.put("date", t.getTransactionDate() != null ? t.getTransactionDate().toString() : "");
            node.put("description", t.getDescription() != null ? t.getDescription() : "");
            txArray.add(node);
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("transactions", txArray);

        JsonNode response = callAiService("/duplicate-detection", payload);
        return saveResult(null, orgId, "DUPLICATE_DETECTION", response);
    }

    // ── Evidence Validation (from metadata) ─────────────────────────────────

    @Transactional
    public AiAnalysisResult runEvidenceValidation(UUID transactionId,
                                                   Map<String, Object> evidenceMetadata) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        ObjectNode txNode = objectMapper.createObjectNode();
        txNode.put("amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
        txNode.put("vendor", tx.getVendorCustomer() != null ? tx.getVendorCustomer() : "");
        txNode.put("date", tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : "");
        txNode.put("reference_no", tx.getReferenceNo() != null ? tx.getReferenceNo() : "");
        txNode.put("description", tx.getDescription() != null ? tx.getDescription() : "");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", transactionId.toString());
        payload.set("transaction", txNode);
        payload.set("evidence", objectMapper.valueToTree(evidenceMetadata));

        JsonNode response = callAiService("/validate-evidence", payload);
        return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", response);
    }

    // ── Evidence Validation (by documentId — reads file from disk) ───────────

    @Transactional
    public AiAnalysisResult validateEvidenceFile(UUID transactionId, UUID documentId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        try {
            byte[] fileBytes = Files.readAllBytes(Paths.get(doc.getFilePath()));
            String mimeType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
            String originalName = doc.getFileName() != null ? doc.getFileName() : "evidence";

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
            fileHeaders.setContentDispositionFormData("file", originalName);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override public String getFilename() { return originalName; }
            };
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);

            ObjectNode txNode = objectMapper.createObjectNode();
            txNode.put("amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
            txNode.put("vendor", tx.getVendorCustomer() != null ? tx.getVendorCustomer() : "");
            txNode.put("date", tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : "");
            txNode.put("reference_no", tx.getReferenceNo() != null ? tx.getReferenceNo() : "");
            HttpHeaders txHeaders = new HttpHeaders();
            txHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> txPart = new HttpEntity<>(txNode.toString(), txHeaders);

            HttpHeaders nameHeaders = new HttpHeaders();
            nameHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> namePart = new HttpEntity<>(originalName, nameHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);
            body.add("transaction", txPart);
            body.add("original_filename", namePart);

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, requestHeaders);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + "/validate-evidence", requestEntity, String.class);

            JsonNode result = objectMapper.readTree(response.getBody());
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", result);

        } catch (Exception e) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("error", "Validation failed: " + e.getMessage());
            error.put("result", "SERVICE_UNAVAILABLE");
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            error.put("amount_match", false);
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", error);
        }
    }

    // ── Human Review Decision ────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult submitHumanReview(UUID resultId, String decision, String notes) {
        AiAnalysisResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new RuntimeException("Analysis result not found"));

        result.setReviewedBy(securityUtils.getCurrentUser().getId());
        result.setReviewedAt(LocalDateTime.now());
        result.setReviewerDecision(decision);
        result.setReviewerNotes(notes);
        result.setNeedsHumanReview(false);

        if ("APPROVED".equals(decision)) {
            result.setStatus("VALIDATED");
        } else if ("REJECTED".equals(decision)) {
            result.setStatus("REJECTED");
        }

        return resultRepository.save(result);
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    public List<AiAnalysisResult> getPendingReviews() {
        return resultRepository.findByOrganizationIdAndNeedsHumanReview(
                securityUtils.getCurrentOrganizationId(), true);
    }

    public List<AiAnalysisResult> getAllResults() {
        return resultRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<AiAnalysisResult> getResultsByTransaction(UUID transactionId) {
        return resultRepository.findByTransactionId(transactionId);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private JsonNode callAiService(String endpoint, ObjectNode payload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + endpoint, entity, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("error", "AI service unavailable: " + e.getMessage());
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            error.put("status", "SERVICE_UNAVAILABLE");
            return error;
        }
    }

    private AiAnalysisResult saveResult(UUID transactionId, UUID orgId,
                                         String analysisType, JsonNode response) {
        AiAnalysisResult result;

        if (transactionId != null) {
            result = resultRepository.findByTransactionIdAndAnalysisType(transactionId, analysisType)
                    .orElse(new AiAnalysisResult());
        } else {
            List<AiAnalysisResult> existing = resultRepository.findByOrganizationIdAndAnalysisType(orgId, analysisType);
            if (!existing.isEmpty()) {
                resultRepository.deleteAll(existing);
                resultRepository.flush();
            }
            result = new AiAnalysisResult();
        }

        result.setTransactionId(transactionId);
        result.setOrganizationId(orgId);
        result.setAnalysisType(analysisType);

        if (response.has("extracted_amount") && !response.path("extracted_amount").isNull()) {
            result.setExtractedAmount(response.path("extracted_amount").asDouble());
        }

        double confidence = response.path("confidence").asDouble(0.0);
        boolean needsReview = response.path("needs_human_review").asBoolean(true);
        String status = response.path("result").asText(
                response.path("validation_status").asText(
                response.path("overall_status").asText("UNKNOWN")));

        result.setConfidenceScore(confidence);
        result.setNeedsHumanReview(needsReview);
        result.setStatus(status);

        if ("VALIDATED".equals(status)) {
            result.setNeedsHumanReview(false);
            result.setReviewerDecision(null);
            result.setReviewerNotes(null);
            result.setReviewedAt(null);
            result.setReviewedBy(null);
        } else if ("MISMATCH".equals(status) || "NEEDS_REVIEW".equals(status)) {
            result.setNeedsHumanReview(true);
            result.setReviewerDecision(null);
            result.setReviewerNotes(null);
            result.setReviewedAt(null);
            result.setReviewedBy(null);
        }

        List<String> issueList = new ArrayList<>();
        JsonNode issues = response.path("issues");
        if (issues.isArray()) {
            issues.forEach(i -> {
                if (i.isTextual()) issueList.add(i.asText());
                else if (i.has("field")) issueList.add(i.path("field").asText() + ": " + i.path("detail").asText());
            });
        }
        result.setIssues(String.join("; ", issueList));

        try {
            result.setResultJson(objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            result.setResultJson("{}");
        }

        return resultRepository.save(result);
    }
}
