import React, { useState, useEffect } from 'react';
import { aiApi, projectApi, transactionApi } from '../services/api';

const TYPE_LABELS = {
  THREE_WAY_MATCH:    { label: '3-Way Match',        icon: '🔗', color: '#2563eb' },
  BUDGET_VARIANCE:    { label: 'Budget Variance',     icon: '📊', color: '#d97706' },
  DUPLICATE_DETECTION:{ label: 'Duplicate Detection', icon: '🔍', color: '#7c3aed' },
  EVIDENCE_VALIDATION:{ label: 'Evidence Validation', icon: '📄', color: '#0891b2' },
};

const STATUS_COLORS = {
  VALIDATED:           { bg: '#d1fae5', text: '#065f46' },
  CLEARED:             { bg: '#d1fae5', text: '#065f46' },
  COMPLIANT:           { bg: '#d1fae5', text: '#065f46' },
  NEEDS_REVIEW:        { bg: '#fef3c7', text: '#92400e' },
  MISMATCH:            { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:            { bg: '#fee2e2', text: '#991b1b' },
  AUDIT_REQUIRED:      { bg: '#fee2e2', text: '#991b1b' },
  DUPLICATE_FOUND:     { bg: '#fce7f3', text: '#9d174d' },
  SERVICE_UNAVAILABLE: { bg: '#f3f4f6', text: '#6b7280' },
};

function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 95 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: '50px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: '700', color }}>{pct}%</span>
    </div>
  );
}

