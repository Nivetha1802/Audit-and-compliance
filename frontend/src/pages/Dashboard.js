import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Info, ChevronDown, Download, Bell, HelpCircle, LayoutDashboard, 
  Building2, FileText, CheckCircle2, AlertCircle, Clock, 
  TrendingUp, TrendingDown, ArrowRight, Calendar, User, Search, Filter,
  MoreVertical, Share2, Printer, ExternalLink, MapPin, Briefcase
} from 'lucide-react';

const COLORS = {
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  indigo: '#4f46e5',
  gray: '#64748b',
  lightGray: '#f1f5f9',
  border: '#e2e8f0',
  white: '#ffffff',
  bg: '#f8fafc'
};

const RISK_PIE_DATA = [
  { name: 'Revenue Recognition', value: 45, color: '#f59e0b', amount: '₹ 1.10 Cr' },
  { name: 'GST Reconciliation', value: 25, color: '#ef4444', amount: '₹ 0.61 Cr' },
  { name: 'WIP / Costing', value: 15, color: '#3b82f6', amount: '₹ 0.37 Cr' },
  { name: 'Others', value: 15, color: '#10b981', amount: '₹ 0.37 Cr' }
];

const TREND_DATA = [
  { month: 'Dec', score: 48 },
  { month: 'Jan', score: 52 },
  { month: 'Feb', score: 58 },
  { month: 'Mar', score: 61 },
  { month: 'Apr', score: 60 },
  { month: 'May', score: 72 },
];

const MATRIX_DATA = [
  { area: 'Revenue Recognition', status: 'Amber', readiness: 65, trend: '+10%', owner: 'Finance Manager', evidence: 'Partial (12/18)', risk: 'High', queries: 2, lastReviewed: '15-May-2025', dueDate: '25-May-2025', dueStatus: 'overdue' },
  { area: 'GST Reconciliation', status: 'Red', readiness: 45, trend: '+5%', owner: 'Project Accountant', evidence: 'Missing (4/12)', risk: 'High', queries: 3, lastReviewed: '12-May-2025', dueDate: '20-May-2025', dueStatus: 'overdue' },
  { area: 'TDS Compliance', status: 'Green', readiness: 95, trend: '+2%', owner: 'Finance Executive', evidence: 'Complete (10/10)', risk: 'Low', queries: 0, lastReviewed: '20-May-2025', dueDate: '31-May-2025', dueStatus: 'on-time' },
  { area: 'Bank Reconciliation', status: 'Amber', readiness: 70, trend: '+8%', owner: 'Accounts Team', evidence: 'Partial (6/8)', risk: 'Medium', queries: 1, lastReviewed: '10-May-2025', dueDate: '18-May-2025', dueStatus: 'overdue' },
  { area: 'WIP / Project Costing', status: 'Amber', readiness: 60, trend: '+12%', owner: 'Project Finance', evidence: 'Partial (11/20)', risk: 'Medium', queries: 2, lastReviewed: '08-May-2025', dueDate: '22-May-2025', dueStatus: 'overdue' },
  { area: 'Receivables & Collections', status: 'Amber', readiness: 62, trend: '+5%', owner: 'Accounts Team', evidence: 'Partial (8/14)', risk: 'Medium', queries: 1, lastReviewed: '09-May-2025', dueDate: '21-May-2025', dueStatus: 'overdue' },
  { area: 'Payables & Vendors', status: 'Green', readiness: 85, trend: '-', owner: 'Accounts Payable', evidence: 'Complete (12/12)', risk: 'Low', queries: 0, lastReviewed: '18-May-2025', dueDate: '25-May-2025', dueStatus: 'on-time' },
  { area: 'Fixed Assets', status: 'Green', readiness: 90, trend: '+3%', owner: 'Asset Accountant', evidence: 'Complete (9/9)', risk: 'Low', queries: 0, lastReviewed: '16-May-2025', dueDate: '30-May-2025', dueStatus: 'on-time' },
  { area: 'Loans & Borrowings', status: 'Amber', readiness: 75, trend: '+6%', owner: 'Finance Executive', evidence: 'Partial (6/8)', risk: 'Medium', queries: 1, lastReviewed: '14-May-2025', dueDate: '23-May-2025', dueStatus: 'overdue' },
  { area: 'Provisions & Contingencies', status: 'Red', readiness: 40, trend: '+2%', owner: 'Finance Manager', evidence: 'Missing (3/10)', risk: 'High', queries: 2, lastReviewed: '07-May-2025', dueDate: '19-May-2025', dueStatus: 'overdue' },
  { area: 'Related Party Transactions', status: 'Green', readiness: 90, trend: '+10%', owner: 'Company Secretary', evidence: 'Complete (7/7)', risk: 'Low', queries: 0, lastReviewed: '15-May-2025', dueDate: '31-May-2025', dueStatus: 'on-time' },
  { area: 'Financial Statements & Notes', status: 'Amber', readiness: 60, trend: '+15%', owner: 'Finance Manager', evidence: 'Partial (9/15)', risk: 'High', queries: 3, lastReviewed: '09-May-2025', dueDate: '28-May-2025', dueStatus: 'overdue' },
];

