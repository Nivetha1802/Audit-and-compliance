import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi, evidenceApi, taskApi, userApi, findingApi, vendorsApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  APPROVED:         { bg: '#d1fae5', text: '#065f46' },
  PENDING_EVIDENCE: { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW:     { bg: '#dbeafe', text: '#1e40af' },
  RAISED_FINDING:   { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:         { bg: '#fce7f3', text: '#9d174d' },
};

function getCategoryColor(name) {
  if (!name) return { bg: '#f3f4f6', text: '#6b7280' };
  if (name.toLowerCase().includes('revenue')) return { bg: '#d1fae5', text: '#065f46' };
  if (name.toLowerCase().includes('expense')) return { bg: '#fee2e2', text: '#991b1b' };
  if (name.toLowerCase().includes('wip'))     return { bg: '#fef3c7', text: '#92400e' };
  return { bg: '#ede9fe', text: '#5b21b6' };
}

const ADMIN_ROLES = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'];
const CAN_ASSIGN  = ['ADMIN'];
const CAN_CHANGE_STATUS = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'];

// ── Evidence Panel ──────────────────────────────────────────────────────────
function EvidencePanel({ transaction, users, currentUser, onClose, onStatusChange, onVendorLinked }) {
  const [items, setItems] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [validating, setValidating] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    assignedTo: '', dueDate: '', taskType: 'RESUBMIT_EVIDENCE'
  });

  // Finding state
  const [findings, setFindings] = useState([]);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [findingForm, setFindingForm] = useState({ title: '', description: '', severity: 'MEDIUM' });

  const isAuditor = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'].includes(currentUser?.role);

  const isAdmin = CAN_ASSIGN.includes(currentUser?.role);
  const canChangeStatus = CAN_CHANGE_STATUS.includes(currentUser?.role);

  // A non-admin can upload only if they are assigned to a task for this transaction
  const myAssignedTask = tasks.find(t => t.assignedTo === currentUser?.id && t.status !== 'COMPLETED');
  const canUpload = isAdmin || !!myAssignedTask;

  useEffect(() => { loadData(); }, [transaction.id]);

  const loadData = async () => {
    try {
      const [itemsRes, readinessRes, tasksRes, findingsRes, vendorsRes] = await Promise.all([
        evidenceApi.getItems(transaction.id),
        evidenceApi.getReadiness(transaction.id),
        taskApi.getByTransaction(transaction.id),
        findingApi.getAll(),
        vendorsApi.getAll(),
      ]);
      setItems(itemsRes.data);
      setReadiness(readinessRes.data);
      setTasks(tasksRes.data);
      setFindings(findingsRes.data.filter(f => f.transactionId === transaction.id));
      setVendors(vendorsRes.data);
    } catch (err) { console.error(err); }
  };

  const handleUpload = async (itemId, file) => {
    setUploading(itemId);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const uploadRes = await evidenceApi.uploadEvidence(itemId, fd);
      await loadData();
      // Auto-validate amount after upload if the item has a document
      const docId = uploadRes.data?.documentId;
      if (docId) {
        setValidating(itemId);
        try {
          const res = await aiApi.validateEvidenceFile(transaction.id, docId);
          setValidationResults(prev => ({ ...prev, [itemId]: res.data }));
        } catch (err) {
          setValidationResults(prev => ({
            ...prev,
            [itemId]: { status: 'ERROR', issues: ['Auto-validation failed: ' + (err.message || 'Unknown error')] }
          }));
        } finally {
          setValidating(null);
        }
      }
    }
    catch (err) { alert('Upload failed'); }
    finally { setUploading(null); }
  };

  const handleRemove = async (itemId) => {
    if (!isAdmin) return;
    if (!window.confirm('Remove this evidence?')) return;
    try { await evidenceApi.removeEvidence(itemId); loadData(); }
    catch (err) { alert('Failed to remove evidence'); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create({
        ...taskForm,
        transactionId: transaction.id,
        assignedTo: taskForm.assignedTo || null,
        dueDate: taskForm.dueDate || null,
      });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignedTo: '', dueDate: '', taskType: 'RESUBMIT_EVIDENCE' });
      loadData();
    } catch (err) { alert('Failed to create task'); }
  };

  const handleRaiseFinding = async (e) => {
    e.preventDefault();
    try {
      await findingApi.create({
        ...findingForm,
        transactionId: transaction.id,
        status: 'OPEN',
      });
      setShowFindingForm(false);
      setFindingForm({ title: '', description: '', severity: 'MEDIUM' });
      loadData();
      // Also update transaction status to RAISED_FINDING
      onStatusChange(transaction.id, 'RAISED_FINDING');
    } catch (err) { alert('Failed to raise finding'); }
  };

  const handleLinkVendor = async (vendorId) => {
    try {
      const res = await transactionApi.linkVendor(transaction.id, vendorId);
      onVendorLinked(res.data);
    } catch (err) { alert('Failed to link vendor'); }
  };


  const pct = readiness?.percentage ?? 0;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const inp = { width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box', fontSize: '0.8rem' };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{transaction.transactionNumber}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{transaction.description}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>₹{transaction.amount?.toLocaleString()} · {transaction.transactionDate}</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>


        {/* Vendor Linking Section */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', backgroundColor: '#f3f4f6' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>🔗 Linked Vendor</div>
          {transaction.vendorId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827' }}>
                  {vendors.find(v => v.id === transaction.vendorId)?.name || 'Linked'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {vendors.find(v => v.id === transaction.vendorId)?.customVendorId}
                </div>
              </div>
              <select
                value={transaction.vendorId}
                onChange={(e) => handleLinkVendor(e.target.value)}
                style={{ ...inp, width: 'auto', fontSize: '0.72rem', color: '#6b7280', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.customVendorId})</option>
                ))}
                <option value="">— Unlink vendor</option>
              </select>
            </div>
          ) : (
            <>
              <select
                value=""
                onChange={(e) => e.target.value && handleLinkVendor(e.target.value)}
                style={inp}
              >
                <option value="">Select a vendor to link...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.customVendorId})</option>
                ))}
              </select>
              {transaction.vendorCustomer && (
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.3rem' }}>
                  Imported value: "{transaction.vendorCustomer}"
                </div>
              )}
            </>
          )}
        </div>

        {/* Audit Intelligence */}
        {(transaction.bankValidationRequired || transaction.isHighRisk) && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '0.375rem', borderLeft: `4px solid ${transaction.isHighRisk ? '#e53e3e' : '#3182ce'}`, backgroundColor: transaction.isHighRisk ? '#fff5f5' : '#f0f7ff' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.3rem', color: transaction.isHighRisk ? '#c53030' : '#2b6cb0' }}>
              {transaction.isHighRisk ? '🚩 High Risk Alert' : 'ℹ️ Audit Intelligence'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#374151' }}>
              {transaction.bankValidationRequired
                ? <><strong>Bank Validation Required:</strong> {transaction.validationReason}</>
                : 'Standard risk level. No immediate bank validation triggered.'}
            </div>
          </div>
        )}

        {/* Access notice for non-admins */}
        {!canUpload && (
          <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.375rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
            You are not assigned to upload evidence for this transaction. Contact your admin.
          </div>
        )}

        {/* Readiness bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
              Evidence Readiness — {pct}%
            </div>
            <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              {readiness?.provided ?? 0} / {readiness?.total ?? 0} mandatory items provided
            </div>
          </div>
          {canChangeStatus && (
            <select value={transaction.status} onChange={(e) => onStatusChange(transaction.id, e.target.value)}
              style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          )}
        </div>

        {/* Checklist items */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem', color: '#111827' }}>Checklist Items</div>
          {items.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
              No checklist items. Assign a checklist template to this transaction's category.
            </div>
          ) : items.map(item => (
            <div key={item.id} style={{ padding: '0.75rem', border: `1px solid ${item.provided ? '#bbf7d0' : item.mandatory ? '#fecaca' : '#e5e7eb'}`, borderRadius: '0.375rem', marginBottom: '0.5rem', backgroundColor: item.provided ? '#f0fdf4' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{item.description}</span>
                  {item.mandatory && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: '#dc2626', fontWeight: '600' }}>REQUIRED</span>}
                </div>
                {item.provided
                  ? <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>✓ Provided</span>
                  : <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Pending</span>}
              </div>
              {item.provided && isAdmin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={() => handleRemove(item.id)}
                    style={{ fontSize: '0.72rem', color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    Remove evidence
                  </button>
                  {validating === item.id && (
                    <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontStyle: 'italic' }}>🔍 Validating amount...</span>
                  )}
                </div>
              ) : !item.provided && canUpload ? (
                <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                  <input type="file" style={{ display: 'none' }} disabled={uploading === item.id}
                    onChange={(e) => e.target.files[0] && handleUpload(item.id, e.target.files[0])} />
                  <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', backgroundColor: uploading === item.id ? '#e5e7eb' : '#2563eb', color: uploading === item.id ? '#6b7280' : 'white', borderRadius: '0.25rem' }}>
                    {uploading === item.id ? 'Uploading...' : '📎 Upload'}
                  </span>
                </label>
              ) : null}
              {/* AI Validation Result */}
              {validationResults[item.id] && (() => {
                const vr = validationResults[item.id];
                const parsed = (() => { try { return JSON.parse(vr.resultJson || '{}'); } catch { return {}; } })();
                const isMatch = parsed.amount_match ?? vr.amount_match;
                const extractedAmt = parsed.extracted_amount ?? vr.extracted_amount;
                const method = parsed.extraction_method ?? vr.extraction_method;
                const status = vr.status;
                const bgColor = status === 'VALIDATED' ? '#f0fdf4' : status === 'MISMATCH' ? '#fff7ed' : '#fef2f2';
                const borderColor = status === 'VALIDATED' ? '#86efac' : status === 'MISMATCH' ? '#fdba74' : '#fca5a5';
                const icon = status === 'VALIDATED' ? '✅' : status === 'MISMATCH' ? '⚠️' : '❌';
                return (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>
                      {icon} AI Validation: {status}
                    </div>
                    {extractedAmt != null && (
                      <div style={{ color: '#374151' }}>
                        Extracted: <strong>₹{Number(extractedAmt).toLocaleString()}</strong>
                        {' '}vs transaction: <strong>₹{transaction.amount?.toLocaleString()}</strong>
                        {' '}— {isMatch
                          ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Match ✓</span>
                          : <span style={{ color: '#dc2626', fontWeight: 600 }}>Mismatch ✗</span>}
                      </div>
                    )}
                    {method && <div style={{ color: '#6b7280', marginTop: '0.15rem' }}>Method: {method}</div>}
                    {vr.issues && <div style={{ color: '#92400e', marginTop: '0.15rem' }}>{vr.issues}</div>}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Tasks — visible to all, create only for admins */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>Tasks ({tasks.length})</div>
            {isAdmin && (
              <button onClick={() => setShowTaskForm(!showTaskForm)}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                {showTaskForm ? 'Cancel' : '+ Assign Task'}
              </button>
            )}
          </div>

          {isAdmin && showTaskForm && (
            <form onSubmit={handleCreateTask} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title *" style={inp} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <select value={taskForm.taskType} onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })} style={inp}>
                  {['SUBMIT_EVIDENCE','RESUBMIT_EVIDENCE','CLARIFICATION','AUDIT_REVIEW','COMPLIANCE_CHECK'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} style={inp}>
                  {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })} style={inp} required>
                  <option value="">Assign to... *</option>
                  {users.filter(u => u.role !== 'AUDITOR').map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
                <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} style={inp} />
              </div>
              <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Instructions for the assignee" rows={2} style={{ ...inp, resize: 'vertical' }} />
              <button type="submit" style={{ padding: '0.4rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                Assign Task
              </button>
            </form>
          )}

          {tasks.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No tasks assigned yet.</div>
          ) : tasks.map(t => {
            const pc = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' }[t.priority] || '#6b7280';
            const assignee = users.find(u => u.id === t.assignedTo);
            const isMyTask = t.assignedTo === currentUser?.id;
            return (
              <div key={t.id} style={{ padding: '0.6rem 0.75rem', border: `1px solid ${isMyTask ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: '0.375rem', marginBottom: '0.4rem', borderLeft: `3px solid ${pc}`, backgroundColor: isMyTask ? '#eff6ff' : 'white' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t.title}</div>
                {t.description && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.15rem' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ color: pc, fontWeight: '600' }}>{t.priority}</span>
                  <span style={{ color: '#374151' }}>{t.status?.replace(/_/g,' ')}</span>
                  {assignee && <span>→ {assignee.fullName} {isMyTask ? '(you)' : ''}</span>}
                  {t.dueDate && <span>📅 {t.dueDate}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Findings (Auditor/Admin only) ── */}
        {isAuditor && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#dc2626' }}>
                ⚠ Findings ({findings.length})
              </div>
              <button onClick={() => setShowFindingForm(!showFindingForm)}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: showFindingForm ? '#6b7280' : '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                {showFindingForm ? 'Cancel' : '+ Raise Finding'}
              </button>
            </div>

            {showFindingForm && (
              <form onSubmit={handleRaiseFinding} style={{ padding: '0.75rem', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input value={findingForm.title} onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
                  placeholder="Finding title *" style={inp} required />
                <select value={findingForm.severity} onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })} style={inp}>
                  {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
                  placeholder="Describe the issue — what was found, what was expected, potential impact *"
                  rows={3} style={{ ...inp, resize: 'vertical' }} required />
                <button type="submit" style={{ padding: '0.4rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                  Raise Finding
                </button>
              </form>
            )}

            {findings.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No findings raised for this transaction.</div>
            ) : findings.map(f => {
              const sevColors = { CRITICAL: '#7f1d1d', HIGH: '#991b1b', MEDIUM: '#92400e', LOW: '#065f46' };
              const sevBg    = { CRITICAL: '#fee2e2', HIGH: '#fecaca', MEDIUM: '#fef3c7', LOW: '#d1fae5' };
              return (
                <div key={f.id} style={{ padding: '0.6rem 0.75rem', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '0.4rem', borderLeft: '3px solid #dc2626', backgroundColor: '#fff5f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>{f.title}</div>
                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: sevBg[f.severity] || '#f3f4f6', color: sevColors[f.severity] || '#374151', fontWeight: '700', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {f.severity}
                    </span>
                  </div>
                  {f.description && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem' }}>{f.description}</div>}
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>{f.status}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Transactions Page ───────────────────────────────────────────────────
export default function Transactions() {
  const { user: currentUser } = useAuth();
  const [allTransactions, setAllTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [ledgerFile, setLedgerFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingBank, setImportingBank] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);

  const isAdmin = CAN_ASSIGN.includes(currentUser?.role);
  const canImport = ADMIN_ROLES.includes(currentUser?.role);

  useEffect(() => { fetchData(); }, []);

  // Re-filter when project changes
  useEffect(() => { setSelectedTx(null); }, [selectedProject]);

  const fetchData = async () => {
    try {
      const [txRes, projRes, usersRes] = await Promise.all([
        transactionApi.getAll(),
        projectApi.getAll(),
        userApi.getAll(),
      ]);
      setAllTransactions(txRes.data);
      setProjects(projRes.data);
      setUsers(usersRes.data);
      if (projRes.data.length > 0 && !selectedProject) {
        setSelectedProject(projRes.data[0].id);
      }
    } catch (err) { console.error(err); }
  };

  // Transactions for the selected project only
  const projectTransactions = selectedProject
    ? allTransactions.filter(t => t.projectId === selectedProject)
    : allTransactions;

  const displayed = filter === 'ALL' ? projectTransactions
    : filter === 'MATCHED'   ? projectTransactions.filter(t => t.bankMatched)
    : filter === 'UNMATCHED' ? projectTransactions.filter(t => !t.bankMatched && t.bankRefNo)
    : projectTransactions.filter(t => t.status === filter);

  const handleLedgerImport = async (e) => {
    e.preventDefault(); if (!ledgerFile || !selectedProject) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData(); fd.append('file', ledgerFile); fd.append('projectId', selectedProject);
    try { const res = await transactionApi.importCsv(fd); setImportResult({ type: 'ledger', ...res.data }); fetchData(); }
    catch (err) { setImportResult({ type: 'error', message: err.response?.data?.message || 'Import failed' }); }
    finally { setImporting(false); }
  };

  const handleBankImport = async (e) => {
    e.preventDefault(); if (!bankFile || !selectedProject) return;
    setImportingBank(true); setImportResult(null);
    const fd = new FormData(); fd.append('file', bankFile); fd.append('projectId', selectedProject);
    try { const res = await transactionApi.importBank(fd); setImportResult({ type: 'bank', ...res.data }); fetchData(); }
    catch (err) { setImportResult({ type: 'error', message: err.response?.data?.message || 'Bank import failed' }); }
    finally { setImportingBank(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await transactionApi.updateStatus(id, status); fetchData(); }
    catch (err) { alert('Failed to update status'); }
  };

  const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || '';
  const thStyle = { textAlign: 'left', padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '0.625rem 0.75rem', fontSize: '0.8rem', verticalAlign: 'middle' };

  return (
    <div style={{ paddingRight: selectedTx ? '500px' : 0, transition: 'padding-right 0.3s' }}>

      {/* Header with project selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Transactions</h1>
          {selectedProjectName && <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.2rem' }}>Project: {selectedProjectName}</div>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>Project:</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer', minWidth: '200px' }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Import panels — only for admin/auditor roles */}
      {canImport && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>📄 Ledger CSV Import</div>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 0.5rem 0' }}>
              Columns: TxnNo, Date, Description, Debit/Credit, Amount, LedgerName, ProjectCode, Category, Subcategory, Vendor, RefNo
            </p>
            <form onSubmit={handleLedgerImport} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input type="file" accept=".csv" onChange={(e) => setLedgerFile(e.target.files[0])} style={{ fontSize: '0.8rem' }} />
              <button type="submit" disabled={importing}
                style={{ padding: '0.4rem', backgroundColor: importing ? '#6ee7b7' : '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                {importing ? 'Importing...' : 'Import & Auto-Tag Categories'}
              </button>
            </form>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>🏦 Bank Statement Import</div>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 0.5rem 0' }}>
              Columns: Date, Description, Debit, Credit, Balance, RefNo — auto-matched by date + amount.
            </p>
            <form onSubmit={handleBankImport} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input type="file" accept=".csv" onChange={(e) => setBankFile(e.target.files[0])} style={{ fontSize: '0.8rem' }} />
              <button type="submit" disabled={importingBank}
                style={{ padding: '0.4rem', backgroundColor: importingBank ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: importingBank ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                {importingBank ? 'Matching...' : 'Import & Match Bank Transactions'}
              </button>
            </form>
          </div>
        </div>
      )}

      {importResult && (
        <div style={{ padding: '0.625rem 1rem', marginBottom: '1rem', borderRadius: '0.375rem', fontSize: '0.8rem',
          backgroundColor: importResult.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: importResult.type === 'error' ? '#991b1b' : '#166534' }}>
          {importResult.type === 'error' && importResult.message}
          {importResult.type === 'ledger' && `✓ ${importResult.imported} imported, ${importResult.skipped} skipped. Categories auto-tagged.`}
          {importResult.type === 'bank' && `✓ ${importResult.matched} matched, ${importResult.created} new, ${importResult.skipped} skipped.`}
        </div>
      )}

      {/* Project summary bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(
          projectTransactions.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
        ).map(([status, count]) => {
          const sc = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
          return (
            <span key={status} style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '500', backgroundColor: sc.bg, color: sc.text }}>
              {status.replace(/_/g,' ')}: {count}
            </span>
          );
        })}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {['ALL','PENDING_EVIDENCE','UNDER_REVIEW','APPROVED','RAISED_FINDING','MATCHED','UNMATCHED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '0.25rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '500',
              backgroundColor: filter === f ? '#2563eb' : 'white', color: filter === f ? 'white' : '#374151' }}>
            {f.replace(/_/g,' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280', alignSelf: 'center' }}>
          {displayed.length} of {projectTransactions.length} transactions
        </span>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>D/C</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Bank</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  {projects.length === 0 ? 'Create a project first.' : 'No transactions for this project. Import a CSV to get started.'}
                </td>
              </tr>
            ) : displayed.map(t => {
              const sc = STATUS_COLORS[t.status] || { bg: '#f3f4f6', text: '#374151' };
              const cc = getCategoryColor(t.categoryName);
              const isSelected = selectedTx?.id === t.id;
              return (
                <tr key={t.id} onClick={() => setSelectedTx(isSelected ? null : t)}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : 'white' }}>
                  <td style={tdStyle}>{t.transactionDate}</td>
                  <td style={tdStyle}><code style={{ fontSize: '0.7rem' }}>{t.transactionNumber}</code></td>
                  <td style={{ ...tdStyle, maxWidth: '180px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>{t.description}</div>
                    {t.vendorCustomer && <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{t.vendorCustomer}</div>}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: t.debitCredit === 'Credit' ? '#059669' : '#dc2626', fontSize: '0.72rem' }}>{t.debitCredit || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: '500', color: t.debitCredit === 'Credit' ? '#059669' : '#dc2626' }}>₹{t.amount?.toLocaleString()}</td>
                  <td style={tdStyle}>
                    {t.categoryName && <span style={{ padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '500', backgroundColor: cc.bg, color: cc.text }}>{t.categoryName}</span>}
                    {t.subcategory && <div style={{ fontSize: '0.68rem', color: '#7c3aed', marginTop: '0.15rem' }}>{t.subcategory}</div>}
                  </td>
                  <td style={tdStyle}>
                    {t.bankMatched ? <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>✓</span>
                      : t.bankRefNo ? <span style={{ fontSize: '0.7rem', color: '#d97706' }}>⚠</span>
                      : <span style={{ fontSize: '0.7rem', color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.15rem 0.4rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '500', backgroundColor: sc.bg, color: sc.text }}>
                      {t.status?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>View →</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTx && (
        <EvidencePanel
          transaction={selectedTx}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedTx(null)}
          onStatusChange={async (id, status) => {
            await handleStatusChange(id, status);
            setSelectedTx(prev => ({ ...prev, status }));
          }}
          onVendorLinked={(updatedTx) => {
            setAllTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
            setSelectedTx(updatedTx);
          }}
        />
      )}
    </div>
  );
}
