import React, { useState, useEffect } from 'react';
import { taskApi, userApi } from '../services/api';

const PRIORITY_COLORS = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' };
const STATUS_COLORS   = { OPEN: '#d97706', IN_PROGRESS: '#2563eb', PENDING_REVIEW: '#7c3aed', COMPLETED: '#16a34a', REJECTED: '#dc2626' };
const TASK_TYPES      = ['RESUBMIT_EVIDENCE', 'CLARIFICATION', 'AUDIT_REVIEW', 'COMPLIANCE_CHECK'];
const PRIORITIES      = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES        = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'REJECTED'];

const emptyForm = { title: '', description: '', taskType: 'RESUBMIT_EVIDENCE', priority: 'MEDIUM', assignedTo: '', dueDate: '', status: 'OPEN' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([taskApi.getAll(), userApi.getAll()]);
      setTasks(tasksRes.data);
      setUsers(usersRes.data);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setForm({ title: t.title, description: t.description || '', taskType: t.taskType || 'RESUBMIT_EVIDENCE', priority: t.priority, assignedTo: t.assignedTo || '', dueDate: t.dueDate || '', status: t.status });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null, dueDate: form.dueDate || null };
      if (editingId) { await taskApi.update(editingId, payload); }
      else { await taskApi.create(payload); }
      handleCancel(); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save task'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await taskApi.updateStatus(id, status); fetchData(); }
    catch (err) { alert('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await taskApi.remove(id); fetchData(); }
    catch (err) { alert('Failed to delete task'); }
  };

  const displayed = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter);
  const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Audit Tasks</h1>
        <button onClick={showForm ? handleCancel : () => setShowForm(true)}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Task' : 'Create Task'}</h3>
          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Task Type</label>
              <select value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} style={inputStyle}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assign To</label>
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} style={inputStyle}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ padding: '0.625rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
                {editingId ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['ALL', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500',
              backgroundColor: filter === s ? '#2563eb' : 'white', color: filter === s ? 'white' : '#374151' }}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280', alignSelf: 'center' }}>{displayed.length} task{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Task cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            No tasks found.
          </div>
        ) : displayed.map(t => {
          const pc = PRIORITY_COLORS[t.priority] || '#6b7280';
          const sc = STATUS_COLORS[t.status] || '#6b7280';
          const assignee = users.find(u => u.id === t.assignedTo);
          const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED','REJECTED'].includes(t.status);
          return (
            <div key={t.id} style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${pc}`, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t.title}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: '#ede9fe', color: '#5b21b6' }}>{t.taskType?.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', backgroundColor: `${pc}20`, color: pc, fontWeight: '600' }}>{t.priority}</span>
                  {isOverdue && <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '600' }}>⚠ OVERDUE</span>}
                </div>
                {t.description && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.4rem' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {assignee && <span>👤 {assignee.fullName}</span>}
                  {t.dueDate && <span style={{ color: isOverdue ? '#dc2626' : '#9ca3af' }}>📅 Due {t.dueDate}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', minWidth: '140px' }}>
                <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', border: `1px solid ${sc}`, borderRadius: '0.25rem', fontSize: '0.75rem', color: sc, fontWeight: '600', cursor: 'pointer', backgroundColor: `${sc}10` }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => handleEdit(t)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.72rem' }}>Edit</button>
                  <button onClick={() => handleDelete(t.id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.72rem' }}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