const EVIDENCE_DATA = [
  { category: 'Revenue Evidence', required: 20, uploaded: 15, verified: 12, missing: 5, readiness: 60 },
  { category: 'GST Evidence', required: 12, uploaded: 10, verified: 8, missing: 2, readiness: 67 },
  { category: 'Banking Evidence', required: 8, uploaded: 6, verified: 6, missing: 2, readiness: 75 },
  { category: 'WIP / Costing Evidence', required: 18, uploaded: 11, verified: 9, missing: 7, readiness: 50 },
  { category: 'TDS Evidence', required: 10, uploaded: 9, verified: 8, missing: 1, readiness: 80 },
  { category: 'Others', required: 14, uploaded: 10, verified: 7, missing: 4, readiness: 57 },
];

const RECENT_QUERIES = [
  { query: 'Revenue on Hold Invoices', area: 'Revenue Recognition', raisedOn: '15-May-2025', dueDate: '22-May-2025', status: 'Open' },
  { query: 'GST ITC Mismatch', area: 'GST Reconciliation', raisedOn: '14-May-2025', dueDate: '20-May-2025', status: 'In Progress' },
  { query: 'Unreconciled Bank Txn', area: 'Bank Reconciliation', raisedOn: '13-May-2025', dueDate: '19-May-2025', status: 'Open' },
];

const OVERDUE_ITEMS = [
  { item: 'GST Reconciliation – Mar 25', area: 'GST Reconciliation', dueDate: '20-May-2025', owner: 'Project Accountant' },
  { item: 'Revenue Working – Apr 25', area: 'Revenue Recognition', dueDate: '21-May-2025', owner: 'Finance Manager' },
  { item: 'WIP Cost Sheet – Apr 25', area: 'WIP / Project Costing', dueDate: '22-May-2025', owner: 'Project Finance' },
];

