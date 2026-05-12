import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { findingApi } from '../services/api';
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

const emptyForm = { title: '', description: '', severity: 'MEDIUM' };

/* ─── Detail Popup ─────────────────────────────────────────────────────────── */
function FindingDetailModal({ finding, canCreate, onClose, onStatusChange }) {
  if (!finding) return null;

  const sev = SEVERITY_COLORS[finding.severity] || { bg: '#f3f4f6', text: '#374151' };
  const sta = STATUS_COLORS[finding.status]     || { bg: '#f3f4f6', text: '#374151' };

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      {/* Modal card — stop click propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: '0.75rem',
          width: '100%', maxWidth: '560px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Finding Detail
            </p>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: '700', lineHeight: 1.3 }}>
              {finding.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0, fontWeight: '700',
            }}
          >✕</button>
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
                {finding.severity}
              </span>
            </div>
            <div>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</p>
              <span style={{
                padding: '0.3rem 0.75rem', borderRadius: '9999px',
                fontSize: '0.8rem', fontWeight: '600',
                backgroundColor: sta.bg, color: sta.text,
              }}>
                {finding.status.replace(/_/g, ' ')}
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
              {finding.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description provided.</span>}
            </p>
          </div>

          {/* Update Status — only for authorised roles */}
          {canCreate && (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Update Status
              </p>
              <select
                value={finding.status}
                onChange={(e) => onStatusChange(finding.id, e.target.value)}
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
          backgroundColor: '#f9fafb', borderRadius: '0 0 0.75rem 0.75rem',
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
export default function Findings() {
  const { user } = useAuth();
  const [findings, setFindings]       = useState([]);
  const [filter, setFilter]           = useState('ALL');
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [error, setError]             = useState('');
  const [formError, setFormError]     = useState('');
  const [selectedFinding, setSelectedFinding] = useState(null);

  const canCreate = CAN_CREATE.includes(user?.role);

  useEffect(() => { fetchFindings(); }, []);

  const fetchFindings = async () => {
    try {
      const res = await findingApi.getAll();
      setFindings(res.data);
    } catch {
      setError('Failed to load findings.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await findingApi.create({ ...form, status: 'OPEN' });
      setForm(emptyForm);
      setShowForm(false);
      fetchFindings();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create finding.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await findingApi.updateStatus(id, status);
      setFindings(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      // Keep modal in sync
      setSelectedFinding(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch {
      alert('Failed to update status.');
    }
  };

  const displayed = filter === 'ALL' ? findings : findings.filter(f => f.status === filter);

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem',
    fontSize: '0.875rem', boxSizing: 'border-box',
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Audit Findings</h1>
        {canCreate && (
          <button
            onClick={() => { setShowForm(!showForm); setFormError(''); }}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: showForm ? '#6b7280' : '#dc2626',
              color: 'white', border: 'none', borderRadius: '0.375rem',
              cursor: 'pointer', fontWeight: '500',
            }}
          >
            {showForm ? 'Cancel' : '⚠ Raise Finding'}
          </button>
        )}
      </div>

      {/* ── Create Finding Form ── */}
      {showForm && canCreate && (
        <div style={{
          backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem',
          borderLeft: '4px solid #dc2626',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#111827' }}>Raise New Finding</h3>
          {formError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  Finding Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Invoice amount does not match bank debit"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
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
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe the issue in detail — what was found, what was expected, and the potential impact."
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
              >
                Raise Finding
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(''); }}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
              padding: '0.3rem 0.75rem', border: '1px solid #d1d5db',
              borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500',
              backgroundColor: filter === s ? '#2563eb' : 'white',
              color: filter === s ? 'white' : '#374151',
            }}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280' }}>
          {displayed.length} finding{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Findings Table ── */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            {findings.length === 0
              ? "No findings yet. Raise a finding from this page or from a transaction's evidence panel."
              : 'No findings match the selected filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>#</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>Title</th>
                <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>Severity</th>
                <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((f, idx) => (
                <tr
                  key={f.id}
                  style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  {/* Row number */}
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#9ca3af', width: '48px' }}>
                    {idx + 1}
                  </td>

                  {/* Title only */}
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    {f.title}
                  </td>

                   {/* Severity badge */}
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: (SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.LOW).bg,
                      color: (SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.LOW).text,
                      padding: '0.2rem 0.65rem', borderRadius: '999px',
                      fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em'
                    }}>{f.severity || '—'}</span>
                  </td>

                  {/* Status badge */}
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: (STATUS_COLORS[f.status] || STATUS_COLORS.OPEN).bg,
                      color: (STATUS_COLORS[f.status] || STATUS_COLORS.OPEN).text,
                      padding: '0.2rem 0.65rem', borderRadius: '999px',
                      fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em'
                    }}>{f.status || '—'}</span>
                  </td>

                  {/* Eye icon */}
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center', width: '80px' }}>
                    <button
                      onClick={() => setSelectedFinding(f)}
                      title="View Details"
                      style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '0.375rem', padding: '0.4rem 0.6rem',
                        cursor: 'pointer', color: '#2563eb',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dbeafe'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail Popup ── */}
      <FindingDetailModal
        finding={selectedFinding}
        canCreate={canCreate}
        onClose={() => setSelectedFinding(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
