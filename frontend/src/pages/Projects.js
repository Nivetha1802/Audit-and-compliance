import React, { useState, useEffect } from 'react';
import { projectApi, userApi, masterCategoriesApi } from '../services/api';

const STATUS_COLORS = {
  ACTIVE:    { bg: '#d1fae5', text: '#065f46' },
  COMPLETED: { bg: '#dbeafe', text: '#1e40af' },
  SUSPENDED: { bg: '#fee2e2', text: '#991b1b' },
};

const emptyForm = {
  name: '', projectCode: '', description: '',
  startDate: '', endDate: '', totalBudget: '',
  categories: [], projectOwnerId: '', auditorId: '',
};

/** Build a grouped tree from flat MasterCategory list */
function buildTree(flatCats) {
  const l1 = flatCats.filter(c => c.level === 1);
  return l1.map(parent => ({
    ...parent,
    children: flatCats.filter(c => c.parentId === parent.id),
  }));
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [catTree, setCatTree] = useState([]); // [{id, name, children:[{id,name}]}]
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, usersRes, catsRes] = await Promise.all([
        projectApi.getAll(),
        userApi.getAll(),
        masterCategoriesApi.getAll(),
      ]);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      setCatTree(buildTree(catsRes.data));
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (name) => {
    const current = Array.isArray(form.categories) ? form.categories : [];
    const updated = current.includes(name) ? current.filter(c => c !== name) : [...current, name];
    setForm({ ...form, categories: updated });
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      ...p,
      categories: p.categories ? p.categories.split(',') : [],
      totalBudget: p.totalBudget || '',
      description: p.description || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false); setEditingId(null); setForm(emptyForm); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cats = Array.isArray(form.categories) ? form.categories : [];
    if (cats.length === 0) { setError('Please select at least one category'); return; }
    try {
      const payload = { ...form, categories: cats.join(','), totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : null };
      if (editingId) { await projectApi.update(editingId, payload); }
      else { await projectApi.create(payload); }
      handleCancel();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    }
  };

  const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem' };
  const cats = Array.isArray(form.categories) ? form.categories : [];

  if (loading && projects.length === 0) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Projects</h1>
        <button onClick={showForm ? handleCancel : () => setShowForm(true)}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Project' : 'Create New Project'}</h3>
          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Project Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Project Code *</label>
              <input value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Total Budget (₹)</label>
              <input type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} style={inputStyle} placeholder="0.00" min="0" step="0.01" />
            </div>

            {/* 2-level category selector */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Project Categories * <span style={{ fontWeight: '400', color: '#6b7280' }}>(select L1 group and/or specific L2 sub-categories)</span></label>
              {catTree.length === 0 ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                  No categories found. Complete Organization Setup first.
                </div>
              ) : (
                <div style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', overflow: 'hidden' }}>
                  {catTree.map((l1, i) => (
                    <div key={l1.id} style={{ borderBottom: i < catTree.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      {/* L1 row */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', color: '#1e40af' }}>
                        <input type="checkbox"
                          checked={cats.includes(l1.name)}
                          onChange={() => toggleCategory(l1.name)} />
                        {l1.name}
                        <span style={{ fontWeight: '400', fontSize: '0.75rem', color: '#6b7280' }}>({l1.children.length} sub-categories)</span>
                      </label>
                      {/* L2 rows */}
                      {l1.children.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.5rem 1.5rem 0.625rem' }}>
                          {l1.children.map(l2 => (
                            <label key={l2.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: cats.includes(l2.name) ? '#dbeafe' : '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: `1px solid ${cats.includes(l2.name) ? '#bfdbfe' : '#e5e7eb'}`, color: cats.includes(l2.name) ? '#1e40af' : '#374151' }}>
                              <input type="checkbox" style={{ display: 'none' }}
                                checked={cats.includes(l2.name)}
                                onChange={() => toggleCategory(l2.name)} />
                              {cats.includes(l2.name) ? '✓ ' : ''}{l2.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Project Owner *</label>
              <select value={form.projectOwnerId} onChange={(e) => setForm({ ...form, projectOwnerId: e.target.value })} style={inputStyle} required>
                <option value="">Select Owner</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Auditor *</label>
              <select value={form.auditorId} onChange={(e) => setForm({ ...form, auditorId: e.target.value })} style={inputStyle} required>
                <option value="">Select Auditor</option>
                {users.filter(u => u.role === 'AUDITOR' || u.role === 'ADMIN').map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}>
                {editingId ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#6b7280', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            No projects yet. Create your first project.
          </div>
        ) : projects.map((p) => {
          const colors = STATUS_COLORS[p.status] || { bg: '#f3f4f6', text: '#374151' };
          return (
            <div key={p.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{p.name}</h3>
                  <code style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.projectCode}</code>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => handleEdit(p)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: colors.bg, color: colors.text }}>{p.status}</span>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.3rem' }}>Categories</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {p.categories ? p.categories.split(',').map(c => (
                    <span key={c} style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>{c}</span>
                  )) : <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.8rem', color: '#374151', marginBottom: '0.5rem' }}>
                <div><strong>Budget:</strong> {p.totalBudget != null ? `₹${p.totalBudget.toLocaleString()}` : '—'}</div>
                <div><strong>Start:</strong> {p.startDate || '—'}</div>
                <div><strong>End:</strong> {p.endDate || '—'}</div>
              </div>
              {p.description && <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#6b7280' }}>{p.description}</p>}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', fontSize: '0.75rem', color: '#4b5563' }}>
                Owner: {users.find(u => u.id === p.projectOwnerId)?.fullName || 'N/A'} &nbsp;|&nbsp;
                Auditor: {users.find(u => u.id === p.auditorId)?.fullName || 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