const GaugeCircle = ({ percentage, color, label, sublabel }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            className="text-slate-100"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="40"
            cy="40"
          />
          <circle
            strokeWidth="6"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            stroke={color}
            fill="transparent"
            r={radius}
            cx="40"
            cy="40"
          />
        </svg>
        <span className="absolute text-lg font-bold text-slate-800">{percentage}%</span>
      </div>
      <div className="mt-2 text-center">
        <div className="text-[11px] font-bold" style={{ color }}>{label}</div>
        <div className="text-[9px] text-slate-400 mt-0.5">{sublabel}</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-700 font-sans">
      
      {/* Header Info Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-900">Audit Readiness Dashboard (Project-Level)</h1>
          <Info className="w-4 h-4 text-slate-300 cursor-pointer" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-sm shadow-sm">
            <span className="text-slate-600 font-medium">May 2025</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <button className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-sm shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Project Info Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            🏢
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold text-slate-900">Sun Vista – Phase I</h2>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Ongoing</span>
            </div>
            <div className="flex items-center text-[11px] text-slate-400 space-x-4 mt-1">
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-500">Project Code:</span>
                <span>SR-PRJ-001</span>
              </div>
              <div className="flex items-center space-x-1 border-l border-slate-200 pl-4">
                <MapPin className="w-3 h-3" />
                <span className="font-semibold text-slate-500">Location:</span>
                <span>Chennai, Tamil Nadu</span>
              </div>
              <div className="flex items-center space-x-1 border-l border-slate-200 pl-4">
                <Briefcase className="w-3 h-3" />
                <span className="font-semibold text-slate-500">Project Type:</span>
                <span>Residential</span>
              </div>
              <a href="#" className="text-blue-600 font-semibold flex items-center space-x-0.5 border-l border-slate-200 pl-4 hover:underline">
                <span>View Project Details</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-400 font-medium">Compare with:</span>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-4 min-w-[160px] justify-between cursor-pointer shadow-sm hover:border-slate-300">
              <span className="text-slate-400">Select Project</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <button className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center space-x-2 text-sm font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all active:transform active:scale-95">
            <FileText className="w-4 h-4" />
            <span>View CA Pack</span>
          </button>
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Overall Audit Readiness Score', percentage: 72, color: COLORS.blue, status: 'Good', trend: '↑ 12% vs Apr 2025' },
          { label: 'Financial Audit Readiness', percentage: 68, color: COLORS.amber, status: 'Needs Improvement', trend: '↑ 10% vs Apr 2025' },
          { label: 'Statutory Compliance Score', percentage: 91, color: COLORS.green, status: 'Excellent', trend: '↑ 4% vs Apr 2025' },
          { label: 'Evidence Readiness Score', percentage: 74, color: COLORS.green, status: 'Good', trend: '↑ 11% vs Apr 2025' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
              <Info className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <GaugeCircle percentage={card.percentage} color={card.color} label={card.status} sublabel={card.trend} />
          </div>
        ))}
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">High Risk Audit Gaps</span>
          </div>
          <div className="text-4xl font-black text-red-600 mt-2">7</div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">High</span>
              <span className="text-sm font-bold text-red-600">3</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Medium</span>
              <span className="text-sm font-bold text-amber-600">3</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Low</span>
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-blue-600 text-[11px] font-bold cursor-pointer group">
            <span className="group-hover:underline">View All Gaps</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Grid: Matrix and Risk */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Readiness Matrix */}
        <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Financial Audit Readiness Matrix</h3>
              <Info className="w-4 h-4 text-slate-200" />
            </div>
            <div className="flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center space-x-1.5 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span>High</span>
              </div>
              <div className="flex items-center space-x-1.5 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>Medium</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Low</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-4">
            <div className="relative flex-1">
              <select className="appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs w-full font-semibold text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none">
                <option>All Audit Areas</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select className="appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs w-full font-semibold text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none">
                <option>All Status</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select className="appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs w-full font-semibold text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none">
                <option>All Owners</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
            <button className="flex items-center justify-center space-x-2 border border-slate-200 bg-white rounded-lg px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3">Audit Area</th>
                  <th className="px-2 py-3 text-center">Status</th>
                  <th className="px-2 py-3">Readiness %</th>
                  <th className="px-2 py-3 text-center">Trend</th>
                  <th className="px-2 py-3">Owner</th>
                  <th className="px-2 py-3">Evidence</th>
                  <th className="px-2 py-3 text-center">Risk</th>
                  <th className="px-2 py-3 text-center">Queries</th>
                  <th className="px-5 py-3 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MATRIX_DATA.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs">📄</div>
                        <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{row.area}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tight ${
                        row.status === 'Green' ? 'bg-emerald-50 text-emerald-600' :
                        row.status === 'Amber' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-2 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            row.readiness > 80 ? 'bg-emerald-500' : row.readiness > 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${row.readiness}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{row.readiness}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <span className={`text-[10px] font-bold ${row.trend === '-' ? 'text-slate-300' : 'text-emerald-500'}`}>
                        {row.trend}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-[10px] font-semibold text-slate-500">{row.owner}</td>
                    <td className="px-2 py-3.5">
                      <span className={`text-[10px] font-bold ${
                        row.evidence.includes('Complete') ? 'text-emerald-600' :
                        row.evidence.includes('Partial') ? 'text-amber-600' : 'text-red-600'
                      }`}>{row.evidence}</span>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <span className={`text-[10px] font-bold ${
                        row.risk === 'High' ? 'text-red-600' : row.risk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>{row.risk}</span>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <span className="text-[10px] font-bold text-blue-600 underline cursor-pointer">{row.queries}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-700">{row.dueDate}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-tighter ${row.dueStatus === 'overdue' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {row.dueStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>Showing 1 to 12 of 12 entries</span>
            <button className="text-blue-600 font-bold hover:underline flex items-center space-x-1">
              <span>View Full Matrix</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Column: Exposure & Items */}
        <div className="col-span-4 flex flex-col space-y-6">
          {/* Financial Exposure */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-800 text-sm">Financial Exposure & Risk</h3>
                <Info className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <button className="text-[10px] font-bold text-blue-600 hover:underline">View Details →</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Total Audit Risk Exposure</div>
                <div className="text-sm font-black text-slate-900">₹ 2,45,00,000</div>
              </div>
              <div className="bg-red-50/50 p-3 rounded-lg border border-red-50">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Potential Misstatement Risk</div>
                <div className="text-sm font-black text-red-600">₹ 1,15,00,000</div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold text-slate-700 w-full mb-2">Risk by Audit Area (₹)</div>
              <div className="w-full flex items-center space-x-6">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={RISK_PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {RISK_PIE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[68%] left-[28%] text-center pointer-events-none">
                    <div className="text-xs font-black text-slate-800">₹ 2.45 Cr</div>
                  </div>
                </div>
                <div className="w-1/2 space-y-3">
                  {RISK_PIE_DATA.map((item, i) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-[10px] font-bold text-slate-500 truncate">{item.name}</span>
                      </div>
                      <div className="flex justify-between items-center pl-4 mt-0.5">
                        <span className="text-[10px] font-black text-slate-800">{item.value}%</span>
                        <span className="text-[9px] font-semibold text-slate-400">{item.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming & Overdue Items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 text-sm">Upcoming & Overdue Items</h3>
              <button className="text-[10px] font-bold text-blue-600 hover:underline">View Calendar →</button>
            </div>
            
            <div className="flex border-b border-slate-100 mb-4">
              <button className="px-3 py-2 text-[10px] font-bold text-red-600 border-b-2 border-red-600">Overdue (3)</button>
              <button className="px-3 py-2 text-[10px] font-bold text-slate-400">Due in 0-7 Days (2)</button>
              <button className="px-3 py-2 text-[10px] font-bold text-slate-400">Due in 8-30 Days (4)</button>
            </div>

            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                <div className="col-span-2">Item</div>
                <div>Due Date</div>
                <div className="text-right">Owner</div>
              </div>
              <div className="space-y-2 overflow-auto max-h-[180px]">
                {OVERDUE_ITEMS.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 items-center bg-slate-50/50 rounded-lg p-2.5 border border-slate-50">
                    <div className="col-span-2">
                      <div className="text-[10px] font-bold text-slate-800">{item.item}</div>
                      <div className="text-[8px] font-semibold text-slate-400 uppercase">{item.area}</div>
                    </div>
                    <div className="text-[10px] font-black text-red-500">{item.dueDate}</div>
                    <div className="text-[9px] font-bold text-slate-600 text-right">{item.owner.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="mt-6 w-full py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-slate-100 transition-colors uppercase tracking-wider">View All Items</button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Evidence Readiness, Trend, CA Queries */}
      <div className="grid grid-cols-12 gap-6">
        {/* Audit Evidence Readiness */}
        <div className="col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Audit Evidence Readiness</h3>
            <Info className="w-3.5 h-3.5 text-slate-200" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="py-2">Evidence Category</th>
                  <th className="py-2 text-center">Req</th>
                  <th className="py-2 text-center">Upld</th>
                  <th className="py-2 text-center">Veri</th>
                  <th className="py-2 text-center text-red-500">Miss</th>
                  <th className="py-2 text-right">Readiness %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {EVIDENCE_DATA.map((row, i) => (
                  <tr key={i} className="text-[10px] font-bold text-slate-700">
                    <td className="py-3 text-slate-500">{row.category}</td>
                    <td className="py-3 text-center">{row.required}</td>
                    <td className="py-3 text-center">{row.uploaded}</td>
                    <td className="py-3 text-center">{row.verified}</td>
                    <td className="py-3 text-center text-red-500">{row.missing}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.readiness}%` }}></div>
                        </div>
                        <span className="w-6 text-right text-slate-600">{row.readiness}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Trend in Audit Readiness Score</h3>
            <Info className="w-3.5 h-3.5 text-slate-200" />
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-center">
            <button className="text-blue-600 font-extrabold text-[10px] uppercase tracking-widest hover:underline">View Trend Analysis →</button>
          </div>
        </div>

        {/* CA Queries Summary */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-800 text-sm">CA Queries Summary</h3>
              <Info className="w-3.5 h-3.5 text-slate-200" />
            </div>
            <button className="text-[10px] font-bold text-blue-600 hover:underline">View All →</button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total Open</div>
              <div className="text-xl font-black text-blue-600">9</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">High Priority</div>
              <div className="text-xl font-black text-red-600">3</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Due 0-7 Days</div>
              <div className="text-xl font-black text-amber-600">4</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Overdue</div>
              <div className="text-xl font-black text-red-600">2</div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="text-[10px] font-black text-slate-700 uppercase tracking-tighter border-b border-slate-100 pb-2">Recent CA Queries</div>
            {RECENT_QUERIES.map((q, i) => (
              <div key={i} className="bg-slate-50/50 rounded-lg p-3 border border-slate-50">
                <div className="text-[10px] font-bold text-slate-800 mb-1">{q.query}</div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{q.area}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                    q.status === 'Open' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                  }`}>{q.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-slate-100 transition-colors uppercase tracking-wider">View All Queries</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
