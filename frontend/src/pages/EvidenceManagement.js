import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Eye,
  Plus,
  X,
  Link as LinkIcon,
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Clock,
  Trash2,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { projectApi, transactionApi, evidenceApi, vendorApi, taskApi, riskApi, userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EvidenceManagement() {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [projectsRes, transactionsRes] = await Promise.all([
        projectApi.getAll(),
        transactionApi.getAll()
      ]);
      setProjects(projectsRes.data);
      setAllTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTransactions();
    }
  }, [selectedProject]);

  const fetchProjectTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getAll();
      const projectTxs = response.data.filter(tx => tx.projectId === selectedProject.id);
      setTransactions(projectTxs);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSidebar = (tx) => {
    setSelectedTransaction(tx);
    setIsSidebarOpen(true);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.referenceNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'matched' ? tx.bankMatched : !tx.bankMatched);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: transactions.length,
    matched: transactions.filter(t => t.bankMatched).length,
    missing: transactions.filter(t => !t.bankMatched).length,
    rate: transactions.length ? Math.round((transactions.filter(t => t.bankMatched).length / transactions.length) * 100) : 0
  };

  if (loading && projects.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%' }}></div>
      </div>
    );
  }

  const thStyle = { padding: '16px', fontWeight: '600', color: '#475569', textAlign: 'left', fontSize: '14px' };
  const tdStyle = { padding: '16px', color: '#1e293b', fontSize: '14px', borderBottom: '1px solid #e2e8f0' };
  const badgeStyle = { padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500' };

  if (!selectedProject) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Evidence Management</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Select a project to manage bank statement evidence</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
            <input 
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Project Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Audit Status</th>
                <th style={thStyle}>Evidence Items</th>
                <th style={{...thStyle, textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, idx) => {
                const projectTxs = allTransactions.filter(t => t.projectId === project.id);
                return (
                  <tr key={project.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{...tdStyle, fontWeight: '500', color: '#2563eb', cursor: 'pointer'}} onClick={() => setSelectedProject(project)}>
                      {project.name}
                    </td>
                    <td style={tdStyle}>
                      <span style={{...badgeStyle, backgroundColor: project.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: project.status === 'ACTIVE' ? '#166534' : '#92400e' }}>
                        {project.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                        <span>{project.auditStatus || 'READY'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{projectTxs.length} items</td>
                    <td style={{...tdStyle, textAlign: 'right'}}>
                      <button 
                        onClick={() => setSelectedProject(project)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Open
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

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => setSelectedProject(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              <span>Projects</span>
              <ChevronRight size={14} />
              <span>{selectedProject.name}</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Evidence Management</h1>
          </div>
        </div>

        <div style={{ gridTemplateColumns: 'repeat(4, 1fr)', display: 'grid', gap: '20px', marginBottom: '24px' }}>
          {[
            { label: 'Total Transactions', value: stats.total, icon: <FileText color="#2563eb" /> },
            { label: 'Matched', value: stats.matched, icon: <CheckCircle2 color="#10b981" /> },
            { label: 'Missing', value: stats.missing, icon: <AlertCircle color="#ef4444" /> },
            { label: 'Match Rate', value: `${stats.rate}%`, icon: <CheckCircle2 color="#8b5cf6" /> }
          ].map((stat, i) => (
            <div key={i} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>{stat.label}</div>
                {stat.icon}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                <input 
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', backgroundColor: 'white' }}
              >
                <option value="all">All Status</option>
                <option value="matched">Matched</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Txn No.</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Ledger</th>
                <th style={thStyle}>D/C</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Bank statement</th>
                <th style={{...thStyle, textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: selectedTransaction?.id === tx.id ? '#f0f7ff' : 'transparent' }}>
                  <td style={tdStyle}>{tx.transactionDate}</td>
                  <td style={tdStyle}>{tx.referenceNo}</td>
                  <td style={tdStyle}>{tx.description}</td>
                  <td style={tdStyle}>{tx.ledgerName || 'Main Ledger'}</td>
                  <td style={tdStyle}>{tx.debitCredit}</td>
                  <td style={tdStyle}>${tx.amount?.toLocaleString()}</td>
                  <td style={tdStyle}>{tx.categoryName}</td>
                  <td style={tdStyle}>
                    <span style={{
                      ...badgeStyle,
                      backgroundColor: tx.bankMatched ? '#dcfce7' : '#fee2e2',
                      color: tx.bankMatched ? '#166534' : '#991b1b'
                    }}>
                      {tx.bankMatched ? '✓ Provided' : '✕ Not Provided'}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign: 'right'}}>
                    <button 
                      onClick={() => handleOpenSidebar(tx)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isSidebarOpen && selectedTransaction && (
        <EvidenceSidebar 
          transaction={selectedTransaction} 
          projectId={selectedProject.id}
          onClose={() => setIsSidebarOpen(false)}
          onEvidenceUpdate={fetchProjectTransactions}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function EvidenceSidebar({ transaction, projectId, onClose, onEvidenceUpdate, currentUser }) {
  const [activeTab, setActiveTab] = useState('checklist');

  useEffect(() => {
    if (!transaction.vendorId) {
      transactionApi.autoLinkVendor(transaction.id).then(() => {
        onEvidenceUpdate();
      });
    }
  }, [transaction.id]);

  return (
    <div style={{ 
      width: '400px', 
      backgroundColor: 'white', 
      borderLeft: '1px solid #e2e8f0', 
      height: 'calc(100vh - 100px)', 
      position: 'sticky', 
      top: '20px',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      boxShadow: '-4px 0 15px rgba(0,0,0,0.05)'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Evidence Workspace</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        {[
          { id: 'checklist', icon: <CheckSquare size={16} />, label: 'Checklist' },
          { id: 'vendor', icon: <LinkIcon size={16} />, label: 'Linking' },
          { id: 'tasks', icon: <MessageSquare size={16} />, label: 'Tasks' },
          { id: 'risks', icon: <AlertTriangle size={16} />, label: 'Risks' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'checklist' && <ChecklistSection transaction={transaction} projectId={projectId} onUpdate={onEvidenceUpdate} />}
        {activeTab === 'vendor' && <VendorLinkingSection transaction={transaction} onUpdate={onEvidenceUpdate} currentUser={currentUser} />}
        {activeTab === 'tasks' && <TaskCreationSection transaction={transaction} projectId={projectId} currentUser={currentUser} />}
        {activeTab === 'risks' && <RiskCreationSection transaction={transaction} projectId={projectId} currentUser={currentUser} />}
      </div>
    </div>
  );
}

function ChecklistSection({ transaction, projectId, onUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [transaction.id]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await evidenceApi.getItems(transaction.id);
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e, itemId) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingId(itemId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('checklistItemId', itemId);
      formData.append('projectId', projectId);
      await evidenceApi.upload(formData);
      fetchItems();
      onUpdate();
    } catch (e) {
      alert('Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete evidence?')) return;
    try {
      await evidenceApi.deleteItem(itemId);
      fetchItems();
      onUpdate();
    } catch (e) {
      alert('Delete failed');
    }
  };

  if (loading) return <div style={{ fontSize: '13px', color: '#64748b' }}>Loading checklist...</div>;

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Required Evidence</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b' }}>No specific evidence requirements found for this category.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{item.itemName}</span>
                {item.provided ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} color="#f59e0b" />}
              </div>
              {item.provided ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={14} color="#2563eb" />
                    <span style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.documentName || 'Uploaded Document'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => window.open(evidenceApi.download(item.documentId), '_blank')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Eye size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ) : (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  padding: '10px', 
                  border: '1px dashed #cbd5e1', 
                  borderRadius: '6px', 
                  cursor: uploadingId === item.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: '#2563eb',
                  fontWeight: '500',
                  backgroundColor: '#eff6ff'
                }}>
                  {uploadingId === item.id ? 'Uploading...' : <><Upload size={14} /> Upload Evidence</>}
                  <input type="file" hidden onChange={(e) => handleFileChange(e, item.id)} disabled={uploadingId === item.id} />
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorLinkingSection({ transaction, onUpdate, currentUser }) {
  const [vendors, setVendors] = useState([]);
  const [linking, setLinking] = useState(false);
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE_MANAGER';

  useEffect(() => {
    vendorApi.getAll().then(res => setVendors(res.data));
  }, []);

  const handleLink = async (vendorId) => {
    if (!canEdit) return;
    try {
      setLinking(true);
      await transactionApi.linkVendor(transaction.id, vendorId);
      onUpdate();
    } catch (e) {
      alert('Linking failed');
    } finally {
      setLinking(false);
    }
  };

  const currentVendor = vendors.find(v => v.id === transaction.vendorId);

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Vendor Reconciliation</h3>
      
      {currentVendor ? (
        <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#166534', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Linked Vendor</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{currentVendor.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>GST: {currentVendor.gstNumber || 'N/A'}</div>
          {canEdit && (
            <button 
              onClick={() => handleLink(null)}
              style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Unlink Vendor
            </button>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '10px', border: '1px solid #ffedd5', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ color: '#9a3412', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>No vendor linked</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>System will attempt to auto-link when you open this workspace.</p>
        </div>
      )}

      {canEdit && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Manual Selection</label>
          <select 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '14px' }}
            value={transaction.vendorId || ''}
            onChange={(e) => handleLink(e.target.value)}
            disabled={linking}
          >
            <option value="">Select Vendor</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {!canEdit && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '12px' }}>* View-only access for auditors.</p>}
    </div>
  );
}

function TaskCreationSection({ transaction, projectId, currentUser }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', assignedTo: '' });
  const [loading, setLoading] = useState(false);
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE_MANAGER' || currentUser?.role === 'AUDITOR';

  useEffect(() => {
    userApi.getAll().then(res => setUsers(res.data.filter(u => u.role === 'ADMIN' || u.role === 'FINANCE_MANAGER')));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    try {
      setLoading(true);
      await taskApi.create({
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo || null,
        projectId: projectId,
        riskId: null,
        transactionId: transaction?.id
      });
      alert('Task created successfully');
      setFormData({ title: '', description: '', assignedTo: '' });
    } catch (e) {
      alert('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Create Action Task</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Task Title *</label>
            <input 
              required
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Description *</label>
            <textarea 
              required
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none' }}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Assign To</label>
            <select 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
              value={formData.assignedTo}
              onChange={e => setFormData({...formData, assignedTo: e.target.value})}
            >
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading || !canCreate}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: (loading || !canCreate) ? 0.7 : 1 }}
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}

function RiskCreationSection({ transaction, projectId, currentUser }) {
  const [formData, setFormData] = useState({ title: '', description: '', severity: 'MEDIUM' });
  const [loading, setLoading] = useState(false);
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE_MANAGER' || currentUser?.role === 'AUDITOR';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    try {
      setLoading(true);
      await riskApi.create({
        ...formData,
        projectId: projectId,
        transactionId: transaction?.id
      });
      alert('Risk raised successfully');
      setFormData({ title: '', description: '', severity: 'MEDIUM' });
    } catch (e) {
      alert('Failed to raise risk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Raise Risk/Finding</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Risk Title *</label>
            <input 
              required
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Description *</label>
            <textarea 
              required
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none' }}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Severity</label>
            <select 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
              value={formData.severity}
              onChange={e => setFormData({...formData, severity: e.target.value})}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading || !canCreate}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: (loading || !canCreate) ? 0.7 : 1 }}
        >
          {loading ? 'Raising...' : 'Raise Risk'}
        </button>
      </form>
    </div>
  );
}
