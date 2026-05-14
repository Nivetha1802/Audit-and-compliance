import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi, evidenceApi, taskApi, userApi, riskApi, vendorsApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreVertical, 
  Eye, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ExternalLink,
  ChevronRight,
  Download,
  Plus,
  X,
  AlertTriangle,
  History,
  FileCheck,
  Building2,
  Trash2,
  RefreshCw,
  HelpCircle,
  FileSearch,
  Zap
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING_EVIDENCE: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
  UNDER_REVIEW:     { bg: '#dbeafe', text: '#1e40af', icon: <FileSearch size={14} /> },
  APPROVED:         { bg: '#d1fae5', text: '#065f46', icon: <CheckCircle2 size={14} /> },
  RAISED_RISK:      { bg: '#fee2e2', text: '#991b1b', icon: <AlertCircle size={14} /> },
  REJECTED:         { bg: '#fce7f3', text: '#9d174d', icon: <X size={14} /> },
};

function getCategoryColor(name) {
  const categories = {
    'Travel': '#3b82f6',
    'Supplies': '#10b981',
    'Software': '#8b5cf6',
    'Marketing': '#f59e0b',
    'Hardware': '#ef4444',
    'Utilities': '#6b7280',
    'Consulting': '#ec4899'
  };
  return categories[name] || '#94a3b8';
}

function EvidencePanel({ transaction, users, currentUser, onClose, onStatusChange, onVendorLinked }) {
  const [items, setItems] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');

  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskForm, setRiskForm] = useState({ title: '', description: '', severity: 'MEDIUM' });

  useEffect(() => { loadData(); }, [transaction.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, readinessRes, tasksRes, risksRes, vendorsRes] = await Promise.all([
        evidenceApi.getItems(transaction.id),
        evidenceApi.getReadiness(transaction.id),
        taskApi.getByTransaction(transaction.id),
        riskApi.getAll(),
        vendorsApi.getAll(),
      ]);
      setItems(itemsRes.data);
      setReadiness(readinessRes.data);
      setTasks(tasksRes.data);
      setRisks(risksRes.data.filter(f => f.projectId === transaction.projectId));
      setVendors(vendorsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRaiseRisk = async (e) => {
    e.preventDefault();
    try {
      await riskApi.create({ 
        ...riskForm, 
        projectId: transaction.projectId,
        status: 'OPEN' 
      });
      setShowRiskForm(false);
      setRiskForm({ title: '', description: '', severity: 'MEDIUM' });
      loadData();
      onStatusChange(transaction.id, 'RAISED_RISK');
    } catch { alert('Failed to raise risk'); }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await transactionApi.updateStatus(transaction.id, status);
      onStatusChange(transaction.id, status);
    } catch { alert('Failed to update status'); }
  };

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '480px', backgroundColor: 'white', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
       <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Transaction Detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
       </div>
       <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Transaction ID: {transaction.id.substring(0, 8)}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>{transaction.description}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb', marginTop: '8px' }}>₹{transaction.amount?.toLocaleString()}</div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
             {['items', 'risks', 'tasks'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 style={{ 
                   padding: '10px 16px', 
                   background: 'none', 
                   border: 'none', 
                   borderBottom: activeTab === tab ? '2px solid #2563eb' : 'none',
                   color: activeTab === tab ? '#2563eb' : '#64748b',
                   fontWeight: '600',
                   cursor: 'pointer',
                   textTransform: 'capitalize'
                 }}
               >
                 {tab}
               </button>
             ))}
          </div>

          {activeTab === 'items' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {items.map(item => (
                 <div key={item.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.description}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          backgroundColor: item.mandatory ? '#fee2e2' : '#f1f5f9', 
                          color: item.mandatory ? '#ef4444' : '#64748b', 
                          fontWeight: '600', 
                          textTransform: 'uppercase' 
                        }}>
                          {item.mandatory ? 'Required' : 'Optional'}
                        </span>
                     </div>
                       {item.provided ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#f59e0b' }}>⏳</span>}
                    </div>
                    {item.provided && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📄</span> {item.documentName || 'Evidence Uploaded'}
                      </div>
                    )}
                 </div>
               ))}
               {items.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No evidence items required</div>}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {tasks.map(task => (
                 <div key={task.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{task.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{task.status}</div>
                 </div>
               ))}
               {tasks.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No tasks assigned</div>}
            </div>
          )}

          {activeTab === 'risks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Risks</h3>
                 <button onClick={() => setShowRiskForm(true)} style={{ color: '#2563eb', background: 'none', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Raise Risk</button>
              </div>

              {showRiskForm && (
                <form onSubmit={handleRaiseRisk} style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '8px', border: '1px solid #ffedd5', marginBottom: '16px' }}>
                   <input 
                     required
                     placeholder="Risk title" 
                     value={riskForm.title}
                     onChange={e => setRiskForm({...riskForm, title: e.target.value})}
                     style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                   />
                   <textarea 
                     required
                     placeholder="Description"
                     value={riskForm.description}
                     onChange={e => setRiskForm({...riskForm, description: e.target.value})}
                     style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', height: '80px' }}
                   />
                   <select 
                     value={riskForm.severity}
                     onChange={e => setRiskForm({...riskForm, severity: e.target.value})}
                     style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                   >
                     <option value="LOW">Low</option>
                     <option value="MEDIUM">Medium</option>
                     <option value="HIGH">High</option>
                   </select>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', fontWeight: '600' }}>Save</button>
                      <button type="button" onClick={() => setShowRiskForm(false)} style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>Cancel</button>
                   </div>
                </form>
              )}

              {risks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No risks raised for this transaction</div>
              ) : (
                risks.map(risk => (
                  <div key={risk.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                       <span style={{ fontWeight: '600' }}>{risk.title}</span>
                       <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>{risk.severity}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{risk.description}</div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {/* Status Actions */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Decision</h3>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handleStatusUpdate('APPROVED')}
                  style={{ flex: 1, backgroundColor: '#10b981', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleStatusUpdate('REJECTED')}
                  style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Reject
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [txRes, pRes, uRes] = await Promise.all([
        transactionApi.getAll(),
        projectApi.getAll(),
        userApi.getAll(),
      ]);
      setTransactions(txRes.data);
      setProjects(pRes.data);
      setUsers(uRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = (id, status) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, status } : t));
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading transactions...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Transactions</h1>
        <p style={{ color: '#64748b' }}>Review and manage audit transactions</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '16px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '500' }}>{tx.description}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(tx.date).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '13px', color: getCategoryColor(tx.categoryName), fontWeight: '500' }}>{tx.categoryName}</span>
                </td>
                <td style={{ padding: '16px', fontWeight: '600' }}>₹{tx.amount?.toLocaleString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '999px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    backgroundColor: STATUS_COLORS[tx.status]?.bg || '#f1f5f9',
                    color: STATUS_COLORS[tx.status]?.text || '#475569'
                  }}>
                    {tx.status?.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                   <button onClick={() => setSelectedTx(tx)} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTx && (
        <EvidencePanel 
          transaction={selectedTx} 
          users={users} 
          onClose={() => setSelectedTx(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
