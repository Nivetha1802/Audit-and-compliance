import React, { useState, useEffect } from 'react';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { riskApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#fee2e2', text: '#7f1d1d' },
  HIGH:     { bg: '#fecaca', text: '#991b1b' },
  MEDIUM:   { bg: '#fef3c7', text: '#92400e' },
  LOW:      { bg: '#d1fae5', text: '#065f46' },
};
const STATUS_COLORS = {
  OPEN:        { bg: '#fee2e2', text: '#991b1b' },
  ASSIGNED:    { bg: '#dbeafe', text: '#1e40af' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
  RESOLVED:    { bg: '#d1fae5', text: '#065f46' },
  CLOSED:      { bg: '#f3f4f6', text: '#374151' },
};
const STATUSES   = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CAN_CREATE = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'];

const emptyForm = { title: '', description: '', severity: 'MEDIUM', projectId: '' };

const modalOverlayStyle = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const modalContainerStyle = {
  backgroundColor: 'white', borderRadius: '0.75rem',
  width: '100%', maxWidth: '560px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  display: 'flex', flexDirection: 'column',
  maxHeight: '90vh', overflow: 'hidden',
};

/* ─── Create Risk Popup ─────────────────────────────────────────────────── */
function RiskCreateModal({ show, onClose, onSubmit, form, setForm, projects, formError }) {
  if (!show) return null;

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem',
    fontSize: '0.875rem', boxSizing: 'border-box',
    backgroundColor: '#f9fafb',
  };

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalContainerStyle}>
        <div style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: '700' }}>Raise New Risk</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
        </div>
        
        <form onSubmit={onSubmit} style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {formError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.375rem', color: '#4b5563', textTransform: 'uppercase' }}>
                Risk Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                placeholder="Brief summary of the issue"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.375rem', color: '#4b5563', textTransform: 'uppercase' }}>
                Project *
              </label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.375rem', color: '#4b5563', textTransform: 'uppercase' }}>
                Severity *
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                style={inputStyle}
                required
              >
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.375rem', color: '#4b5563', textTransform: 'uppercase' }}>
                Detailed Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                placeholder="What was found, what was expected, and the potential impact."
                required
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.625rem 1.5rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '0.625rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}
            >
              Raise Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Detail Popup ─────────────────────────────────────────────────────────── */
function RiskDetailModal({ risk, canCreate, onClose, onStatusChange }) {
  if (!risk) return null;

  const sev = SEVERITY_COLORS[risk.severity] || { bg: '#f3f4f6', text: '#374151' };
  const sta = STATUS_COLORS[risk.status]     || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalContainerStyle}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Risk Detail
            </p>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: '700', lineHeight: 1.3 }}>
              {risk.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><X size={18}/></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* Severity + Status badges */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Severity</p>
              <span style={{
                padding: '0.3rem 0.75rem', borderRadius: '9999px',
                fontSize: '0.8rem', fontWeight: '700',
                backgroundColor: sev.bg, color: sev.text,
              }}>
                {risk.severity}
              </span>
            </div>
            <div>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</p>
              <span style={{
                padding: '0.3rem 0.75rem', borderRadius: '9999px',
                fontSize: '0.8rem', fontWeight: '600',
                backgroundColor: sta.bg, color: sta.text,
              }}>
                {risk.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.25rem 0' }} />

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Description
            </p>
            <p style={{
              margin: 0, fontSize: '0.9rem', color: '#111827', lineHeight: 1.65,
              backgroundColor: '#f9fafb', padding: '0.875rem', borderRadius: '0.5rem',
              border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap',
            }}>
              {risk.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description provided.</span>}
            </p>
          </div>

          {/* Update Status — only for authorised roles */}
          {canCreate && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Update Status
              </p>
              <select
                value={risk.status}
                onChange={(e) => onStatusChange(risk.id, e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer',
                  backgroundColor: 'white', width: '100%',
                }}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end',
          backgroundColor: '#f9fafb',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', backgroundColor: 'white',
              border: '1px solid #d1d5db', borderRadius: '0.375rem',
              fontSize: '0.875rem', cursor: 'pointer', color: '#374151', fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function Risks() {
  const { user } = useAuth();
  const [risks, setRisks]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [filter, setFilter]           = useState('ALL');
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [error, setError]             = useState('');
  const [formError, setFormError]     = useState('');
  const [selectedRisk, setSelectedRisk] = useState(null);

  const canCreate = CAN_CREATE.includes(user?.role);

  useEffect(() => { 
    fetchRisks(); 
    fetchProjects();
  }, []);

  const fetchRisks = async () => {
    try {
      const res = await riskApi.getAll();
      setRisks(res.data);
    } catch {
      setError('Failed to load risks.');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load projects');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await riskApi.create({ ...form, status: 'OPEN' });
      setForm(emptyForm);
      setShowForm(false);
      fetchRisks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create risk.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await riskApi.updateStatus(id, status);
      setRisks(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setSelectedRisk(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch {
      alert('Failed to update status.');
    }
  };

  const displayed = filter === 'ALL' ? risks : risks.filter(r => r.status === filter);

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Audit Risks</h1>
        {canCreate && (
          <button
            onClick={() => { setShowForm(true); setFormError(''); }}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white', border: 'none', borderRadius: '0.5rem',
              cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⚠ Raise Risk
          </button>
        )}
      </div>

      <RiskCreateModal
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
        form={form}
        setForm={setForm}
        projects={projects}
        formError={formError}
      />

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem' }}>
          {error}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.35rem 0.85rem', border: '1px solid #d1d5db',
              borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
              backgroundColor: filter === s ? '#111827' : 'white',
              color: filter === s ? 'white' : '#4b5563',
              boxShadow: filter === s ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>
          Showing {displayed.length} risk{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Risks Table ── */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}><AlertTriangle size={48} /></div>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {risks.length === 0
                ? "No risks reported yet."
                : 'No risks match the current filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Title</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fcfcfc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#9ca3af', width: '48px', fontWeight: '500' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>
                    {r.title}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: (SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.LOW).bg,
                      color: (SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.LOW).text,
                      padding: '0.25rem 0.75rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.05em'
                    }}>{r.severity}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: (STATUS_COLORS[r.status] || STATUS_COLORS.OPEN).bg,
                      color: (STATUS_COLORS[r.status] || STATUS_COLORS.OPEN).text,
                      padding: '0.25rem 0.75rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700', border: '1px solid transparent'
                    }}>{r.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', width: '100px' }}>
                    <button
                      onClick={() => setSelectedRisk(r)}
                      style={{
                        background: '#f3f4f6', border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
                        cursor: 'pointer', color: '#374151',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.75rem', fontWeight: '600',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RiskDetailModal
        risk={selectedRisk}
        canCreate={canCreate}
        onClose={() => setSelectedRisk(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
