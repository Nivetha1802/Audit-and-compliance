import React, { useState, useEffect } from 'react';
import { projectApi, userApi } from '../services/api';

const STATUS_COLORS = {
  ACTIVE:      { bg: '#d1fae5', text: '#065f46' },
  COMPLETED:   { bg: '#dbeafe', text: '#1e40af' },
  SUSPENDED:   { bg: '#fee2e2', text: '#991b1b' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
  PARTIAL:     { bg: '#ffedd5', text: '#9a3412' },
};

const AUDIT_STATUS_COLORS = {
  DRAFT:        { bg: '#f3f4f6', text: '#374151' },
  IN_PROGRESS:  { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW: { bg: '#dbeafe', text: '#1e40af' },
  SIGNED_OFF:   { bg: '#d1fae5', text: '#065f46' },
  CLOSED:       { bg: '#e5e7eb', text: '#6b7280' },
};

const AUDIT_TRANSITIONS = {
  DRAFT:        'IN_PROGRESS',
  IN_PROGRESS:  'UNDER_REVIEW',
  UNDER_REVIEW: 'SIGNED_OFF',
};

const RISK_COLORS = {
  COMPLIANT:    { bg: '#d1fae5', text: '#065f46' },
  AT_RISK:      { bg: '#fee2e2', text: '#991b1b' },
  NEEDS_REVIEW: { bg: '#ffedd5', text: '#9a3412' },
};

const emptyForm = {
  name: '', projectCode: '', description: '',
  startDate: '', endDate: '', totalBudget: '',
  projectOwnerId: '', auditorId: '',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [auditPanel, setAuditPanel] = useState(null);
  const [auditDates, setAuditDates] = useState({ auditPeriodStart: '', auditPeriodEnd: '', auditDeadline: '' });
  const [signOffNotes, setSignOffNotes] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [auditWorking, setAuditWorking] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectApi.getAll(),
        userApi.getAll(),
      ]);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      projectCode: p.projectCode || '',
      description: p.description || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      totalBudget: p.totalBudget || '',
      projectOwnerId: p.projectOwnerId || '',
      auditorId: p.auditorId || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false); setEditingId(null); setForm(emptyForm); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : null,
      };
      if (editingId) {
        await projectApi.update(editingId, payload);
      } else {
        await projectApi.create(payload);
      }
      handleCancel();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    }
  };

  const openAuditPanel = async (p) => {
    setAuditPanel(p);
    setAuditDates({
      auditPeriodStart: p.auditPeriodStart || '',
      auditPeriodEnd: p.auditPeriodEnd || '',
      auditDeadline: p.auditDeadline || '',
    });
    setSignOffNotes('');
    setReadiness(null);
    try {
      const res = await projectApi.getReadiness(p.id);
      setReadiness(res.data);
    } catch { /* readiness optional */ }
  };

  const handleAdvanceAudit = async () => {
    if (!auditPanel) return;
    setAuditWorking(true);
    try {
      const nextStatus = AUDIT_TRANSITIONS[auditPanel.auditStatus || 'DRAFT'];
      if (!nextStatus) return;
      await projectApi.advanceAudit(auditPanel.id, { targetStatus: nextStatus, ...auditDates });
      setAuditPanel(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to advance audit status');
    } finally { setAuditWorking(false); }
  };

  const handleSignOff = async () => {
    if (!auditPanel) return;
    if (!window.confirm('Sign off this project? This will lock it and cannot be undone.')) return;
    setAuditWorking(true);
    try {
      await projectApi.signOff(auditPanel.id, { notes: signOffNotes });
      setAuditPanel(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Sign-off failed');
    } finally { setAuditWorking(false); }
  };

  const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem' };

  if (loading && projects.length === 0) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Projects</h1>
        <button onClick={showForm ? handleCancel : () => setShowForm(true)}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Project' : 'Create New Project'}</h3>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            The project will use all categories configured in your organisation settings.
          </p>
          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle}>Project Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Project Code *</label><input value={form.projectCode} onChange={e => setForm({ ...form, projectCode: e.target.value })} style={inputStyle} required /></div>
            <div><label style={labelStyle}>Start Date *</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} required /></div>
            <div><label style={labelStyle}>End Date *</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} required /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Total Budget (₹)</label><input type="number" value={form.totalBudget} onChange={e => setForm({ ...form, totalBudget: e.target.value })} style={inputStyle} min="0" step="0.01" /></div>
            <div>
              <label style={labelStyle}>Project Owner *</label>
              <select value={form.projectOwnerId} onChange={e => setForm({ ...form, projectOwnerId: e.target.value })} style={inputStyle} required>
                <option value="">Select Owner</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Auditor *</label>
              <select value={form.auditorId} onChange={e => setForm({ ...form, auditorId: e.target.value })} style={inputStyle} required>
                <option value="">Select Auditor</option>
                {users.filter(u => {
                  const r = String(u.role || '').toUpperCase();
                  return r === 'AUDITOR' || r === 'ADMIN';
                }).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: '600' }}>
                {editingId ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {projects.map((p) => {
          const colors = STATUS_COLORS[p.status] || { bg: '#f3f4f6', text: '#374151' };
          const riskColors = RISK_COLORS[p.riskStatus] || { bg: '#f3f4f6', text: '#374151' };
          return (
            <div key={p.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{p.name}</h3>
                  <code style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.projectCode}</code>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => handleEdit(p)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}>Edit</button>
                    <button onClick={() => openAuditPanel(p)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#5b21b6', fontWeight: '500' }}>Audit</button>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: colors.bg, color: colors.text }}>{p.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {(() => { const ac = AUDIT_STATUS_COLORS[p.auditStatus || 'DRAFT'] || AUDIT_STATUS_COLORS.DRAFT; return <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', backgroundColor: ac.bg, color: ac.text }}>Audit: {p.auditStatus || 'DRAFT'}</span>; })()}
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', backgroundColor: riskColors.bg, color: riskColors.text }}>{p.riskStatus || 'UNRATED'}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#4b5563' }}>{Math.round(p.complianceScore || 0)}%</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.8rem', color: '#374151' }}>
                <div><strong>Budget:</strong> ₹{p.totalBudget?.toLocaleString()}</div>
                <div><strong>Timeline:</strong> {p.startDate} to {p.endDate}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Audit Lifecycle Panel ── */}
      {auditPanel && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '520px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Audit Lifecycle — {auditPanel.name}</h3>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Current audit status: <strong>{auditPanel.auditStatus || 'DRAFT'}</strong>
                  {auditPanel.locked && <span style={{ marginLeft: '0.5rem', color: '#dc2626', fontWeight: '600' }}>🔒 Locked</span>}
                </div>
              </div>
              <button onClick={() => setAuditPanel(null)} style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {readiness && (
              <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Audit Readiness</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <div>Transactions: <strong>{readiness.approvedTransactions}/{readiness.totalTransactions}</strong> approved</div>
                  <div>Pending evidence: <strong>{readiness.pendingEvidenceTransactions}</strong></div>
                  <div>Open findings: <strong style={{ color: readiness.openFindings > 0 ? '#dc2626' : '#16a34a' }}>{readiness.openFindings}</strong></div>
                  <div>Critical open: <strong style={{ color: readiness.openCriticalFindings > 0 ? '#dc2626' : '#16a34a' }}>{readiness.openCriticalFindings}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}>
                    Readiness: <strong>{readiness.readinessPct}%</strong>
                    <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', marginTop: '0.25rem' }}>
                      <div style={{ height: '100%', width: `${readiness.readinessPct}%`, backgroundColor: readiness.readinessPct >= 80 ? '#16a34a' : '#d97706', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!auditPanel.locked && AUDIT_TRANSITIONS[auditPanel.auditStatus || 'DRAFT'] && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  Advance to: <span style={{ color: '#2563eb' }}>{AUDIT_TRANSITIONS[auditPanel.auditStatus || 'DRAFT']}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem' }}>Audit Period Start</label>
                    <input type="date" value={auditDates.auditPeriodStart} onChange={e => setAuditDates({ ...auditDates, auditPeriodStart: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem' }}>Audit Period End</label>
                    <input type="date" value={auditDates.auditPeriodEnd} onChange={e => setAuditDates({ ...auditDates, auditPeriodEnd: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem' }}>Audit Deadline</label>
                    <input type="date" value={auditDates.auditDeadline} onChange={e => setAuditDates({ ...auditDates, auditDeadline: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={handleAdvanceAudit} disabled={auditWorking}
                  style={{ width: '100%', padding: '0.625rem', backgroundColor: auditWorking ? '#e5e7eb' : '#2563eb', color: auditWorking ? '#6b7280' : 'white', border: 'none', borderRadius: '0.375rem', cursor: auditWorking ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                  {auditWorking ? 'Processing...' : `Advance to ${AUDIT_TRANSITIONS[auditPanel.auditStatus || 'DRAFT']}`}
                </button>
              </div>
            )}

            {!auditPanel.locked && auditPanel.auditStatus === 'UNDER_REVIEW' && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#065f46' }}>✍ CA Sign-Off</div>
                <textarea value={signOffNotes} onChange={e => setSignOffNotes(e.target.value)}
                  placeholder="Sign-off notes (optional)..." rows={2}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.5rem' }} />
                <button onClick={handleSignOff} disabled={auditWorking}
                  style={{ width: '100%', padding: '0.625rem', backgroundColor: auditWorking ? '#e5e7eb' : '#10b981', color: auditWorking ? '#6b7280' : 'white', border: 'none', borderRadius: '0.375rem', cursor: auditWorking ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                  {auditWorking ? 'Processing...' : '🔒 Sign Off & Lock Project'}
                </button>
              </div>
            )}

            {auditPanel.locked && (
              <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#065f46', textAlign: 'center' }}>
                ✅ This project has been signed off and is locked.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