export default function AiValidation() {
  const [tab, setTab] = useState('station');
  const [pending, setPending] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [running, setRunning] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: 'APPROVED', notes: '' });

  useEffect(() => {
    fetchData();
    projectApi.getAll().then(r => {
      setProjects(r.data);
      if (r.data.length > 0) setSelectedProject(r.data[0].id);
    }).catch(console.error);
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        aiApi.getPendingReviews(),
        aiApi.getAllResults(),
      ]);
      setPending(pendingRes.data);
      setAllResults(allRes.data);
    } catch (err) { console.error(err); }
  };

  const runAnalysis = async (type) => {
    if (!selectedProject) return;
    setRunning(type); setRunResult(null);
    try {
      let res;
      if (type === 'DUPLICATE_DETECTION') {
        res = await aiApi.duplicateDetection(selectedProject);
      } else if (type === 'BUDGET_VARIANCE') {
        // Fetch transactions for the project and aggregate actual spend per category
        const txRes = await transactionApi.getAll();
        const projectTxs = txRes.data.filter(t => t.projectId === selectedProject);
        const project = projects.find(p => p.id === selectedProject);
        const budgetPerCategory = {};
        if (project?.totalBudget && project?.categories) {
          const cats = project.categories.split(',').filter(Boolean);
          const perCat = cats.length > 0 ? project.totalBudget / cats.length : 0;
          cats.forEach(c => { budgetPerCategory[c.trim()] = perCat; });
        }
        const actualByCategory = {};
        projectTxs.forEach(t => {
          const cat = t.categoryName || 'Uncategorized';
          actualByCategory[cat] = (actualByCategory[cat] || 0) + (t.amount || 0);
        });
        const categories = Object.keys({ ...budgetPerCategory, ...actualByCategory }).map(name => ({
          name,
          budgeted: budgetPerCategory[name] || 0,
          actual: actualByCategory[name] || 0,
        }));
        res = await aiApi.budgetVariance(selectedProject, { categories, alertThresholdPct: 10 });
      }
      setRunResult({ type, data: res.data });
      fetchData();
    } catch (err) {
      setRunResult({ type, error: err.response?.data?.message || 'Analysis failed. Is the AI service running?' });
    } finally { setRunning(null); }
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    try {
      await aiApi.submitReview(reviewModal.id, reviewForm);
      setReviewModal(null);
      setReviewForm({ decision: 'APPROVED', notes: '' });
      fetchData();
    } catch (err) { alert('Failed to submit review'); }
  };

  const inp = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box', fontSize: '0.875rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>AI Audit Analysis</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Automated three-way matching, budget variance, duplicate detection, and evidence validation.
          </p>
        </div>
        {pending.length > 0 && (
          <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
            ⚠ {pending.length} item{pending.length !== 1 ? 's' : ''} need human review
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { key: 'station', label: `🔍 Validation Station${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'run',     label: '▶ Run Analysis' },
          { key: 'history', label: '📋 History' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '0.625rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: tab === t.key ? '600' : '400',
              color: tab === t.key ? '#2563eb' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Validation Station ── */}
      {tab === 'station' && (
        <div>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>All clear</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No items are waiting for human review.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map(item => {
                const typeInfo = TYPE_LABELS[item.analysisType] || { label: item.analysisType, icon: '🤖', color: '#6b7280' };
                const sc = STATUS_COLORS[item.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.25rem', borderLeft: `4px solid ${typeInfo.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{typeInfo.icon}</span>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{typeInfo.label}</span>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: sc.bg, color: sc.text }}>{item.status}</span>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' }}>⚠ Needs Review</span>
                        </div>
                        <ConfidenceBadge score={item.confidenceScore} />
                        {item.issues && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#dc2626' }}>
                            {item.issues.split(';').filter(Boolean).map((issue, i) => (
                              <div key={i}>• {issue.trim()}</div>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                          {item.transactionId && `Transaction: ${item.transactionId}`}
                        </div>
                      </div>
                      <button onClick={() => { setReviewModal(item); setReviewForm({ decision: 'APPROVED', notes: '' }); }}
                        style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', flexShrink: 0, marginLeft: '1rem' }}>
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Run Analysis ── */}
      {tab === 'run' && (
        <div>
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: '500', fontSize: '0.875rem', marginRight: '0.75rem' }}>Project:</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { type: 'DUPLICATE_DETECTION', title: 'Duplicate Invoice Detection', desc: 'Scans all transactions in the project using fuzzy matching to find potential duplicate invoices with different reference numbers but identical amounts and vendors.', action: 'Scan for Duplicates' },
              { type: 'BUDGET_VARIANCE', title: 'Budget Variance Analysis', desc: 'Compares actual spend against allocated budget per category. Automatically triggers an audit of all line items in categories that exceed the 10% threshold.', action: 'Analyse Budget' },
            ].map(card => (
              <div key={card.type} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: `3px solid ${TYPE_LABELS[card.type]?.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{TYPE_LABELS[card.type]?.icon}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{card.title}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>{card.desc}</p>
                <button onClick={() => runAnalysis(card.type)} disabled={running === card.type || !selectedProject}
                  style={{ padding: '0.5rem 1rem', backgroundColor: running === card.type ? '#e5e7eb' : TYPE_LABELS[card.type]?.color, color: running === card.type ? '#6b7280' : 'white', border: 'none', borderRadius: '0.375rem', cursor: running === card.type ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                  {running === card.type ? 'Running...' : card.action}
                </button>
              </div>
            ))}
          </div>

          {/* Three-way match info card */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '1rem', borderTop: `3px solid ${TYPE_LABELS.THREE_WAY_MATCH?.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🔗</span>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Three-Way Match (PO → Work Progress → Invoice)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
              Automatically compares the Purchase Order amount, the Receiving Report / Work Progress amount, and the Invoice amount.
              If all three align within a <strong>1% tolerance</strong>, the transaction is cleared for payment review.
              Run this from the <strong>Transaction Evidence Panel</strong> by uploading PO, Work Progress Report, and Invoice documents.
            </p>
          </div>

          {runResult && (
            <div style={{ marginTop: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Analysis Result</div>
              {runResult.error ? (
                <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>⚠ {runResult.error}</div>
              ) : (
                <pre style={{ fontSize: '0.75rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem', overflow: 'auto', maxHeight: '300px' }}>
                  {JSON.stringify(runResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {allResults.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No analysis results yet. Run an analysis to get started.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  {['Type', 'Status', 'Confidence', 'Issues', 'Reviewed', 'Decision'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allResults.map(r => {
                  const typeInfo = TYPE_LABELS[r.analysisType] || { label: r.analysisType, icon: '🤖' };
                  const sc = STATUS_COLORS[r.status] || { bg: '#f3f4f6', text: '#374151' };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                        <span style={{ marginRight: '0.3rem' }}>{typeInfo.icon}</span>{typeInfo.label}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: sc.bg, color: sc.text }}>{r.status}</span>
                        {r.needsHumanReview && !r.reviewerDecision && <span style={{ marginLeft: '0.3rem', fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>⚠ Pending</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><ConfidenceBadge score={r.confidenceScore} /></td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#dc2626', maxWidth: '200px' }}>
                        {r.issues ? r.issues.split(';')[0] : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>
                        {r.reviewerDecision
                          ? <span style={{ color: r.reviewerDecision === 'APPROVED' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{r.reviewerDecision}</span>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '480px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Human Review Required</h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
              AI confidence: <strong>{Math.round((reviewModal.confidenceScore || 0) * 100)}%</strong> — below the 95% threshold for automatic approval.
              Please review the details and make a decision.
            </p>

            {reviewModal.issues && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#dc2626' }}>
                {reviewModal.issues.split(';').filter(Boolean).map((issue, i) => (
                  <div key={i}>• {issue.trim()}</div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.375rem' }}>Decision *</label>
              <select value={reviewForm.decision} onChange={e => setReviewForm({ ...reviewForm, decision: e.target.value })} style={inp}>
                <option value="APPROVED">✅ Approve — evidence is acceptable</option>
                <option value="REJECTED">❌ Reject — request resubmission</option>
                <option value="ESCALATED">⬆ Escalate — refer to senior auditor</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.375rem' }}>Notes</label>
              <textarea value={reviewForm.notes} onChange={e => setReviewForm({ ...reviewForm, notes: e.target.value })}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Add your review notes..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={submitReview}
                style={{ flex: 1, padding: '0.625rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
                Submit Review
              </button>
              <button onClick={() => setReviewModal(null)}
                style={{ padding: '0.625rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
