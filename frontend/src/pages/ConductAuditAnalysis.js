import React, { useState, useEffect } from 'react';
import { projectApi, transactionApi, findingApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Play, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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
  const [findings, setFindings]         = useState([]);
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
      const [txRes, findingsRes] = await Promise.all([
        transactionApi.getByProject(project.id),
        findingApi.getAll(),
      ]);
      setTransactions(txRes.data);
      setFindings(findingsRes.data.filter(f => {
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
      // Step 1: Duplicate detection
      const dupRes = await aiApi.duplicateDetection(project.id);

      // Step 2: Budget variance — build categories from transactions
      const catMap = {};
      transactions.forEach(t => {
        const cat = t.categoryName || 'Uncategorised';
        if (!catMap[cat]) catMap[cat] = { name: cat, actual: 0, budgeted: project.totalBudget ? project.totalBudget / 3 : 0 };
        catMap[cat].actual += Number(t.amount || 0);
      });
      const categories = Object.values(catMap);
      const varRes = await aiApi.budgetVariance(project.id, { categories, alertThresholdPct: 10 });

      setAnalysisResult({ duplicate: dupRes.data, variance: varRes.data });

      // Step 3: AI insights from backend
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
          setInsightsError('AI insights endpoint returned an error. Ensure the backend is running.');
        }
      } catch (err) {
        setInsightsError('Could not reach AI insights service: ' + (err.message || 'Unknown error'));
      } finally { setInsightsLoading(false); }

    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const statusData = Object.entries(
    transactions.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const categoryData = Object.entries(
    transactions.reduce((acc, t) => {
      const cat = t.categoryName || 'Uncategorised';
      acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
      return acc;
    }, {})
  ).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);

  const severityData = Object.entries(
    findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = (() => {
    const map = {};
    transactions.forEach(t => {
      if (!t.transactionDate) return;
      const month = t.transactionDate.slice(0, 7);
      if (!map[month]) map[month] = { month, debit: 0, credit: 0 };
      if (t.debitCredit === 'Credit') map[month].credit += Number(t.amount || 0);
      else map[month].debit += Number(t.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  })();

  const approved   = transactions.filter(t => t.status === 'APPROVED').length;
  const pending    = transactions.filter(t => t.status === 'PENDING_EVIDENCE').length;
  const openFindings = findings.filter(f => f.status !== 'CLOSED').length;
  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'CLOSED').length;
  const compliancePct = transactions.length > 0 ? Math.round((approved / transactions.length) * 100) : 0;

  const complianceGauge = [{ name: 'Compliance', value: compliancePct, fill: compliancePct >= 80 ? '#16a34a' : compliancePct >= 50 ? '#d97706' : '#dc2626' }];

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
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#111827' }}>🔬 {project.name}</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Audit Analysis · {transactions.length} transactions · {findings.length} findings</p>
        </div>
        {canAnalyze && (
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: analyzing ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: analyzing ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '700', boxShadow: '0 2px 6px rgba(37,99,235,0.35)' }}>
            {analyzing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
            {analyzing ? 'Analyzing…' : 'Run Audit Analysis'}
          </button>
        )}
      </div>

      {analysisError && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#991b1b' }}>
          ❌ {analysisError}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Transactions"   value={transactions.length}  sub="in this project"        color="#2563eb" icon="📊" />
        <StatCard label="Compliance Rate"       value={`${compliancePct}%`}  sub={`${approved} approved`} color={compliancePct >= 80 ? '#059669' : '#d97706'} icon="✅" />
        <StatCard label="Pending Evidence"      value={pending}              sub="need attention"         color="#d97706" icon="⏳" />
        <StatCard label="Open Findings"         value={openFindings}         sub={criticalFindings > 0 ? `${criticalFindings} CRITICAL` : 'no critical'} color={openFindings > 0 ? '#dc2626' : '#059669'} icon="⚠️" />
        {dupCount > 0 && <StatCard label="Duplicates Found"  value={dupCount}             sub="from last analysis"     color="#7c3aed" icon="🔁" />}
        {varAlerts.length > 0 && <StatCard label="Budget Alerts"    value={varAlerts.length}     sub="variance > threshold"   color="#ea580c" icon="📉" />}
      </div>

      {/* Analysis Result Banners */}
      {analysisResult && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Duplicate Detection Result */}
          <div style={{ backgroundColor: dupCount > 0 ? '#fef3c7' : '#f0fdf4', border: `1px solid ${dupCount > 0 ? '#fcd34d' : '#86efac'}`, borderRadius: '0.625rem', padding: '1rem' }}>
            <div style={{ fontWeight: '700', fontSize: '0.875rem', color: dupCount > 0 ? '#92400e' : '#065f46', marginBottom: '0.5rem' }}>
              {dupCount > 0 ? '⚠️' : '✅'} Duplicate Detection
            </div>
            {dupCount > 0 ? (
              <>
                <div style={{ fontSize: '0.82rem', color: '#92400e', marginBottom: '0.4rem' }}>{dupCount} potential duplicate(s) found</div>
                {dupParsed.duplicates?.slice(0, 3).map((d, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#78350f', backgroundColor: '#fef3c7', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', marginBottom: '0.2rem' }}>
                    {d.original} ↔ {d.duplicate}
                  </div>
                ))}
              </>
            ) : <div style={{ fontSize: '0.82rem', color: '#065f46' }}>No duplicate transactions detected. ✓</div>}
          </div>

          {/* Budget Variance Result */}
          <div style={{ backgroundColor: varAlerts.length > 0 ? '#fef3c7' : '#f0fdf4', border: `1px solid ${varAlerts.length > 0 ? '#fcd34d' : '#86efac'}`, borderRadius: '0.625rem', padding: '1rem' }}>
            <div style={{ fontWeight: '700', fontSize: '0.875rem', color: varAlerts.length > 0 ? '#92400e' : '#065f46', marginBottom: '0.5rem' }}>
              {varAlerts.length > 0 ? '📉' : '✅'} Budget Variance
            </div>
            {varAlerts.length > 0 ? (
              <>
                <div style={{ fontSize: '0.82rem', color: '#92400e', marginBottom: '0.4rem' }}>{varAlerts.length} category variance alert(s)</div>
                {varAlerts.slice(0, 4).map((a, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#78350f', backgroundColor: '#fef3c7', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.category}</span>
                    <span style={{ fontWeight: '700', color: a.variance_pct > 0 ? '#dc2626' : '#059669' }}>{a.variance_pct > 0 ? '+' : ''}{a.variance_pct?.toFixed(1)}%</span>
                  </div>
                ))}
              </>
            ) : <div style={{ fontSize: '0.82rem', color: '#065f46' }}>All categories within budget threshold. ✓</div>}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Compliance Gauge */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="#2563eb" /> Compliance Score
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart innerRadius="60%" outerRadius="90%" data={complianceGauge} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f3f4f6' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: '-1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: compliancePct >= 80 ? '#16a34a' : compliancePct >= 50 ? '#d97706' : '#dc2626' }}>{compliancePct}%</div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>of transactions approved</div>
          </div>
        </div>

        {/* Status Distribution */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#111827' }}>Transaction Status</div>
          {statusData.length === 0
            ? <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '3rem' }}>No data</div>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>}
        </div>

        {/* Monthly Volume */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gridColumn: monthlyData.length > 0 ? '1 / -1' : 'auto' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="#10b981" /> Monthly Transaction Volume
          </div>
          {monthlyData.length === 0
            ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No monthly data available</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']} />
                  <Legend />
                  <Bar dataKey="debit"  name="Debit"  fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="credit" name="Credit" fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>}
        </div>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#111827' }}>Spend by Category</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#2563eb" radius={[0,3,3,0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Findings by Severity */}
        {severityData.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} color="#dc2626" /> Findings by Severity
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Findings" radius={[4,4,0,0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={
                      entry.name === 'CRITICAL' ? '#7f1d1d'
                      : entry.name === 'HIGH' ? '#dc2626'
                      : entry.name === 'MEDIUM' ? '#d97706'
                      : '#16a34a'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <AiInsightsPanel insights={aiInsights} loading={insightsLoading} error={insightsError} />
    </div>
  );
}

// ── Projects Table ────────────────────────────────────────────────────────────
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
          Select a project to run AI-powered audit analysis, view compliance charts, and get improvement recommendations.
        </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
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
              <th style={thStyle}>Audit Status</th>
              <th style={thStyle}>Compliance Score</th>
              <th style={thStyle}>Transactions</th>
              <th style={thStyle}>Analyze</th>
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
              const score   = Math.round(p.complianceScore || 0);
              const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
              const auditColors = {
                DRAFT: { bg: '#f3f4f6', text: '#6b7280' }, IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
                UNDER_REVIEW: { bg: '#fef3c7', text: '#92400e' }, SIGNED_OFF: { bg: '#d1fae5', text: '#065f46' },
                CLOSED: { bg: '#e5e7eb', text: '#374151' }, COMPLIANT: { bg: '#d1fae5', text: '#065f46' },
              };
              const ac = auditColors[p.auditStatus] || { bg: '#f3f4f6', text: '#6b7280' };
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                  </td>
                  <td style={tdStyle}>
                    <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>{p.projectCode || '—'}</code>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: ac.bg, color: ac.text }}>
                      {p.auditStatus || 'DRAFT'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', minWidth: '60px' }}>
                        <div style={{ height: '100%', width: `${score}%`, backgroundColor: scoreColor, borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: scoreColor }}>{score}%</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: txCount > 0 ? '#2563eb' : '#9ca3af' }}>{txCount}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onSelect(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.875rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>
                      <Play size={12} /> Analyze
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

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ConductAuditAnalysis() {
  const [projects, setProjects]           = useState([]);
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
    return <AnalysisDashboard project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return <ProjectsTable projects={projects} transactions={allTransactions} onSelect={setSelectedProject} />;
}
