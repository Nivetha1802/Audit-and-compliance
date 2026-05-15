import React, { useState, useEffect } from 'react';
import { projectApi, transactionApi, riskApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Play, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: `1px solid ${color}33`, display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '0.625rem', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginBottom: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────
function AiInsightsPanel({ insights, loading, error }) {
  if (loading) return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤖</div>
      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Gemini AI is analyzing your audit data…</div>
      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.75rem', padding: '1.25rem' }}>
      <div style={{ fontWeight: '700', color: '#dc2626', marginBottom: '0.5rem' }}>⚠️ AI Insights Unavailable</div>
      <div style={{ fontSize: '0.82rem', color: '#991b1b' }}>{error}</div>
    </div>
  );

  if (!insights) return null;

  const sections = [
    { key: 'summary', icon: '📊', label: 'Executive Summary', color: '#2563eb' },
    { key: 'strengths', icon: '✅', label: 'Compliance Strengths', color: '#059669' },
    { key: 'improvements', icon: '🔧', label: 'Areas to Improve', color: '#d97706' },
    { key: 'risks', icon: '🚨', label: 'Key Risks', color: '#dc2626' },
    { key: 'recommendations', icon: '💡', label: 'Recommendations', color: '#7c3aed' },
  ];

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🤖</span>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem' }}>Gemini AI Audit Insights</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Powered by Google Gemini · Generated for this project</div>
        </div>
      </div>
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sections.map(({ key, icon, label, color }) => {
          const content = insights[key];
          if (!content) return null;
          const items = Array.isArray(content) ? content : [content];
          return (
            <div key={key} style={{ borderLeft: `4px solid ${color}`, paddingLeft: '1rem' }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {icon} {label}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.65, marginBottom: items.length > 1 ? '0.35rem' : 0 }}>
                  {items.length > 1 ? `${i + 1}. ${item}` : item}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Validation Results Table ────────────────────────────────────────────────
function ValidationResultsTable({ result }) {
  if (!result) return null;

  const txAnalysis = result.transactionAnalysis || [];
  const ruleStats = result.ruleStats || {};
  const summary = result.summary || {};
  
  const rules = [
    { name: 'Amount Check (Invoice ≈ PO ≈ GRN)', key: 'amountCheck' },
    { name: 'Quantity Check (PO ≥ GRN ≥ Invoice)', key: 'quantityCheck' },
    { name: 'Vendor Match (PO == Invoice == Ledger)', key: 'vendorMatch' },
    { name: 'Duplicate Invoice Check', key: 'duplicateCheck' },
    { name: 'Date Validation (PO ≤ GRN ≤ Invoice)', key: 'dateValidation' },
    { name: 'Bank Validation (Invoice ≈ Bank Payment)', key: 'bankValidation' },
  ];

  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#475569', fontWeight: '600', borderBottom: '1px solid #e2e8f0' };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };

  return (
    <div style={{ marginTop: '1.5rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>📋 Audit Rules Validation Results</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#059669', fontWeight: '600' }}>✅ Passed: {summary.rulesPassed}</span>
          <span style={{ color: '#dc2626', fontWeight: '600' }}>❌ Failed: {summary.rulesFailed}</span>
          {summary.pendingEvidence > 0 && <span style={{ color: '#d97706', fontWeight: '600' }}>⏳ Pending Evidence: {summary.pendingEvidence}</span>}
        </div>
      </div>

      <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {rules.map(rule => {
            const passedCount  = ruleStats[rule.key] || 0;
            const total        = summary.totalTransactions || 0;
            const pending      = summary.pendingEvidence   || 0;
            const eligible     = total - pending;
            const failCount    = eligible - passedCount;

            let label, labelColor;
            if (eligible === 0) {
              label      = '⏳ No Evidence';
              labelColor = '#d97706';
            } else if (failCount > 0) {
              label      = `❌ ${failCount} Failed`;
              labelColor = '#dc2626';
            } else {
              label      = `✅ Passed`;
              labelColor = '#059669';
            }

            return (
              <div key={rule.key} style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${labelColor}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>{rule.name}</div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ color: labelColor, fontWeight: '700' }}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Detailed Transaction Findings</h4>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={thStyle}>Transaction #</th>
              <th style={thStyle}>Analysis Status</th>
              <th style={thStyle}>Findings / Issues</th>
            </tr>
          </thead>
          <tbody>
            {txAnalysis.map((tx, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{tx.transactionNumber}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', 
                    backgroundColor: tx.status === 'SUCCESS' ? '#d1fae5' : tx.status === 'PENDING_EVIDENCE' ? '#fef3c7' : '#fef2f2', 
                    color: tx.status === 'SUCCESS' ? '#065f46' : tx.status === 'PENDING_EVIDENCE' ? '#92400e' : '#991b1b' 
                  }}>
                    {tx.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  {tx.issues && tx.issues.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#dc2626' }}>
                      {tx.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                  ) : tx.status === 'PENDING_EVIDENCE' ? (
                    <span style={{ color: '#d97706' }}>Evidence missing for validation</span>
                  ) : (
                    <span style={{ color: '#059669' }}>All checks passed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Duplicates List ─────────────────────────────────────────────────────────
function DuplicatesList({ duplicates, analysisRan }) {
  if (!analysisRan) return null;

  let data = {};
  try {
    data = typeof duplicates === 'string' ? JSON.parse(duplicates) : (duplicates || {});
  } catch (e) { data = {}; }

  const dups = data.duplicates || [];
  const totalDuplicates = data.total_duplicates || dups.length;

  if (dups.length === 0) {
    return (
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <div>
          <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.95rem' }}>No Duplicate Evidences Detected</div>
          <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.2rem' }}>All transactions passed the duplicate evidences check.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ fontWeight: '700', color: '#9a3412', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
        🚨 Potential Duplicates Detected ({totalDuplicates} groups)
      </div>
      <div style={{ fontSize: '0.8rem', color: '#c2410c', marginBottom: '1rem' }}>The following transactions may be duplicates. Please review and take action.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {dups.map((group, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#c2410c', marginBottom: '0.5rem' }}>Duplicate Group {i + 1}</div>
            {(Array.isArray(group) ? group : [group]).map((item, j) => (
              <div key={j} style={{ fontSize: '0.75rem', color: '#4b5563', padding: '0.25rem 0', borderBottom: j < group.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                • {typeof item === 'object' ? `Ref: ${item.reference_no || item.id} | Amount: ${item.amount} | Vendor: ${item.vendor}` : `Transaction ID: ${item}`}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Project List View (Table) ────────────────────────────────────────────────
const AUDIT_STATUSES = [
  'Evidence_Collection',
  'Internal_Audit',
  'Audit_Ready',
  'Completed'
];

const AUDIT_STATUS_COLORS = {
  Evidence_Collection: '#3b82f6', // blue
  Internal_Audit:      '#f59e0b', // amber
  Audit_Ready:         '#8b5cf6', // purple
  Completed:           '#10b981'  // green
};

function ProjectListTable({ onSelectProject }) {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll();
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await projectApi.updateAuditStatus(projectId, newStatus);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, auditStatus: newStatus } : p));
    } catch (err) {
      alert('Failed to update audit status');
      console.error(err);
    }
  };

  const isAuditor = currentUser?.role === 'AUDITOR' || currentUser?.role === 'ADMIN';

  const thStyle = { textAlign: 'left', padding: '1rem', fontSize: '0.75rem', color: '#475569', fontWeight: '700', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
  const tdStyle = { padding: '1rem', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading projects...</div>;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Project Audit Lifecycle</h2>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Select a project to analyze or update its audit stage.</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Audit Stage</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} style={{ transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{p.name}</td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.8rem' }}>{p.projectCode || 'N/A'}</td>
                <td style={tdStyle}>
                  {isAuditor ? (
                    <select
                      value={p.auditStatus || ''}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${AUDIT_STATUS_COLORS[p.auditStatus] || '#cbd5e1'}`,
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        color: AUDIT_STATUS_COLORS[p.auditStatus] || '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select Stage...</option>
                      {AUDIT_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '0.5rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '700',
                      backgroundColor: `${AUDIT_STATUS_COLORS[p.auditStatus] || '#cbd5e1'}22`,
                      color: AUDIT_STATUS_COLORS[p.auditStatus] || '#64748b',
                      border: `1px solid ${AUDIT_STATUS_COLORS[p.auditStatus] || '#cbd5e1'}44`
                    }}>
                      {p.auditStatus ? p.auditStatus.replace(/_/g, ' ') : 'Not Set'}
                    </span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button
                    onClick={() => onSelectProject(p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    Analyze <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No projects found in this organization.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analysis Dashboard ────────────────────────────────────────────────────────
function AnalysisDashboard({ project, onBack }) {
  const { user: currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [risks, setRisks]                 = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiInsights, setAiInsights]     = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError]   = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetchProjectData();
  }, [project.id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        transactionApi.getLedgerByProject(project.id),
        riskApi.getAll()
      ]);
      setTransactions(tRes.data);
      setRisks(rRes.data.filter(r => r.projectId === project.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setAiInsights(null);
    setInsightsError(null);
    try {
      const compRes = await aiApi.runComprehensiveAnalysis(project.id);
      setAnalysisResult(compRes.data);
      await fetchProjectData();
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const handleGetInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    setAiInsights(null);
    try {
      const insightsRes = await aiApi.getAuditInsights(project.id);
      if (insightsRes.data?.error) {
        setInsightsError(insightsRes.data.error);
      } else {
        setAiInsights(insightsRes.data);
      }
    } catch (err) {
      setInsightsError(err.response?.data?.message || err.message || 'Could not reach AI insights service');
    } finally { setInsightsLoading(false); }
  };

  const canAnalyze = currentUser?.role === 'ADMIN' || currentUser?.role === 'AUDITOR';
  const approved   = transactions.filter(t => t.status === 'APPROVED').length;
  const pending    = transactions.filter(t => t.status === 'PENDING_EVIDENCE').length;
  const openRisks = risks.filter(f => f.status !== 'CLOSED').length;
  const criticalRisks = risks.filter(f => f.severity === 'HIGH' && f.status !== 'CLOSED').length;
  const compliancePct = transactions.length > 0 ? Math.round((approved / transactions.length) * 100) : 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' }}>
      Loading project data…
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#111827' }}>🔬 {project.name}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Audit Analysis · {transactions.length} transactions · {risks.length} risks</p>
        </div>
        {canAnalyze && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleAnalyze} disabled={analyzing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: analyzing ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: analyzing ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '700', boxShadow: '0 2px 6px rgba(37,99,235,0.35)' }}>
              {analyzing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
              {analyzing ? 'Analyzing…' : 'Run Audit Analysis'}
            </button>
            <button onClick={handleGetInsights} disabled={insightsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: insightsLoading ? '#a78bfa' : '#7c3aed', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: insightsLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '700', boxShadow: '0 2px 6px rgba(124,58,237,0.35)' }}>
              {insightsLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span>🤖</span>}
              {insightsLoading ? 'Generating…' : 'Get AI Insights'}
            </button>
          </div>
        )}
      </div>

      {analysisError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '0.5rem', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {analysisError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Transactions Analyzed" value={transactions.length} sub="ledger entries" color="#2563eb" icon="📁" />
        <StatCard label="Compliance Score"     value={`${compliancePct}%`} sub="based on approved"   color="#059669" icon="⚖️" />
        <StatCard label="Unvalidated Items"    value={pending}             sub="awaiting evidence"   color="#d97706" icon="⏳" />
        <StatCard label="Open Risks Found"     value={openRisks}           sub={`${criticalRisks} critical`} color="#dc2626" icon="🚨" />
      </div>

      <AiInsightsPanel insights={aiInsights} loading={insightsLoading} error={insightsError} />
      
      {analysisResult && (
        <>
          <DuplicatesList duplicates={analysisResult.duplicateCheck} analysisRan={true} />
          <ValidationResultsTable result={analysisResult} />
        </>
      )}
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function ConductAuditAnalysis() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {!selectedProject ? (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>Conduct Audit Analysis</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>Perform automated compliance checks and AI-powered auditing.</p>
          </div>
          <ProjectListTable onSelectProject={setSelectedProject} />
        </>
      ) : (
        <AnalysisDashboard 
          project={selectedProject} 
          onBack={() => setSelectedProject(null)} 
        />
      )}
    </div>
  );
}
