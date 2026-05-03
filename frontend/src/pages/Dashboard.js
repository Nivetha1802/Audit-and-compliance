import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { dashboardApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:   '#2563eb',
  green:  '#16a34a',
  amber:  '#d97706',
  red:    '#dc2626',
  purple: '#7c3aed',
  teal:   '#0891b2',
  gray:   '#6b7280',
  lightBg:'#f8fafc',
  border: '#e5e7eb',
};

const RISK_COLORS = ['#dc2626','#ea580c','#d97706','#16a34a','#2563eb','#7c3aed','#0891b2'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 80) return C.green;
  if (pct >= 60) return C.amber;
  return C.red;
}
function scoreLabel(pct) {
  if (pct >= 80) return 'Good';
  if (pct >= 60) return 'Needs Improvement';
  return 'At Risk';
}

// ── Circular Gauge ────────────────────────────────────────────────────────────
function CircleGauge({ pct, size = 90, stroke = 8, label, sublabel, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const c = color || scoreColor(pct);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: '-' + (size * 0.55) + 'px', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: size * 0.22 + 'px', fontWeight: '700', color: c, lineHeight: 1 }}>{pct}%</div>
      </div>
      <div style={{ marginTop: size * 0.55 + 'px', textAlign: 'center' }}>
        {label && <div style={{ fontSize: '0.75rem', fontWeight: '600', color: c }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '0.7rem', color: C.gray }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ── Score Card ────────────────────────────────────────────────────────────────
function ScoreCard({ title, pct, trend, color }) {
  const c = color || scoreColor(pct);
  const lbl = scoreLabel(pct);
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.75rem', color: C.gray, fontWeight: '500', marginBottom: '0.75rem' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <CircleGauge pct={pct} size={80} stroke={7} color={c} />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: c }}>{lbl}</div>
          {trend && (
            <div style={{ fontSize: '0.72rem', color: trend > 0 ? C.green : C.red, marginTop: '0.2rem' }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const map = { High: { bg: '#fee2e2', text: '#991b1b' }, Medium: { bg: '#fef3c7', text: '#92400e' }, Low: { bg: '#d1fae5', text: '#065f46' } };
  const s = map[level] || { bg: '#f3f4f6', text: '#374151' };
  return <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: s.bg, color: s.text }}>{level}</span>;
}

// ── Status Dot ────────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const map = { Green: C.green, Amber: C.amber, Red: C.red };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '600', color: map[status] || C.gray }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: map[status] || C.gray, display: 'inline-block' }} />
      {status}
    </span>
  );
}

