import React, { useState, useEffect } from 'react';
import { Edit, Calendar, DollarSign, Target, X } from 'lucide-react';
import { projectApi, userApi } from '../services/api';

const STATUS_COLORS = {
  ACTIVE:      { bg: '#d1fae5', text: '#065f46' },
  COMPLETED:   { bg: '#dbeafe', text: '#1e40af' },
  SUSPENDED:   { bg: '#fee2e2', text: '#991b1b' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
  PARTIAL:     { bg: '#ffedd5', text: '#9a3412' },
};

const AUDIT_STATUS_COLORS = {
  Evidence_Collection: { bg: '#fef3c7', text: '#92400e' },
  Internal_Audit:      { bg: '#dbeafe', text: '#1e40af' },
  Audit_Ready:         { bg: '#d1fae5', text: '#065f46' },
  Completed:           { bg: '#f3f4f6', text: '#374151' },
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
  unitsProposed: '',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  const handleAuditStatusChange = async (id, newStatus) => {
    try {
      await projectApi.updateAuditStatus(id, newStatus);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, auditStatus: newStatus } : p));
    } catch (err) {
      console.error('Failed to update audit status', err);
      alert('Failed to update audit status');
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
      unitsProposed: p.unitsProposed || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : null,
        unitsProposed: form.unitsProposed ? parseInt(form.unitsProposed) : null,
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

  const inputStyle = { width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' };

  if (loading && projects.length === 0) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: '700', color: '#111827' }}>Projects</h1>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '0.625rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' }}>
          + New Project
        </button>
      </div>

      {/* ── Project Modal (Create/Edit) ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', width: '640px', maxWidth: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            <button onClick={handleCancel} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24} /></button>
            
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#111827' }}>{editingId ? 'Edit Project' : 'Create New Project'}</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '2rem' }}>
              {editingId ? 'Update project details and settings.' : 'Start a new audit project by filling out the details below.'}
            </p>

            {error && <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '0.5rem', fontSize: '0.875rem', border: '1px solid #fee2e2' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Project Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required placeholder="e.g. Annual Audit 2024" />
              </div>
              <div>
                <label style={labelStyle}>Project Code *</label>
                <input value={form.projectCode} onChange={e => setForm({ ...form, projectCode: e.target.value })} style={inputStyle} required placeholder="PROJ-001" />
              </div>
              <div>
                <label style={labelStyle}>Units Proposed</label>
                <input type="number" value={form.unitsProposed} onChange={e => setForm({ ...form, unitsProposed: e.target.value })} style={inputStyle} min="0" placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>End Date *</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Total Budget (₹)</label>
                <input type="number" value={form.totalBudget} onChange={e => setForm({ ...form, totalBudget: e.target.value })} style={inputStyle} min="0" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Project Owner *</label>
                <select value={form.projectOwnerId} onChange={e => setForm({ ...form, projectOwnerId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Owner</option>
                  {users.filter(u => ['ADMIN', 'FINANCE_MANAGER'].includes(String(u.role || '').toUpperCase())).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Auditor *</label>
                <select value={form.auditorId} onChange={e => setForm({ ...form, auditorId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Auditor</option>
                  {users.filter(u => ['AUDITOR', 'ADMIN'].includes(String(u.role || '').toUpperCase())).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2', marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 2, padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
                  {editingId ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Projects Table ── */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Details</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline & Budget</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Stage</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => {
              const colors = STATUS_COLORS[p.status] || { bg: '#f3f4f6', text: '#374151' };
              const riskColors = RISK_COLORS[p.riskStatus] || { bg: '#f3f4f6', text: '#374151' };
              const ac = AUDIT_STATUS_COLORS[p.auditStatus] || AUDIT_STATUS_COLORS.Evidence_Collection;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>{idx + 1}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: '600', color: '#111827', fontSize: '1rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Code: {p.projectCode}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} color="#6b7280" /> {p.startDate} - {p.endDate}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <DollarSign size={16} /> {p.totalBudget?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <Target size={14} /> Units: {p.unitsProposed || 0}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: colors.bg, color: colors.text, display: 'inline-block' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          value={p.auditStatus || 'Evidence_Collection'}
                          onChange={(e) => handleAuditStatusChange(p.id, e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            backgroundColor: ac.bg,
                            color: ac.text,
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            textTransform: 'uppercase'
                          }}
                        >
                          <option value="Evidence_Collection">Evidence Collection</option>
                          <option value="Internal_Audit">Internal Audit</option>
                          <option value="Audit_Ready">Audit Ready</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>{Math.round(p.complianceScore || 0)}%</span>
                      </div>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: '700', backgroundColor: riskColors.bg, color: riskColors.text, width: 'fit-content' }}>
                        {p.riskStatus || 'UNRATED'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button onClick={() => handleEdit(p)} title="Edit Project"
                        style={{ padding: '0.5rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <Edit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>No projects found</div>
                  <div style={{ fontSize: '0.875rem' }}>Create a new project to start an audit.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
