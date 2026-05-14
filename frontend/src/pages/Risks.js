import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X, AlertTriangle, Edit, Trash2, Zap, MessageSquare, RefreshCw } from 'lucide-react';
import { riskApi, projectApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
const STATUSES   = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const CAN_CREATE = ['ADMIN', 'AUDITOR'];

const emptyForm = {
  title: '',
  description: '',
  severity: 'LOW',
  projectId: '',
};

function RiskCreateModal({ show, onClose, onSubmit, form, setForm, projects, formError }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Raise New Audit Risk</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          {formError && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', fontSize: '0.875rem' }}>{formError}</div>}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Risk Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} placeholder="e.g., Missing Proof of Delivery" />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Project</label>
            <select required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Severity</label>
            <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
            <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', minHeight: '100px' }} placeholder="Provide details about the identified risk..." />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#dc2626', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Raise Risk</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RiskEditModal({ show, onClose, onSubmit, form, setForm, projects, formError }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Edit Risk</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          {formError && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', fontSize: '0.875rem' }}>{formError}</div>}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Risk Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Project</label>
            <select required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Severity</label>
            <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
            <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', minHeight: '100px' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Update Risk</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RiskDetailModal({ risk, canCreate, projects, onClose, onStatusChange }) {
  const navigate = useNavigate();
  if (!risk) return null;
  const project = projects.find(p => String(p.id).toLowerCase() === String(risk.projectId).toLowerCase());

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>Risk Details</h2>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ backgroundColor: (SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.LOW).bg, color: (SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.LOW).text, padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800' }}>{risk.severity}</span>
            <span style={{ backgroundColor: (STATUS_COLORS[risk.status] || STATUS_COLORS.OPEN).bg, color: (STATUS_COLORS[risk.status] || STATUS_COLORS.OPEN).text, padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800' }}>{risk.status}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: '0 0 1rem 0' }}>{risk.title}</h1>
          <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', marginBottom: '0.5rem' }}>Project</div>
            <div style={{ fontWeight: '600', color: '#111827' }}>{project?.name || (risk.projectId ? 'Project Not Found' : 'N/A')}</div>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <button 
              onClick={() => navigate(`/tasks?riskId=${risk.id}`)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.6rem 1.25rem', 
                backgroundColor: '#f3f4f6', 
                color: '#374151', 
                border: 'none', 
                borderRadius: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                width: '100%',
                justifyContent: 'center'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <Eye size={18} /> View Associated Task
            </button>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', marginBottom: '0.75rem' }}>Description</div>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{risk.description}</p>
          </div>
          {canCreate && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', marginBottom: '1rem' }}>Update Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={() => onStatusChange(risk.id, s)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: risk.status === s ? '#111827' : 'white', color: risk.status === s ? 'white' : '#374151', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>{s.replace(/_/g, ' ')}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const WorkflowFeedbackModal = ({ isOpen, onClose, feedback, loading }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '700px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f3ff', borderRadius: '1rem 1rem 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#5b21b6' }}>
            <Zap size={24} fill="#8b5cf6" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>AI Workflow Insights</h2>
          </div>
          <button onClick={onClose} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '2rem', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
              <RefreshCw className="animate-spin" style={{ color: '#8b5cf6', margin: '0 auto 1.5rem auto' }} size={48} />
              <p style={{ color: '#6b7280', fontWeight: '600' }}>Analyzing interaction patterns...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', padding: '1.5rem', backgroundColor: '#eff6ff', borderRadius: '1rem' }}>
                <MessageSquare style={{ color: '#2563eb', flexShrink: 0 }} size={28} />
                <div>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.125rem', fontWeight: '700', color: '#1e3a8a' }}>Analysis & Recommendations</h3>
                  <div style={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1rem' }}>
                    {feedback || 'No specific workflow issues identified yet. Continue standard audit procedures.'}
                  </div>
                </div>
              </div>
              
              <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How it works</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>
                  This analysis is generated by processing interaction logs (status changes, comments, and reassignments) 
                  to identify bottlenecks and patterns of inefficiency in the audit workflow.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'end', backgroundColor: '#f9fafb', borderRadius: '0 0 1rem 1rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)' }}
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Risks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [risks, setRisks]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [filter, setFilter]           = useState('ALL');
  const [showEdit, setShowEdit]       = useState(false);
  const [editForm, setEditForm]       = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [error, setError]             = useState('');
  const [formError, setFormError]     = useState('');
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [workflowFeedback, setWorkflowFeedback] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const canCreate = CAN_CREATE.includes(user?.role);

  useEffect(() => { 
    fetchRisks(); 
    fetchProjects();
  }, []);

  const fetchRisks = async () => {
    try {
      const res = await riskApi.getAll();
      setRisks(res.data);
    } catch {
      setError('Failed to load risks.');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load projects');
    }
  };

  const fetchWorkflowFeedback = async () => {
    if (!projects[0]?.id) return;
    setLoadingFeedback(true);
    setIsFeedbackModalOpen(true);
    try {
      const response = await aiApi.getWorkflowFeedback(projects[0].id);
      setWorkflowFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setWorkflowFeedback('Failed to load AI feedback. Please ensure interaction logs are available.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await riskApi.update(editingId, editForm);
      setShowEdit(false);
      fetchRisks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update risk.');
    }
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setEditForm({
      title: r.title,
      description: r.description,
      severity: r.severity,
      projectId: r.projectId,
      status: r.status
    });
    setShowEdit(true);
    setFormError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await riskApi.create({ ...form, status: 'OPEN' });
      setShowForm(false);
      fetchRisks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create risk.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await riskApi.updateStatus(id, status);
      setRisks(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setSelectedRisk(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this risk?')) return;
    try {
      await riskApi.delete(id);
      setRisks(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to delete risk.');
    }
  };

  const displayed = filter === 'ALL' ? risks : risks.filter(r => r.status === filter);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '800', color: '#111827' }}>Risk Management</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Track, analyze and mitigate audit risks across all projects.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={fetchWorkflowFeedback}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f5f3ff',
              color: '#5b21b6',
              border: '1px solid #ddd6fe',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontWeight: '700',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#ede9fe'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
          >
            <Zap size={20} fill="#8b5cf6" /> AI Workflow Insights
          </button>
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); setFormError(''); }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc2626',
                color: 'white', border: 'none', borderRadius: '0.75rem',
                cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Raise New Risk
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: filter === s ? 'transparent' : '#e5e7eb',
              backgroundColor: filter === s ? '#111827' : 'white',
              color: filter === s ? 'white' : '#4b5563',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
          Showing {displayed.length} risk{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
            <AlertTriangle size={64} strokeWidth={1.5} style={{ marginBottom: '1.5rem', color: '#f3f4f6' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>No risks found matching your criteria.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Title</th>
                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</th>
                <th style={{ textAlign: 'center', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</th>
                <th style={{ textAlign: 'center', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ divideY: '1px solid #f3f4f6' }}>
              {displayed.map((risk, i) => {
                const project = projects.find(p => String(p.id).toLowerCase() === String(risk.projectId).toLowerCase());
                return (
                  <tr key={risk.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>{i + 1}</td>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: '#111827' }}>{risk.title}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#4b5563', fontSize: '0.875rem' }}>{project?.name || 'N/A'}</td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                      <span style={{ backgroundColor: (SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.LOW).bg, color: (SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.LOW).text, padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800' }}>{risk.severity}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                      <span style={{ backgroundColor: (STATUS_COLORS[risk.status] || STATUS_COLORS.OPEN).bg, color: (STATUS_COLORS[risk.status] || STATUS_COLORS.OPEN).text, padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800' }}>{risk.status}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                        <button onClick={() => setSelectedRisk(risk)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }} title="View Details"><Eye size={18} /></button>
                        {canCreate && (
                          <>
                            <button onClick={() => openEdit(risk)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #dbeafe', background: '#eff6ff', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }} title="Edit"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(risk.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }} title="Delete"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RiskCreateModal show={showForm} onClose={() => setShowForm(false)} onSubmit={handleCreate} form={form} setForm={setForm} projects={projects} formError={formError} />
      <RiskEditModal show={showEdit} onClose={() => setShowEdit(false)} onSubmit={handleEdit} form={editForm} setForm={setEditForm} projects={projects} formError={formError} />
      <RiskDetailModal risk={selectedRisk} canCreate={canCreate} projects={projects} onClose={() => setSelectedRisk(null)} onStatusChange={handleStatusChange} />
      <WorkflowFeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} feedback={workflowFeedback} loading={loadingFeedback} />
      
      {error && <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: '#dc2626', color: 'white', padding: '1rem 2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>{error}</div>}
    </div>
  );
}
