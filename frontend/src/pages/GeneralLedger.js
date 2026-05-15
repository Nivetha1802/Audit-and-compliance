import React, { useState, useEffect } from 'react';
import { 
  projectApi, 
  transactionApi, 
  vendorApi, 
  taskApi, 
  riskApi, 
  evidenceApi,
  userApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  RefreshCw, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Eye,
  Plus,
  AlertTriangle,
  FolderOpen,
  ChevronDown,
  User,
  ExternalLink,
  Link as LinkIcon,
  MessageSquare,
  CheckSquare,
  Trash2,
  RefreshCcw,
  Search
} from 'lucide-react';

const STATUS_COLORS = {
  APPROVED:         { bg: '#d1fae5', text: '#065f46' },
  PENDING_EVIDENCE: { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW:     { bg: '#dbeafe', text: '#1e40af' },
  RAISED_FINDING:   { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:         { bg: '#fce7f3', text: '#9d174d' },
};

function getCategoryColor(name) {
  if (!name) return { bg: '#f3f4f6', text: '#6b7280' };
  const n = name.toLowerCase();
  if (n.includes('revenue')) return { bg: '#d1fae5', text: '#065f46' };
  if (n.includes('expense')) return { bg: '#fee2e2', text: '#991b1b' };
  if (n.includes('wip'))     return { bg: '#fef3c7', text: '#92400e' };
  return { bg: '#ede9fe', text: '#5b21b6' };
}

const ADMIN_ROLES = ['ADMIN', 'FINANCE_MANAGER'];

// ── SHARED SIDEBAR ──────────────────────────────────────────────────────────
function EvidenceSidebar({ transaction, projectId, onClose, onEvidenceUpdate, currentUser }) {
  const [activeTab, setActiveTab] = useState('checklist');

  useEffect(() => {
    if (transaction && !transaction.vendorId) {
      transactionApi.autoLinkVendor(transaction.id).then(() => {
        onEvidenceUpdate();
      });
    }
  }, [transaction?.id]);

  if (!transaction) return null;

  return (
    <div style={{ 
      width: '420px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', 
      height: '100vh', position: 'fixed', right: 0, top: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Evidence Workspace</h2>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Ref: {transaction.referenceNo || transaction.transactionNumber}</div>
        </div>
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
              flex: 1, padding: '12px 8px', border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '11px',
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

  useEffect(() => { fetchItems(); }, [transaction.id]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await evidenceApi.getItems(transaction.id);
      setItems(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    } catch (e) { alert('Upload failed'); }
    finally { setUploadingId(null); }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete evidence?')) return;
    try {
      await evidenceApi.deleteItem(itemId);
      fetchItems();
      onUpdate();
    } catch (e) { alert('Delete failed'); }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{item.description}</span>
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', 
                  border: '1px dashed #cbd5e1', borderRadius: '6px', cursor: uploadingId === item.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px', color: '#2563eb', fontWeight: '500', backgroundColor: '#eff6ff'
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

  useEffect(() => { vendorApi.getAll().then(res => setVendors(res.data)); }, []);

  const handleLink = async (vendorId) => {
    if (!canEdit) return;
    try {
      setLinking(true);
      await transactionApi.linkVendor(transaction.id, vendorId);
      onUpdate();
    } catch (e) { alert('Linking failed'); }
    finally { setLinking(false); }
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
            <button onClick={() => handleLink(null)} style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>Unlink Vendor</button>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '10px', border: '1px solid #ffedd5', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ color: '#9a3412', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>No vendor linked</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>System will attempt to auto-link in the background.</p>
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
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}
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
    } catch (e) { alert('Failed to create task'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Create Action Task</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Task Title *</label>
            <input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Description *</label>
            <textarea required rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none' }}
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Assign To</label>
            <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
              value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading || !canCreate}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: (loading || !canCreate) ? 0.7 : 1 }}>
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
      await riskApi.create({ ...formData, projectId, transactionId: transaction?.id });
      alert('Risk raised successfully');
      setFormData({ title: '', description: '', severity: 'MEDIUM' });
    } catch (e) { alert('Failed to raise risk'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Raise Risk/Finding</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Risk Title *</label>
            <input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Description *</label>
            <textarea required rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none' }}
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Severity</label>
            <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
              value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading || !canCreate}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: (loading || !canCreate) ? 0.7 : 1 }}>
          {loading ? 'Raising...' : 'Raise Risk'}
        </button>
      </form>
    </div>
  );
}

// ── MAIN COMPONENTS ────────────────────────────────────────────────────────
function ProjectsTable({ projects, onSelect }) {
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'middle' };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>📄 General Ledger Data</h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>Select a project to view its general ledger transactions.</p>
      </div>


      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Audit Status</th>
              <th style={{...thStyle, textAlign: 'center'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => {
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{...tdStyle, fontWeight: '600', color: '#2563eb', cursor: 'pointer'}} onClick={() => onSelect(p)}>{p.name}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', backgroundColor: p.status === 'ACTIVE' ? '#d1fae5' : '#fef3c7', color: p.status === 'ACTIVE' ? '#065f46' : '#92400e' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{p.auditStatus || 'DRAFT'}</td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <button 
                      onClick={() => onSelect(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
                    >
                      <ChevronRight size={20} />
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

function LedgerDetail({ project, onBack, currentUser, onEvidenceUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => { fetchTransactions(); }, [project.id]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionApi.getLedgerByProject(project.id);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };


  const onFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('projectId', project.id);
      await transactionApi.importCsv(fd);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchTransactions();
      alert('Import successful');
    } catch (err) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };


  const totals = transactions.reduce((acc, t) => {
    if (t.debitCredit === 'Credit') acc.credit += (t.amount || 0);
    else acc.debit += (t.amount || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb' };
  const tdStyle = { padding: '12px 16px', fontSize: '13px', color: '#111827', borderBottom: '1px solid #f3f4f6' };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px', position: 'relative', minHeight: '100vh' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={20} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
              <span>Projects</span> <ChevronRight size={14} /> <span>{project.name}</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>📄 General Ledger Data</h1>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '16px', 
          borderRadius: '12px', 
          border: '1px dashed #cbd5e1', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              backgroundColor: '#eff6ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                {selectedFile ? selectedFile.name : 'Import Ledger Data'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Upload your ledger CSV file here'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="file" 
              id="ledger-upload" 
              accept=".csv" 
              hidden 
              onChange={onFileChange}
              ref={fileInputRef}
            />
            
            {!selectedFile ? (
              <label 
                htmlFor="ledger-upload"
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} /> Choose File
              </label>
            ) : (
              <>
                <button 
                  onClick={handleRemoveFile}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    backgroundColor: '#fee2e2', 
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <X size={16} /> Remove
                </button>
                <button 
                  onClick={triggerImport}
                  disabled={importing}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    backgroundColor: '#2563eb', 
                    border: 'none',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: importing ? 0.7 : 1
                  }}
                >
                  {importing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />} 
                  Import Ledger Transactions
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Entries', value: transactions.length, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Total Debit', value: `₹${totals.debit.toLocaleString()}`, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Total Credit', value: `₹${totals.credit.toLocaleString()}`, color: '#059669', bg: '#f0fdf4' }
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: card.bg, padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{card.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: card.color, marginTop: '4px' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Txn No.</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Vendor</th>
                <th style={thStyle}>Ledger</th>
                <th style={thStyle}>D/C</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ backgroundColor: selectedTransaction?.id === tx.id ? '#f0f7ff' : 'transparent' }}>
                  <td style={tdStyle}>{tx.transactionDate}</td>
                  <td style={tdStyle}><code style={{ fontSize: '11px', backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '4px' }}>{tx.transactionNumber}</code></td>
                  <td style={tdStyle}>{tx.description}</td>
                  <td style={tdStyle}>{tx.vendorName || tx.vendorCustomer || 'N/A'}</td>
                  <td style={tdStyle}>{tx.ledgerName || 'N/A'}</td>
                  <td style={tdStyle}>{tx.debitCredit}</td>
                  <td style={tdStyle}>₹{tx.amount?.toLocaleString()}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '500', ...getCategoryColor(tx.categoryName) }}>
                      {tx.categoryName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isSidebarOpen && (
        <EvidenceSidebar 
          transaction={selectedTransaction} 
          projectId={project.id}
          onClose={() => setIsSidebarOpen(false)}
          onEvidenceUpdate={() => { fetchTransactions(); onEvidenceUpdate(); }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default function GeneralLedger() {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);


  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const projRes = await projectApi.getAll();
      setProjects(projRes.data);
    } catch (err) { console.error(err); }
  };


  if (selectedProject) {
    return <LedgerDetail project={selectedProject} onBack={() => setSelectedProject(null)} currentUser={currentUser} onEvidenceUpdate={fetchData} />;
  }

  return <ProjectsTable projects={projects} onSelect={setSelectedProject} />;
}
