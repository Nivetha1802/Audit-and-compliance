import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Upload, FileText, RefreshCw } from 'lucide-react';

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

// ── Project List View ────────────────────────────────────────────────────────
function ProjectsTable({ projects, transactions, onSelect }) {
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
          📄 General Ledger Data
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          Select a project to import and view its general ledger transactions.
        </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Audit Status</th>
              <th style={thStyle}>Ledger Entries</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                  No projects found. Create a project first.
                </td>
              </tr>
            ) : projects.map((p, idx) => {
              const txCount = transactions.filter(t => t.projectId === p.id).length;
              const auditColors = {
                DRAFT: { bg: '#f3f4f6', text: '#6b7280' },
                IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
                UNDER_REVIEW: { bg: '#fef3c7', text: '#92400e' },
                SIGNED_OFF: { bg: '#d1fae5', text: '#065f46' },
                CLOSED: { bg: '#e5e7eb', text: '#374151' },
              };
              const ac = auditColors[p.auditStatus] || { bg: '#f3f4f6', text: '#6b7280' };
              const sc = p.status === 'ACTIVE' ? { bg: '#d1fae5', text: '#065f46' } : { bg: '#fef3c7', text: '#92400e' };

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: '600', fontSize: '0.875rem', padding: 0, textAlign: 'left', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                      {p.name}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      {p.projectCode || '—'}
                    </code>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: sc.bg, color: sc.text }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: ac.bg, color: ac.text }}>
                      {p.auditStatus || 'DRAFT'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: txCount > 0 ? '#2563eb' : '#9ca3af' }}>
                      {txCount > 0 ? `${txCount} entries` : 'No data'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)}
                      style={{ padding: '0.35rem 0.875rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileText size={13} /> Open
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

// ── Ledger Detail View ───────────────────────────────────────────────────────
function LedgerDetail({ project, onBack, currentUser }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerFile, setLedgerFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const canImport = ADMIN_ROLES.includes(currentUser?.role);

  const thStyle = {
    textAlign: 'left', padding: '0.625rem 0.875rem', fontSize: '0.73rem',
    color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap', backgroundColor: '#f9fafb',
  };
  const tdStyle = { padding: '0.625rem 0.875rem', fontSize: '0.8rem', verticalAlign: 'middle' };

  useEffect(() => { fetchTransactions(); }, [project.id]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionApi.getByProject(project.id);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!ledgerFile) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData();
    fd.append('file', ledgerFile);
    fd.append('projectId', project.id);
    try {
      const res = await transactionApi.importCsv(fd);
      setImportResult({ type: 'success', ...res.data });
      fetchTransactions();
    } catch (err) {
      setImportResult({ type: 'error', message: err.response?.data?.message || 'Import failed' });
    } finally { setImporting(false); }
  };

  const displayed = filter === 'ALL' ? transactions
    : transactions.filter(t => t.status === filter);

  const totals = transactions.reduce((acc, t) => {
    if (t.debitCredit === 'Credit') acc.credit += (t.amount || 0);
    else acc.debit += (t.amount || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#111827' }}>
            📄 {project.name}
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
            General Ledger — {project.projectCode || 'No code'} · {transactions.length} entries
          </p>
        </div>
        <button onClick={fetchTransactions}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Entries', value: transactions.length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Total Debit', value: `₹${totals.debit.toLocaleString()}`, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Total Credit', value: `₹${totals.credit.toLocaleString()}`, color: '#059669', bg: '#f0fdf4' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: card.bg, borderRadius: '0.625rem', padding: '1rem 1.25rem', border: `1px solid ${card.color}22` }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginBottom: '0.25rem' }}>{card.label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Import Panel */}
      {canImport && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.625rem', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={16} color="#2563eb" /> Import Ledger CSV
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>
            Columns: TxnNo, Date, Description, Debit/Credit, Amount, LedgerName, ProjectCode, Category, Subcategory, Vendor, RefNo
          </p>
          <form onSubmit={handleImport} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv" onChange={(e) => setLedgerFile(e.target.files[0])}
              style={{ fontSize: '0.8rem', flex: 1, minWidth: '200px' }} />
            <button type="submit" disabled={importing || !ledgerFile}
              style={{ padding: '0.45rem 1.25rem', backgroundColor: importing ? '#6ee7b7' : '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {importing ? 'Importing…' : 'Import & Auto-Tag'}
            </button>
          </form>
          {importResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.8rem',
              backgroundColor: importResult.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: importResult.type === 'error' ? '#991b1b' : '#166534' }}>
              {importResult.type === 'error' ? importResult.message
                : `✓ ${importResult.imported} imported, ${importResult.skipped} skipped. Categories auto-tagged.`}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', 'PENDING_EVIDENCE', 'UNDER_REVIEW', 'APPROVED', 'RAISED_FINDING'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '0.25rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '500',
              backgroundColor: filter === f ? '#2563eb' : 'white', color: filter === f ? 'white' : '#374151' }}>
            {f.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
          {displayed.length} of {transactions.length}
        </span>
      </div>

      {/* Ledger Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.625rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto', border: '1px solid #e5e7eb' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading ledger data…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Txn No.</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Ledger</th>
                <th style={thStyle}>D/C</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Ref No.</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                    {transactions.length === 0
                      ? 'No ledger entries yet. Import a CSV to get started.'
                      : 'No entries match this filter.'}
                  </td>
                </tr>
              ) : displayed.map(t => {
                const sc = STATUS_COLORS[t.status] || { bg: '#f3f4f6', text: '#374151' };
                const cc = getCategoryColor(t.categoryName);
                const isCredit = t.debitCredit === 'Credit';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.78rem' }}>{t.transactionDate}</td>
                    <td style={tdStyle}><code style={{ fontSize: '0.7rem', backgroundColor: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '0.2rem' }}>{t.transactionNumber}</code></td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>{t.description}</div>
                      {t.vendorCustomer && <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{t.vendorCustomer}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.75rem', color: '#7c3aed' }}>{t.ledgerName || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: '700', fontSize: '0.75rem', color: isCredit ? '#059669' : '#dc2626' }}>
                      {t.debitCredit || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: isCredit ? '#059669' : '#dc2626' }}>
                      ₹{Number(t.amount || 0).toLocaleString()}
                    </td>
                    <td style={tdStyle}>
                      {t.categoryName
                        ? <span style={{ padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '500', backgroundColor: cc.bg, color: cc.text }}>{t.categoryName}</span>
                        : <span style={{ color: '#d1d5db' }}>—</span>}
                      {t.subcategory && <div style={{ fontSize: '0.67rem', color: '#7c3aed', marginTop: '0.1rem' }}>{t.subcategory}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.75rem', color: '#9ca3af' }}>{t.referenceNo || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '0.15rem 0.45rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: sc.bg, color: sc.text }}>
                        {t.status?.replace(/_/g, ' ')}
                      </span>
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

// ── Main Export ──────────────────────────────────────────────────────────────
export default function GeneralLedger() {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [projRes, txRes] = await Promise.all([
        projectApi.getAll(),
        transactionApi.getAll(),
      ]);
      setProjects(projRes.data);
      setAllTransactions(txRes.data);
    } catch (err) { console.error(err); }
  };

  if (selectedProject) {
    return (
      <LedgerDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        currentUser={currentUser}
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
