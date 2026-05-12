import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi, evidenceApi, taskApi, userApi, findingApi, vendorsApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, RefreshCw, Upload, FileCheck, HelpCircle } from 'lucide-react';

const STATUS_COLORS = {
  APPROVED:         { bg: '#d1fae5', text: '#065f46' },
  PENDING_EVIDENCE: { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW:     { bg: '#dbeafe', text: '#1e40af' },
  RAISED_FINDING:   { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:         { bg: '#fce7f3', text: '#9d174d' },
};

const REQUIREMENT_COLORS = {
  REQUIRED: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  OPTIONAL: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
};

const CAN_ASSIGN        = ['ADMIN'];
const CAN_CHANGE_STATUS = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'];
const ADMIN_ROLES       = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'];

// ── Evidence Panel (inline slide-in panel) ───────────────────────────────────
function EvidencePanel({ transaction, users, currentUser, onClose, onStatusChange, onVendorLinked }) {
  const [items, setItems]                   = useState([]);
  const [readiness, setReadiness]           = useState(null);
  const [uploading, setUploading]           = useState(null);
  const [validating, setValidating]         = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [tasks, setTasks]                   = useState([]);
  const [vendors, setVendors]               = useState([]);
  const [showTaskForm, setShowTaskForm]     = useState(false);
  const [taskForm, setTaskForm]             = useState({ title: '', description: '', priority: 'MEDIUM', assignedTo: '', dueDate: '', taskType: 'RESUBMIT_EVIDENCE' });
  const [findings, setFindings]             = useState([]);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [findingForm, setFindingForm]       = useState({ title: '', description: '', severity: 'MEDIUM' });

  const isAdmin       = CAN_ASSIGN.includes(currentUser?.role);
  const isAuditor     = ADMIN_ROLES.includes(currentUser?.role);
  const canChangeStatus = CAN_CHANGE_STATUS.includes(currentUser?.role);

  const myAssignedTask = tasks.find(t => t.assignedTo === currentUser?.id && t.status !== 'COMPLETED');
  const canUpload = isAdmin || !!myAssignedTask;

  const inp = { width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box', fontSize: '0.8rem' };

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
      const docId = uploadRes.data?.documentId;
      if (docId) {
        setValidating(itemId);
        try {
          const res = await aiApi.validateEvidenceFile(transaction.id, docId);
          setValidationResults(prev => ({ ...prev, [itemId]: res.data }));
        } catch {
          setValidationResults(prev => ({ ...prev, [itemId]: { status: 'ERROR', issues: ['Auto-validation failed'] } }));
        } finally { setValidating(null); }
      }
    } catch { alert('Upload failed'); }
    finally { setUploading(null); }
  };

  const handleRemove = async (itemId) => {
    if (!isAdmin || !window.confirm('Remove this evidence?')) return;
    try { await evidenceApi.removeEvidence(itemId); loadData(); }
    catch { alert('Failed to remove evidence'); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create({ ...taskForm, transactionId: transaction.id, assignedTo: taskForm.assignedTo || null, dueDate: taskForm.dueDate || null });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignedTo: '', dueDate: '', taskType: 'RESUBMIT_EVIDENCE' });
      loadData();
    } catch { alert('Failed to create task'); }
  };

  const handleRaiseFinding = async (e) => {
    e.preventDefault();
    try {
      await findingApi.create({ ...findingForm, transactionId: transaction.id, status: 'OPEN' });
      setShowFindingForm(false);
      setFindingForm({ title: '', description: '', severity: 'MEDIUM' });
      loadData();
      onStatusChange(transaction.id, 'RAISED_FINDING');
    } catch { alert('Failed to raise finding'); }
  };

  const handleLinkVendor = async (vendorId) => {
    try {
      const res = await transactionApi.linkVendor(transaction.id, vendorId);
      onVendorLinked(res.data);
    } catch { alert('Failed to link vendor'); }
  };

  const pct   = readiness?.percentage ?? 0;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: 'white' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{transaction.transactionNumber}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{transaction.description}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '0.2rem' }}>₹{Number(transaction.amount || 0).toLocaleString()} · {transaction.transactionDate}</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
        {/* Vendor */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', backgroundColor: '#f3f4f6' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>🔗 Linked Vendor</div>
          {transaction.vendorId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{vendors.find(v => v.id === transaction.vendorId)?.name || 'Linked'}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{vendors.find(v => v.id === transaction.vendorId)?.customVendorId}</div>
              </div>
              <select value={transaction.vendorId} onChange={e => handleLinkVendor(e.target.value)}
                style={{ ...inp, width: 'auto', fontSize: '0.72rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.customVendorId})</option>)}
                <option value="">— Unlink</option>
              </select>
            </div>
          ) : (
            <>
              <select value="" onChange={e => e.target.value && handleLinkVendor(e.target.value)} style={inp}>
                <option value="">Select a vendor to link…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.customVendorId})</option>)}
              </select>
              {transaction.vendorCustomer && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.3rem' }}>Imported: "{transaction.vendorCustomer}"</div>}
            </>
          )}
        </div>

        {/* Audit alert */}
        {(transaction.bankValidationRequired || transaction.isHighRisk) && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '0.375rem', borderLeft: `4px solid ${transaction.isHighRisk ? '#e53e3e' : '#3182ce'}`, backgroundColor: transaction.isHighRisk ? '#fff5f5' : '#f0f7ff' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', color: transaction.isHighRisk ? '#c53030' : '#2b6cb0' }}>
              {transaction.isHighRisk ? '🚩 High Risk Alert' : 'ℹ️ Audit Intelligence'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: '0.25rem' }}>
              {transaction.bankValidationRequired ? <><strong>Bank Validation Required:</strong> {transaction.validationReason}</> : 'Standard risk level.'}
            </div>
          </div>
        )}

        {!canUpload && (
          <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.375rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
            You are not assigned to upload evidence for this transaction.
          </div>
        )}

        {/* Readiness bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Evidence Readiness — {pct}%</div>
            <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>{readiness?.provided ?? 0} / {readiness?.total ?? 0} mandatory items</div>
          </div>
          {canChangeStatus && (
            <select value={transaction.status} onChange={e => onStatusChange(transaction.id, e.target.value)}
              style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          )}
        </div>

        {/* Checklist items */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem', color: '#111827' }}>Checklist Items</div>
          {items.length === 0
            ? <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No checklist items assigned.</div>
            : items.map(item => (
              <div key={item.id} style={{ padding: '0.75rem', border: `1px solid ${item.provided ? '#bbf7d0' : item.mandatory ? '#fecaca' : '#e5e7eb'}`, borderRadius: '0.375rem', marginBottom: '0.5rem', backgroundColor: item.provided ? '#f0fdf4' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{item.description}</span>
                    {item.mandatory && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: '#dc2626', fontWeight: '600' }}>REQUIRED</span>}
                  </div>
                  {item.provided ? <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>✓ Provided</span>
                    : <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Pending</span>}
                </div>
                {item.provided && isAdmin ? (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleRemove(item.id)} style={{ fontSize: '0.72rem', color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>Remove evidence</button>
                    {validating === item.id && <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontStyle: 'italic' }}>🔍 Validating…</span>}
                  </div>
                ) : !item.provided && canUpload ? (
                  <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                    <input type="file" style={{ display: 'none' }} disabled={uploading === item.id}
                      onChange={e => e.target.files[0] && handleUpload(item.id, e.target.files[0])} />
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', backgroundColor: uploading === item.id ? '#e5e7eb' : '#2563eb', color: uploading === item.id ? '#6b7280' : 'white', borderRadius: '0.25rem' }}>
                      {uploading === item.id ? 'Uploading…' : '📎 Upload'}
                    </span>
                  </label>
                ) : null}
                {validationResults[item.id] && (() => {
                  const vr = validationResults[item.id];
                  const parsed = (() => { try { return JSON.parse(vr.resultJson || '{}'); } catch { return {}; } })();
                  const isMatch = parsed.amount_match ?? vr.amount_match;
                  const extractedAmt = parsed.extracted_amount ?? vr.extracted_amount;
                  const method = parsed.extraction_method ?? vr.extraction_method;
                  const st = vr.status;
                  const bgColor = st === 'VALIDATED' ? '#f0fdf4' : st === 'MISMATCH' ? '#fff7ed' : '#fef2f2';
                  const borderColor = st === 'VALIDATED' ? '#86efac' : st === 'MISMATCH' ? '#fdba74' : '#fca5a5';
                  const icon = st === 'VALIDATED' ? '✅' : st === 'MISMATCH' ? '⚠️' : '❌';
                  return (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{icon} AI Validation: {st}</div>
                      {extractedAmt != null && (
                        <div>Extracted: <strong>₹{Number(extractedAmt).toLocaleString()}</strong> vs <strong>₹{Number(transaction.amount || 0).toLocaleString()}</strong> — {isMatch ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Match ✓</span> : <span style={{ color: '#dc2626', fontWeight: 600 }}>Mismatch ✗</span>}</div>
                      )}
                      {method && <div style={{ color: '#6b7280', marginTop: '0.15rem' }}>Method: {method}</div>}
                    </div>
                  );
                })()}
              </div>
            ))}
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>Tasks ({tasks.length})</div>
            {isAdmin && <button onClick={() => setShowTaskForm(!showTaskForm)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>{showTaskForm ? 'Cancel' : '+ Assign Task'}</button>}
          </div>
          {isAdmin && showTaskForm && (
            <form onSubmit={handleCreateTask} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title *" style={inp} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <select value={taskForm.taskType} onChange={e => setTaskForm({ ...taskForm, taskType: e.target.value })} style={inp}>
                  {['SUBMIT_EVIDENCE','RESUBMIT_EVIDENCE','CLARIFICATION','AUDIT_REVIEW','COMPLIANCE_CHECK'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} style={inp}>
                  {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} style={inp} required>
                  <option value="">Assign to… *</option>
                  {users.filter(u => u.role !== 'AUDITOR').map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
                </select>
                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} style={inp} />
              </div>
              <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Instructions for the assignee" rows={2} style={{ ...inp, resize: 'vertical' }} />
              <button type="submit" style={{ padding: '0.4rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Assign Task</button>
            </form>
          )}
          {tasks.length === 0
            ? <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No tasks assigned yet.</div>
            : tasks.map(t => {
              const pc = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' }[t.priority] || '#6b7280';
              const assignee = users.find(u => u.id === t.assignedTo);
              return (
                <div key={t.id} style={{ padding: '0.6rem 0.75rem', border: `1px solid #e5e7eb`, borderRadius: '0.375rem', marginBottom: '0.4rem', borderLeft: `3px solid ${pc}` }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <span style={{ color: pc, fontWeight: '600' }}>{t.priority}</span>
                    <span>{t.status?.replace(/_/g,' ')}</span>
                    {assignee && <span>→ {assignee.fullName}</span>}
                    {t.dueDate && <span>📅 {t.dueDate}</span>}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Findings */}
        {isAuditor && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#dc2626' }}>⚠ Findings ({findings.length})</div>
              <button onClick={() => setShowFindingForm(!showFindingForm)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: showFindingForm ? '#6b7280' : '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>{showFindingForm ? 'Cancel' : '+ Raise Finding'}</button>
            </div>
            {showFindingForm && (
              <form onSubmit={handleRaiseFinding} style={{ padding: '0.75rem', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input value={findingForm.title} onChange={e => setFindingForm({ ...findingForm, title: e.target.value })} placeholder="Finding title *" style={inp} required />
                <select value={findingForm.severity} onChange={e => setFindingForm({ ...findingForm, severity: e.target.value })} style={inp}>
                  {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea value={findingForm.description} onChange={e => setFindingForm({ ...findingForm, description: e.target.value })} placeholder="Describe the issue…" rows={3} style={{ ...inp, resize: 'vertical' }} required />
                <button type="submit" style={{ padding: '0.4rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>Raise Finding</button>
              </form>
            )}
            {findings.length === 0
              ? <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No findings for this transaction.</div>
              : findings.map(f => {
                const sevBg    = { CRITICAL: '#fee2e2', HIGH: '#fecaca', MEDIUM: '#fef3c7', LOW: '#d1fae5' };
                const sevColor = { CRITICAL: '#7f1d1d', HIGH: '#991b1b', MEDIUM: '#92400e', LOW: '#065f46' };
                return (
                  <div key={f.id} style={{ padding: '0.6rem 0.75rem', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '0.4rem', borderLeft: '3px solid #dc2626', backgroundColor: '#fff5f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{f.title}</div>
                      <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: sevBg[f.severity] || '#f3f4f6', color: sevColor[f.severity] || '#374151', fontWeight: '700' }}>{f.severity}</span>
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

// ── Projects Table (only those with ledger data) ─────────────────────────────
function ProjectsTable({ projects, transactions, onSelect }) {
  const projectsWithData = projects.filter(p => transactions.some(t => t.projectId === p.id));

  const thStyle = {
    textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem',
    color: '#6b7280', fontWeight: '600', borderBottom: '2px solid #e5e7eb',
    whiteSpace: 'nowrap', backgroundColor: '#f9fafb',
  };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'middle' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
          🗂 Evidence Management
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          Projects with ledger data — click a project to upload bank documents and manage evidence.
        </p>
      </div>

      {projectsWithData.length === 0 && (
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.625rem', padding: '1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#92400e' }}>
          ⚠️ No projects have ledger data yet. Go to <strong>General Ledger</strong> to import transactions first.
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
            {projectsWithData.length} project{projectsWithData.length !== 1 ? 's' : ''} with ledger data
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Ledger Entries</th>
              <th style={thStyle}>Approved</th>
              <th style={thStyle}>Pending Evidence</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {projectsWithData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                  No projects with ledger data available.
                </td>
              </tr>
            ) : projectsWithData.map((p, idx) => {
              const txs = transactions.filter(t => t.projectId === p.id);
              const approved = txs.filter(t => t.status === 'APPROVED').length;
              const pending  = txs.filter(t => t.status === 'PENDING_EVIDENCE').length;
              const pct = txs.length > 0 ? Math.round((approved / txs.length) * 100) : 0;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: '600', fontSize: '0.875rem', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                      {p.name}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      {p.projectCode || '—'}
                    </code>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#2563eb' }}>{txs.length}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', minWidth: '60px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#16a34a', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>{approved}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: pending > 0 ? '#d97706' : '#9ca3af', fontWeight: pending > 0 ? '600' : '400' }}>{pending}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)}
                      style={{ padding: '0.35rem 0.875rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileCheck size={13} /> Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Evidence Detail View ─────────────────────────────────────────────────────
function EvidenceDetail({ project, allTransactions, users, currentUser, onBack }) {
  const [transactions, setTransactions]   = useState([]);
  const [bankFile, setBankFile]           = useState(null);
  const [importingBank, setImportingBank] = useState(false);
  const [importResult, setImportResult]   = useState(null);
  const [selectedTx, setSelectedTx]       = useState(null);
  const [filter, setFilter]               = useState('ALL');

  const canImport = ADMIN_ROLES.includes(currentUser?.role);

  const thStyle = {
    textAlign: 'left', padding: '0.625rem 0.875rem', fontSize: '0.73rem',
    color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap', backgroundColor: '#f9fafb',
  };
  const tdStyle = { padding: '0.625rem 0.875rem', fontSize: '0.8rem', verticalAlign: 'middle' };

  useEffect(() => { fetchTransactions(); }, [project.id]);

  const fetchTransactions = async () => {
    try {
      const res = await transactionApi.getByProject(project.id);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBankImport = async (e) => {
    e.preventDefault();
    if (!bankFile) return;
    setImportingBank(true); setImportResult(null);
    const fd = new FormData();
    fd.append('file', bankFile);
    fd.append('projectId', project.id);
    try {
      const res = await transactionApi.importBank(fd);
      setImportResult({ type: 'success', ...res.data });
      fetchTransactions();
    } catch (err) {
      setImportResult({ type: 'error', message: err.response?.data?.message || 'Import failed' });
    } finally { setImportingBank(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await transactionApi.updateStatus(id, status); fetchTransactions(); }
    catch { alert('Failed to update status'); }
  };

  const displayed = filter === 'ALL' ? transactions
    : filter === 'MATCHED'   ? transactions.filter(t => t.bankMatched)
    : filter === 'UNMATCHED' ? transactions.filter(t => !t.bankMatched && t.bankRefNo)
    : transactions.filter(t => t.status === filter);

  return (
    <div style={{ paddingRight: selectedTx ? '500px' : 0, transition: 'padding-right 0.3s' }}>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#111827' }}>🗂 {project.name}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Evidence Management · {transactions.length} transactions</p>
        </div>
        <button onClick={fetchTransactions}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Bank Import */}
      {canImport && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.625rem', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={16} color="#2563eb" /> Import Bank Statement
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>
            Columns: Date, Description, Debit, Credit, Balance, RefNo — auto-matched by date + amount.
          </p>
          <form onSubmit={handleBankImport} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv" onChange={e => setBankFile(e.target.files[0])} style={{ fontSize: '0.8rem', flex: 1, minWidth: '200px' }} />
            <button type="submit" disabled={importingBank || !bankFile}
              style={{ padding: '0.45rem 1.25rem', backgroundColor: importingBank ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: importingBank ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {importingBank ? 'Matching…' : 'Import & Match'}
            </button>
          </form>
          {importResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.8rem',
              backgroundColor: importResult.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: importResult.type === 'error' ? '#991b1b' : '#166534' }}>
              {importResult.type === 'error' ? importResult.message
                : `✓ ${importResult.matched} matched, ${importResult.created} new, ${importResult.skipped} skipped.`}
            </div>
          )}
        </div>
      )}

      {/* Status summary */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(transactions.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})).map(([status, count]) => {
          const sc = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
          return (
            <span key={status} style={{ padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '500', backgroundColor: sc.bg, color: sc.text }}>
              {status.replace(/_/g,' ')}: {count}
            </span>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL','PENDING_EVIDENCE','UNDER_REVIEW','APPROVED','RAISED_FINDING','MATCHED','UNMATCHED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '0.25rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '500',
              backgroundColor: filter === f ? '#2563eb' : 'white', color: filter === f ? 'white' : '#374151' }}>
            {f.replace(/_/g,' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>{displayed.length} of {transactions.length}</span>
      </div>

      {/* Transactions table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.625rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Bank Match</th>
              <th style={thStyle}>Requirement</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No transactions match this filter.</td></tr>
            ) : displayed.map(t => {
              const sc = STATUS_COLORS[t.status] || { bg: '#f3f4f6', text: '#374151' };
              const isSelected = selectedTx?.id === t.id;
              
              const req = t.bankValidationRequired ? 'REQUIRED' : 'OPTIONAL';
              const rc  = REQUIREMENT_COLORS[req];

              return (
                <tr key={t.id} onClick={() => setSelectedTx(isSelected ? null : t)}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : 'white' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white'; }}>
                  <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.78rem' }}>{t.transactionDate}</td>
                  <td style={tdStyle}><code style={{ fontSize: '0.7rem', backgroundColor: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '0.2rem' }}>{t.transactionNumber}</code></td>
                  <td style={{ ...tdStyle, maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>{t.description}</div>
                    {t.vendorCustomer && <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{t.vendorCustomer}</div>}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: t.debitCredit === 'Credit' ? '#059669' : '#dc2626' }}>₹{Number(t.amount || 0).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {t.bankMatched ? <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>✓ Matched</span>
                      : t.bankRefNo ? <span style={{ fontSize: '0.7rem', color: '#d97706' }}>⚠ Partial</span>
                      : <span style={{ fontSize: '0.7rem', color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ 
                        padding: '0.15rem 0.45rem', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: '700', 
                        backgroundColor: rc.bg, color: rc.text, border: `1px solid ${rc.border}` 
                      }}>
                        {req}
                      </span>
                      {t.validationReason && (
                        <span title={t.validationReason} style={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                          <HelpCircle size={12} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: sc.bg, color: sc.text }}>
                      {t.status?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '500' }}>View →</span>
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
            setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
            setSelectedTx(updatedTx);
          }}
        />
      )}
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function EvidenceManagement() {
  const { user: currentUser } = useAuth();
  const [projects, setProjects]         = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [users, setUsers]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [projRes, txRes, usersRes] = await Promise.all([
        projectApi.getAll(),
        transactionApi.getAll(),
        userApi.getAll(),
      ]);
      setProjects(projRes.data);
      setAllTransactions(txRes.data);
      setUsers(usersRes.data);
    } catch (err) { console.error(err); }
  };

  if (selectedProject) {
    return (
      <EvidenceDetail
        project={selectedProject}
        allTransactions={allTransactions}
        users={users}
        currentUser={currentUser}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <ProjectsTable
      projects={projects}
      transactions={allTransactions}
      onSelect={setSelectedProject}
    />
  );
}