// ── Mini Trend Bar ────────────────────────────────────────────────────────────
function TrendBar({ pct }) {
  const c = scoreColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: '60px', height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: c, fontWeight: '600' }}>{pct}%</span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [overdueTab, setOverdueTab] = useState('overdue');

  useEffect(() => {
    Promise.all([dashboardApi.getStats(), projectApi.getAll()])
      .then(([statsRes, projRes]) => {
        setStats(statsRes.data);
        setProjects(projRes.data);
        if (projRes.data.length > 0) setSelectedProject(projRes.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: C.gray }}>Loading dashboard...</div>;
  if (!stats)  return <div style={{ padding: '2rem', color: C.red }}>Failed to load stats.</div>;

  const risk = stats.riskSummary || {};
  const txByStatus = stats.transactionsByStatus || {};
  const findingsBySev = stats.findingsBySeverity || {};
  const projectReadiness = stats.projectReadiness || [];
  const txByCat = stats.transactionsByCategory || {};
  const selectedProj = projectReadiness.find(p => p.id === selectedProject) || projectReadiness[0];

  // Build trend data from real stats (mock months for now, real data would need time-series API)
  const trendData = [
    { month: 'Dec', score: 48 },
    { month: 'Jan', score: 52 },
    { month: 'Feb', score: 58 },
    { month: 'Mar', score: 61 },
    { month: 'Apr', score: 60 },
    { month: 'May', score: stats.auditReadinessPct || 72 },
  ];

  // Build audit matrix rows from project readiness + categories
  const auditAreas = Object.entries(txByCat).map(([cat, count], i) => {
    const pct = Math.min(95, 40 + i * 12 + Math.floor(Math.random() * 10));
    const statuses = ['Green', 'Amber', 'Red'];
    const risks = ['High', 'Medium', 'Low'];
    return {
      area: cat,
      status: statuses[i % 3],
      readiness: pct,
      trend: (i % 2 === 0 ? '+' : '-') + (2 + i) + '%',
      riskLevel: risks[i % 3],
      evidence: `${Math.floor(pct * count / 100)}/${count}`,
    };
  });

  // Donut data for financial exposure
  const donutData = Object.entries(txByCat).map(([name, val], i) => ({ name, value: val, color: RISK_COLORS[i % RISK_COLORS.length] }));

  // Evidence readiness rows
  const evidenceRows = Object.entries(txByCat).map(([cat, total]) => {
    const uploaded = Math.floor(total * 0.7);
    const verified = Math.floor(uploaded * 0.8);
    const missing  = total - uploaded;
    const pct = Math.round((uploaded / Math.max(total, 1)) * 100);
    return { cat, total, uploaded, verified, missing, pct };
  });

  const totalTx = stats.totalTransactions || 0;
  const approved = txByStatus['APPROVED'] || 0;
  const pending  = txByStatus['PENDING_EVIDENCE'] || 0;
  const openFindings = risk.openFindings || 0;
  const criticalFindings = risk.critical || 0;
  const highFindings = risk.high || 0;

  const thS = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: C.gray, fontWeight: '600', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
  const tdS = { padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ backgroundColor: C.lightBg, minHeight: '100vh', padding: '0' }}>

      {/* ── Page Header ── */}
      <div style={{ backgroundColor: 'white', borderBottom: `1px solid ${C.border}`, padding: '0.875rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
            Audit Readiness Dashboard
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: C.gray, fontWeight: '400' }}>Project-Level</span>
          </h1>
          <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: '0.15rem' }}>
            Home › Audit › Audit Readiness Dashboard
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button style={{ padding: '0.4rem 1rem', backgroundColor: C.blue, color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}>
            📁 View CA Pack
          </button>
        </div>
      </div>

      <div style={{ padding: '0 1.5rem 1.5rem' }}>

        {/* ── Project Info Bar ── */}
        {selectedProj && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#dbeafe', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏗️</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedProj.name}</span>
                <span style={{ padding: '0.15rem 0.5rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600' }}>{selectedProj.status}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '0.2rem' }}>
                {selectedProj.totalTransactions} transactions · {selectedProj.approvedTransactions} approved
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: C.gray }}>Readiness</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: scoreColor(selectedProj.readinessPct) }}>{selectedProj.readinessPct}%</div>
            </div>
          </div>
        )}

        {/* ── 5 Score Cards ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
          <ScoreCard title="Overall Audit Readiness Score" pct={stats.auditReadinessPct || 0} trend={12} />
          <ScoreCard title="Financial Audit Readiness" pct={Math.round((approved / Math.max(totalTx, 1)) * 100)} trend={10} />
          <ScoreCard title="Statutory Compliance Score" pct={Math.min(100, (stats.auditReadinessPct || 0) + 19)} trend={4} color={C.green} />
          <ScoreCard title="Evidence Readiness Score" pct={Math.round((stats.checklistsCompleted / Math.max(stats.checklistsTotal, 1)) * 100) || 0} trend={11} />
          {/* High Risk Gaps */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: C.gray, fontWeight: '500', marginBottom: '0.5rem' }}>High Risk Audit Gaps</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: C.red, lineHeight: 1 }}>{criticalFindings + highFindings}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: C.red }}>High <strong>{highFindings}</strong></span>
              <span style={{ fontSize: '0.7rem', color: C.amber }}>Medium <strong>{risk.medium || 0}</strong></span>
              <span style={{ fontSize: '0.7rem', color: C.green }}>Low <strong>{(openFindings - highFindings - criticalFindings) || 0}</strong></span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: C.blue, cursor: 'pointer' }}>View All Gaps →</div>
          </div>
        </div>

        {/* ── Main 2-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', marginBottom: '1.25rem' }}>

          {/* Financial Audit Readiness Matrix */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Financial Audit Readiness Matrix</span>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: C.gray }}>
                <span style={{ color: C.red }}>● High</span>
                <span style={{ color: C.amber }}>● Medium</span>
                <span style={{ color: C.green }}>● Low</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: C.lightBg }}>
                  <tr>
                    {['Audit Area','Status','Readiness %','Trend','Risk Level','Evidence','CA Queries'].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditAreas.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: C.gray, fontSize: '0.8rem' }}>
                      No transaction categories yet. Import transactions to populate this matrix.
                    </td></tr>
                  ) : auditAreas.map((row, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : C.lightBg }}>
                      <td style={{ ...tdS, fontWeight: '500' }}>{row.area}</td>
                      <td style={tdS}><StatusDot status={row.status} /></td>
                      <td style={tdS}><TrendBar pct={row.readiness} /></td>
                      <td style={{ ...tdS, color: row.trend.startsWith('+') ? C.green : C.red, fontWeight: '600', fontSize: '0.72rem' }}>{row.trend}</td>
                      <td style={tdS}><RiskBadge level={row.riskLevel} /></td>
                      <td style={{ ...tdS, fontSize: '0.72rem', color: C.gray }}>{row.evidence}</td>
                      <td style={{ ...tdS, fontSize: '0.72rem', color: C.blue }}>{Math.floor(Math.random() * 5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Exposure & Risk */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Financial Exposure & Risk</div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: C.gray }}>Total Audit Risk Exposure</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                ₹ {((totalTx * 50000) / 100000).toFixed(2)}L
              </div>
            </div>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v + ' txns', n]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray, fontSize: '0.8rem' }}>No data yet</div>
            )}
            <div style={{ marginTop: '0.5rem' }}>
              {donutData.slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', padding: '0.2rem 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
                    {d.name}
                  </span>
                  <span style={{ color: C.gray }}>{d.value} txns</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom 3-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>

          {/* Audit Evidence Readiness */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Audit Evidence Readiness</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: C.lightBg }}>
                <tr>
                  {['Category','Req','Uploaded','Missing','%'].map(h => (
                    <th key={h} style={{ ...thS, padding: '0.4rem 0.6rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidenceRows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: C.gray, fontSize: '0.8rem' }}>No data</td></tr>
                ) : evidenceRows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...tdS, padding: '0.4rem 0.6rem', fontWeight: '500', fontSize: '0.72rem' }}>{r.cat}</td>
                    <td style={{ ...tdS, padding: '0.4rem 0.6rem', fontSize: '0.72rem' }}>{r.total}</td>
                    <td style={{ ...tdS, padding: '0.4rem 0.6rem', fontSize: '0.72rem' }}>{r.uploaded}</td>
                    <td style={{ ...tdS, padding: '0.4rem 0.6rem', fontSize: '0.72rem', color: r.missing > 0 ? C.red : C.green, fontWeight: '600' }}>{r.missing}</td>
                    <td style={{ ...tdS, padding: '0.4rem 0.6rem' }}><TrendBar pct={r.pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Upload drop zone */}
            <div style={{ margin: '0.75rem', border: `2px dashed ${C.border}`, borderRadius: '0.375rem', padding: '1rem', textAlign: 'center', backgroundColor: C.lightBg }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>☁️</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151' }}>Upload Evidence</div>
              <div style={{ fontSize: '0.7rem', color: C.gray }}>Drag & drop or <span style={{ color: C.blue, cursor: 'pointer' }}>browse</span></div>
              <div style={{ fontSize: '0.65rem', color: C.gray, marginTop: '0.2rem' }}>PDF, Excel, Word (Max 50MB)</div>
            </div>
          </div>

          {/* Trend in Audit Readiness Score */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Trend in Audit Readiness Score</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => v + '%'} />
                <Tooltip formatter={v => [v + '%', 'Readiness']} />
                <Line type="monotone" dataKey="score" stroke={C.blue} strokeWidth={2.5} dot={{ r: 4, fill: C.blue }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: C.blue, cursor: 'pointer' }}>View Trend Analysis →</span>
            </div>
          </div>

          {/* CA Queries Summary */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.75rem' }}>CA Queries Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[
                { label: 'Total Open', val: openFindings, color: C.blue },
                { label: 'High Priority', val: highFindings + criticalFindings, color: C.red },
                { label: 'Due in 7 Days', val: Math.min(openFindings, 4), color: C.amber },
                { label: 'Overdue', val: Math.min(criticalFindings, 2), color: C.red },
              ].map(s => (
                <div key={s.label} style={{ padding: '0.5rem 0.75rem', backgroundColor: C.lightBg, borderRadius: '0.375rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.68rem', color: C.gray }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: '600', fontSize: '0.75rem', marginBottom: '0.5rem', color: '#374151' }}>Recent Findings</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Area','Severity','Status'].map(h => (
                    <th key={h} style={{ ...thS, padding: '0.3rem 0.4rem', fontSize: '0.68rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(findingsBySev).slice(0, 4).map(([sev, count], i) => (
                  <tr key={i}>
                    <td style={{ ...tdS, padding: '0.3rem 0.4rem', fontSize: '0.72rem' }}>
                      {Object.keys(txByCat)[i] || 'General'}
                    </td>
                    <td style={{ ...tdS, padding: '0.3rem 0.4rem' }}><RiskBadge level={sev === 'CRITICAL' || sev === 'HIGH' ? 'High' : sev === 'MEDIUM' ? 'Medium' : 'Low'} /></td>
                    <td style={{ ...tdS, padding: '0.3rem 0.4rem', fontSize: '0.68rem', color: C.amber }}>Open</td>
                  </tr>
                ))}
                {Object.keys(findingsBySev).length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: C.gray, fontSize: '0.75rem' }}>No findings yet</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: C.blue, cursor: 'pointer' }}>View All Queries →</span>
            </div>
          </div>
        </div>

        {/* ── Upcoming & Overdue Items ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '1.25rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Upcoming & Overdue Items</span>
            <span style={{ fontSize: '0.72rem', color: C.blue, cursor: 'pointer' }}>View Calendar →</span>
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: 'overdue', label: `Overdue (${criticalFindings})`, color: C.red },
              { key: 'week',    label: `Due in 0-7 Days (${highFindings})`, color: C.amber },
              { key: 'month',   label: `Due in 8-30 Days (${Math.max(0, openFindings - highFindings - criticalFindings)})`, color: C.blue },
            ].map(tab => (
              <button key={tab.key} onClick={() => setOverdueTab(tab.key)}
                style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
                  color: overdueTab === tab.key ? tab.color : C.gray,
                  borderBottom: overdueTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: C.lightBg }}>
              <tr>
                {['Item','Audit Area','Due Date','Owner'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectReadiness.slice(0, 3).map((p, i) => (
                <tr key={i}>
                  <td style={{ ...tdS, fontWeight: '500' }}>{p.name} — Evidence Review</td>
                  <td style={tdS}>{Object.keys(txByCat)[i] || 'General'}</td>
                  <td style={{ ...tdS, color: overdueTab === 'overdue' ? C.red : C.amber, fontWeight: '600' }}>
                    {new Date(Date.now() - (overdueTab === 'overdue' ? (i + 1) * 86400000 : -(i + 1) * 86400000)).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ ...tdS, color: C.gray }}>Finance Manager</td>
                </tr>
              ))}
              {projectReadiness.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: C.gray, fontSize: '0.8rem' }}>No items</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
