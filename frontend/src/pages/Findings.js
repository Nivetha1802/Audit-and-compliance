import React, { useState, useEffect } from 'react';
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

export default function Findings() {
  const { user } = useAuth();
  const [findings, setFindings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const canCreate = CAN_CREATE.includes(user?.role);

  useEffect(() => { fetchFindings(); }, []);

  const fetchFindings = async () => {
    try {
      const res = await findingApi.getAll();
      setFindings(res.data);
    } catch (err) {
      setError('Failed to load findings');
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
      setFormError(err.response?.data?.message || 'Failed to create finding');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await findingApi.updateStatus(id, status);
      setFindings(findings.map(f => f.id === id ? { ...f, status } : f));
    } catch (err) {
      alert('Failed to update status');
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Audit Findings</h1>
        {canCreate && (
          <button onClick={() => { setShowForm(!showForm); setFormError(''); }}
            style={{ padding: '0.5rem 1.25rem', backgroundColor: showForm ? '#6b7280' : '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
            {showForm ? 'Cancel' : '⚠ Raise Finding'}
          </button>
        )}
      </div>

      {/* Create Finding Form */}
      {showForm && canCreate && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem', borderLeft: '4px solid #dc2626' }}>
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
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={inputStyle} required>
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
              <button type="submit"
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
                Raise Finding
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(''); }}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>
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

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500',
              backgroundColor: filter === s ? '#2563eb' : 'white', color: filter === s ? 'white' : '#374151' }}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280' }}>
          {displayed.length} finding{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Findings table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            {findings.length === 0
              ? 'No findings yet. Raise a finding from this page or from a transaction\'s evidence panel.'
              : 'No findings match the selected filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                {['Title & Description', 'Severity', 'Status', 'Update Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(f => {
                const sev = SEVERITY_COLORS[f.severity] || { bg: '#f3f4f6', text: '#374151' };
                const sta = STATUS_COLORS[f.status]   || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '600' }}>{f.title}</div>
                      {f.description && (
                        <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', maxWidth: '500px' }}>{f.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: sev.bg, color: sev.text }}>
                        {f.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: sta.bg, color: sta.text }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {canCreate ? (
                        <select value={f.status} onChange={(e) => handleStatusChange(f.id, e.target.value)}
                          style={{ padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
