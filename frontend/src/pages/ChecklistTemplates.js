import React, { useState, useEffect } from 'react';
import api, { masterCategoriesApi } from '../services/api';

const emptyForm = {
  name: '',
  category: '',
  items: [{ description: '', mandatory: true }],
};

/** Build grouped tree from flat list */
function buildTree(flatCats) {
  const l1 = flatCats.filter(c => c.level === 1);
  return l1.map(parent => ({
    ...parent,
    children: flatCats.filter(c => c.parentId === parent.id),
  }));
}

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState([]);
  const [catTree, setCatTree] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, catsRes] = await Promise.all([
        api.get('/checklist-templates'),
        masterCategoriesApi.getAll(),
      ]);
      setTemplates(templatesRes.data);
      setCatTree(buildTree(catsRes.data));
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', mandatory: true }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    setForm({ ...form, items: form.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) });
  };

  const handleEdit = async (t) => {
    try {
      const itemsRes = await api.get(`/checklist-templates/${t.id}/items`);
      setEditingId(t.id);
      setForm({
        name: t.name,
        category: t.description || '',
        items: itemsRes.data.length > 0 ? itemsRes.data : [{ description: '', mandatory: true }],
      });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Error loading template details');
    }
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.category) { setError('Please fill in the name and select a category'); return; }
    try {
      if (editingId) { await api.put(`/checklist-templates/${editingId}`, form); }
      else { await api.post('/checklist-templates', form); }
      handleCancel();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/checklist-templates/${id}`); fetchData(); }
    catch (err) { alert('Failed to delete template'); }
  };

  const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem' };

  if (loading && templates.length === 0) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Checklist Templates</h1>
        <button onClick={showForm ? handleCancel : () => setShowForm(true)}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
          {showForm ? 'Cancel' : '+ New Template'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Template' : 'Create Checklist Template'}</h3>
          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Template Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Link to Category *</label>
                {catTree.length === 0 ? (
                  <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                    No categories found. Complete Organization Setup first.
                  </div>
                ) : (
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle} required>
                    <option value="">— Select Category —</option>
                    {catTree.map(l1 => (
                      <optgroup key={l1.id} label={`▸ ${l1.name}`}>
                        {/* L1 itself as selectable option */}
                        <option value={l1.name}>{l1.name} (all)</option>
                        {/* L2 children */}
                        {l1.children.map(l2 => (
                          <option key={l2.id} value={l2.name}>&nbsp;&nbsp;{l2.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Checklist Items</label>
                <button type="button" onClick={addItem}
                  style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  + Add Item
                </button>
              </div>
              {form.items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder={`Item ${index + 1} (e.g. Invoice Copy)`}
                    style={{ ...inputStyle, flex: 1 }}
                    required
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={item.mandatory} onChange={(e) => updateItem(index, 'mandatory', e.target.checked)} />
                    Mandatory
                  </label>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit"
              style={{ padding: '0.625rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
              {editingId ? 'Update Template' : 'Create Template'}
            </button>
          </form>
        </div>
      )}

      {/* Template cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {templates.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#6b7280', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            No templates yet. Create your first checklist template.
          </div>
        ) : templates.map((t) => (
          <div key={t.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{t.name}</h3>
                {t.description && (
                  <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '0.25rem' }}>
                    {t.description}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(t)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                <button onClick={() => handleDelete(t.id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
