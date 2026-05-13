import React, { useState, useEffect } from 'react';
import { projectApi, transactionApi, riskApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';


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
    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
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

  const canAnalyze = ['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER'].includes(currentUser?.role);

  useEffect(() => { fetchData(); }, [project.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, risksRes] = await Promise.all([
        transactionApi.getByProject(project.id),
        riskApi.getAll(),
      ]);
      setTransactions(txRes.data);
      setRisks(risksRes.data.filter(f => {
        const tx = txRes.data.find(t => t.id === f.transactionId);
        return tx != null;
      }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Run Audit Analysis ──────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setAnalyzing(true); setAnalysisError(null); setAnalysisResult(null);
    setAiInsights(null); setInsightsError(null);

    try {
      const dupRes = await aiApi.duplicateDetection(project.id);
      const catMap = {};
      transactions.forEach(t => {
        const cat = t.categoryName || 'Uncategorised';
        if (!catMap[cat]) catMap[cat] = { name: cat, actual: 0, budgeted: project.totalBudget ? project.totalBudget / 3 : 0 };
        catMap[cat].actual += Number(t.amount || 0);
      });
      const categories = Object.values(catMap);
      const varRes = await aiApi.budgetVariance(project.id, { categories, alertThresholdPct: 10 });

      setAnalysisResult({ duplicate: dupRes.data, variance: varRes.data });

      setInsightsLoading(true);
      try {
        const insightsRes = await fetch(
          `http://localhost:8080/api/v1/ai/audit-insights/${project.id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setAiInsights(data);
        } else {
          setInsightsError('AI insights endpoint returned an error.');
        }
      } catch (err) {
        setInsightsError('Could not reach AI insights service');
      } finally { setInsightsLoading(false); }

    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };


  const approved   = transactions.filter(t => t.status === 'APPROVED').length;
  const pending    = transactions.filter(t => t.status === 'PENDING_EVIDENCE').length;
  const openRisks = risks.filter(f => f.status !== 'CLOSED').length;
  const criticalRisks = risks.filter(f => f.severity === 'HIGH' && f.status !== 'CLOSED').length;
  const compliancePct = transactions.length > 0 ? Math.round((approved / transactions.length) * 100) : 0;


  const dupResult   = analysisResult?.duplicate;
  const varResult   = analysisResult?.variance;
  const dupParsed   = (() => { try { return JSON.parse(dupResult?.resultJson || '{}'); } catch { return {}; } })();
  const varParsed   = (() => { try { return JSON.parse(varResult?.resultJson || '{}'); } catch { return {}; } })();
  const dupCount    = dupParsed?.duplicates?.length ?? 0;
  const varAlerts   = varParsed?.alerts ?? [];

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
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: analyzing ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: analyzing ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '700', boxShadow: '0 2px 6px rgba(37,99,235,0.35)' }}>
            {analyzing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
            {analyzing ? 'Analyzing…' : 'Run Audit Analysis'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Transactions"   value={transactions.length}  sub="in this project"        color="#2563eb" icon="📊" />
        <StatCard label="Compliance Rate"       value={`${compliancePct}%`}  sub={`${approved} approved`} color={compliancePct >= 80 ? '#059669' : '#d97706'} icon="✅" />
        <StatCard label="Pending Evidence"      value={pending}              sub="need attention"         color="#d97706" icon="⏳" />
        <StatCard label="Open Risks"            value={openRisks}            sub={criticalRisks > 0 ? `${criticalRisks} HIGH` : 'no high risk'} color={openRisks > 0 ? '#dc2626' : '#059669'} icon="⚠️" />
      </div>

      <AiInsightsPanel insights={aiInsights} loading={insightsLoading} error={insightsError} />
    </div>
  );
}

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
          🔬 Conduct Audit Analysis
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          Select a project to run AI-powered audit analysis and get improvement recommendations.
        </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Audit Status</th>
              <th style={thStyle}>Compliance Score</th>
              <th style={thStyle}>Transactions</th>
              <th style={thStyle}>Analyze</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => {
              const txCount = transactions.filter(t => t.projectId === p.id).length;
              const score   = Math.round(p.complianceScore || 0);
              const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
              const auditColors = {
                DRAFT: { bg: '#f3f4f6', text: '#6b7280' }, IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
                UNDER_REVIEW: { bg: '#fef3c7', text: '#92400e' }, SIGNED_OFF: { bg: '#d1fae5', text: '#065f46' },
                CLOSED: { bg: '#e5e7eb', text: '#374151' }, COMPLIANT: { bg: '#d1fae5', text: '#065f46' },
              };
              const ac = auditColors[p.auditStatus] || { bg: '#f3f4f6', text: '#6b7280' };
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{p.name}</div>
                  </td>
                  <td style={tdStyle}>{p.projectCode || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: ac.bg, color: ac.text }}>
                      {p.auditStatus || 'DRAFT'}
                    </span>
                  </td>
                  <td style={tdStyle}>{score}%</td>
                  <td style={tdStyle}>{txCount}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Analyze</button>
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

export default function ConductAuditAnalysis() {
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        projectApi.getAll(),
        transactionApi.getAll()
      ]);
      setProjects(pRes.data);
      setTransactions(tRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (selectedProject) {
    return <AnalysisDashboard project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return <ProjectsTable projects={projects} transactions={transactions} onSelect={setSelectedProject} />;
}
