import React, { useState, useEffect } from 'react';
import { findingApi } from '../services/api';

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

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function Findings() {
  const [findings, setFindings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    try {
      const res = await findingApi.getAll();
      setFindings(res.data);
    } catch (err) {
      setError('Failed to load findings');
      console.error(err);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Audit Findings</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.375rem 0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500',
                backgroundColor: filter === s ? '#2563eb' : 'white',
                color: filter === s ? 'white' : '#374151',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem' }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            No findings found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                {['Title', 'Severity', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(f => {
                const sev = SEVERITY_COLORS[f.severity] || { bg: '#f3f4f6', text: '#374151' };
                const sta = STATUS_COLORS[f.status]   || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '500' }}>{f.title}</div>
                      {f.description && (
                        <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>{f.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: sev.bg, color: sev.text }}>
                        {f.severity}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: sta.bg, color: sta.text }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select
                        value={f.status}
                        onChange={(e) => handleStatusChange(f.id, e.target.value)}
                        style={{ padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
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
