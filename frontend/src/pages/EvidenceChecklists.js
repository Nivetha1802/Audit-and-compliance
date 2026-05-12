import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye, Pencil, Trash2, X, CheckCircle2, Circle,
  Plus, ChevronDown, ArrowLeft, Save,
} from 'lucide-react';
import api, { masterCategoriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   Constants & helpers
───────────────────────────────────────────── */
const emptyForm = {
  name: '',
  categories: [],
  items: [{ description: '', mandatory: true }],
};

/** Build grouped options from flat category list */
function buildCategoryOptions(flatCats) {
  if (!flatCats || flatCats.length === 0) return [];
  const byId = {};
  flatCats.forEach(c => { byId[c.id] = c; });
  const l3 = flatCats.filter(c => c.level === 3);
  const groupMap = {};
  l3.forEach(item => {
    const l2 = byId[item.parentId];
    if (!l2) return;
    const l1 = byId[l2.parentId];
    const groupLabel = l1 ? `${l1.name} › ${l2.name}` : l2.name;
    if (!groupMap[groupLabel]) groupMap[groupLabel] = [];
    groupMap[groupLabel].push({ id: item.id, name: item.name });
  });
  return Object.entries(groupMap).map(([label, items]) => ({ label, items }));
}

/** Parse comma-separated description back to an array of category strings */
function parseCategories(description) {
  if (!description) return [];
  return description.split(',').map(s => s.trim()).filter(Boolean);
}

/* ─────────────────────────────────────────────
   Shared inline-style tokens
───────────────────────────────────────────── */
const S = {
  input: {
    width: '100%', padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem',
    fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none',
    backgroundColor: 'white',
  },
  label: {
    display: 'block', marginBottom: '0.375rem',
    fontWeight: '500', fontSize: '0.875rem', color: '#374151',
  },
  badge: (color = '#e0e7ff', text = '#3730a3') => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '0.2rem 0.6rem', borderRadius: '9999px',
    fontSize: '0.72rem', fontWeight: 600,
    backgroundColor: color, color: text,
  }),
  btn: (bg, color, border = 'none') => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.45rem 1rem', backgroundColor: bg, color,
    border, borderRadius: '0.375rem', cursor: 'pointer',
    fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap',
  }),
  iconBtn: (bg, color, border = 'none') => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '2rem', height: '2rem', backgroundColor: bg, color,
    border, borderRadius: '0.375rem', cursor: 'pointer',
    flexShrink: 0,
  }),
};

/* ─────────────────────────────────────────────────────────────
   TemplateModal
   Single popup that handles both VIEW and EDIT modes.
   mode: 'view' | 'edit'
─────────────────────────────────────────────────────────────── */
function TemplateModal({
  template,          // raw template object from the list
  viewItems,         // items for view mode (already fetched)
  loadingViewItems,  // true while view items are loading
  categoryGroups,    // for the edit category dropdown
  isAdmin,
  onClose,
  onDelete,
  onSaved,           // callback after successful save — receives updated template
}) {
  /* ── modal mode ── */
  const [mode, setMode] = useState('view'); // 'view' | 'edit'

  /* ── edit form state ── */
  const [form, setForm]         = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]     = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  /* ── Escape key closes the whole modal ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Switch to edit mode: load fresh items from API ── */
  const handleSwitchToEdit = async () => {
    setFormError('');
    setLoadingEdit(true);
    try {
      const res = await api.get(`/evidence-checklist/${template.id}/items`);
      const cleanItems = res.data.length > 0
        ? res.data.map(({ description, mandatory }) => ({ description, mandatory }))
        : [{ description: '', mandatory: true }];
      setForm({
        name:       template.name,
        categories: parseCategories(template.description),
        items:      cleanItems,
      });
      setMode('edit');
    } catch {
      setFormError('Failed to load template items for editing.');
    } finally {
      setLoadingEdit(false);
    }
  };

  /* ── Form helpers ── */
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { description: '', mandatory: true }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  /* ── Save edit ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim())            { setFormError('Please provide a template name.'); return; }
    if (form.categories.length === 0) { setFormError('Please select at least one category.'); return; }
    setSaving(true);
    try {
      const payload = {
        name:       form.name.trim(),
        categories: form.categories,
        items:      form.items.map(({ description, mandatory }) => ({ description, mandatory })),
      };
      await api.put(`/evidence-checklist/${template.id}`, payload);
      onSaved();   // parent re-fetches data and closes modal
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save template. Please try again.');
      setSaving(false);
    }
  };

  /* ── Derived view data ── */
  const categories     = parseCategories(template.description);
  const mandatoryCount = viewItems.filter(i => i.mandatory).length;
  const optionalCount  = viewItems.filter(i => !i.mandatory).length;

  /* ── Shared gradient header colour ── */
  const headerGradient = mode === 'edit'
    ? 'linear-gradient(135deg, #92400e 0%, #d97706 100%)'
    : 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)';

  return (
    /* ── Overlay ── */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* ── Modal card ── */}
      <div style={{
        backgroundColor: 'white', borderRadius: '0.75rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: '680px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ════════════════ HEADER ════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb',
          background: headerGradient,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: '0 0 0.25rem 0', fontSize: '0.68rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.09em',
            }}>
              {mode === 'edit' ? '✏️  Editing Template' : '📋  Checklist Template'}
            </p>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 700, wordBreak: 'break-word' }}>
              {mode === 'edit' ? (form.name || template.name) : template.name}
            </h2>
          </div>

          {/* Back to view button (edit mode only) */}
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => { setMode('view'); setFormError(''); }}
              style={{
                ...S.iconBtn('rgba(255,255,255,0.15)', 'white'),
                marginLeft: '0.5rem', gap: '0.35rem',
                width: 'auto', padding: '0.35rem 0.75rem',
                fontSize: '0.78rem', fontWeight: 500,
              }}
              title="Back to view"
            >
              <ArrowLeft size={14} /> View
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{ ...S.iconBtn('rgba(255,255,255,0.15)', 'white'), marginLeft: '0.5rem' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ════════════════ BODY ════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ─── VIEW MODE ─── */}
          {mode === 'view' && (
            <div style={{ padding: '1.5rem' }}>

              {/* Categories */}
              <section style={{ marginBottom: '1.5rem' }}>
                <p style={sectionLabel}>Linked Categories</p>
                {categories.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>— No categories linked —</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {categories.map(cat => (
                      <span key={cat} style={S.badge('#dbeafe', '#1e40af')}>{cat}</span>
                    ))}
                  </div>
                )}
              </section>

              {/* Summary pills */}
              {!loadingViewItems && viewItems.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={summaryPill('#f0fdf4', '#bbf7d0', '#15803d')}>✓ {mandatoryCount} Mandatory</div>
                  <div style={summaryPill('#fefce8', '#fef08a', '#854d0e')}>○ {optionalCount} Optional</div>
                  <div style={summaryPill('#f3f4f6', '#e5e7eb', '#374151')}>Σ {viewItems.length} Total</div>
                </div>
              )}

              {/* Evidence items */}
              <section>
                <p style={sectionLabel}>Evidence Items</p>
                {loadingViewItems ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    &nbsp;Loading items…
                  </div>
                ) : viewItems.length === 0 ? (
                  <div style={{
                    padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem',
                    color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center',
                    border: '1px dashed #e5e7eb',
                  }}>
                    No evidence items defined for this template.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {viewItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          backgroundColor: item.mandatory ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${item.mandatory ? '#bbf7d0' : '#e5e7eb'}`,
                          borderRadius: '0.5rem',
                        }}
                      >
                        {/* Index bubble */}
                        <span style={{
                          flexShrink: 0, width: '1.6rem', height: '1.6rem',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: item.mandatory ? '#16a34a' : '#9ca3af',
                          color: 'white', fontSize: '0.7rem', fontWeight: 700,
                        }}>
                          {idx + 1}
                        </span>

                        {/* Description */}
                        <span style={{ flex: 1, fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                          {item.description || <em style={{ color: '#9ca3af' }}>Untitled item</em>}
                        </span>

                        {/* Badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.2rem 0.55rem', borderRadius: '9999px', flexShrink: 0,
                          fontSize: '0.7rem', fontWeight: 600,
                          backgroundColor: item.mandatory ? '#dcfce7' : '#f3f4f6',
                          color: item.mandatory ? '#15803d' : '#6b7280',
                        }}>
                          {item.mandatory
                            ? <><CheckCircle2 size={11} /> Mandatory</>
                            : <><Circle size={11} /> Optional</>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ─── EDIT MODE ─── */}
          {mode === 'edit' && (
            <div style={{ padding: '1.5rem' }}>

              {/* Loading state while switching to edit */}
              {loadingEdit ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                  Loading template data…
                </div>
              ) : (
                <form id="edit-checklist-form" onSubmit={handleSave}>

                  {/* Error banner */}
                  {formError && (
                    <div style={{
                      marginBottom: '1rem', padding: '0.75rem',
                      backgroundColor: '#fee2e2', color: '#991b1b',
                      borderRadius: '0.375rem', fontSize: '0.875rem',
                      border: '1px solid #fca5a5',
                    }}>
                      {formError}
                    </div>
                  )}

                  {/* Name + Categories row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

                    {/* Template Name */}
                    <div>
                      <label style={S.label}>Template Name *</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        style={S.input}
                        placeholder="e.g. GST Compliance Checklist"
                        required
                      />
                    </div>

                    {/* Categories multi-select */}
                    <div>
                      <label style={S.label}>
                        Linked Categories *{' '}
                        <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>(select one or more)</span>
                      </label>
                      {categoryGroups.length === 0 ? (
                        <div style={{
                          padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7',
                          color: '#92400e', borderRadius: '0.375rem',
                          fontSize: '0.8rem', border: '1px solid #fde68a',
                        }}>
                          No categories found. Complete Organisation Setup first.
                        </div>
                      ) : (
                        <>
                          {/* Selected category pills */}
                          {form.categories.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                              {form.categories.map(cat => (
                                <span key={cat} style={{ ...S.badge('#e0e7ff', '#3730a3'), gap: '0.3rem' }}>
                                  {cat}
                                  <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 700, padding: 0, lineHeight: 1, fontSize: '0.85rem' }}
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Dropdown to add */}
                          <div style={{ position: 'relative' }}>
                            <select
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val && !form.categories.includes(val))
                                  setForm(f => ({ ...f, categories: [...f.categories, val] }));
                              }}
                              style={{ ...S.input, paddingRight: '2rem', appearance: 'none', cursor: 'pointer' }}
                            >
                              <option value="">— Add a category —</option>
                              {categoryGroups.map((group, gi) => (
                                <optgroup key={gi} label={group.label}>
                                  {group.items
                                    .filter(item => !form.categories.includes(item.name))
                                    .map(item => (
                                      <option key={item.id} value={item.name}>{item.name}</option>
                                    ))}
                                </optgroup>
                              ))}
                            </select>
                            <ChevronDown size={14} style={{
                              position: 'absolute', right: '0.6rem', top: '50%',
                              transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none',
                            }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Evidence items */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label style={{ ...S.label, margin: 0 }}>
                        Evidence Items
                        <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>
                          ({form.items.length} item{form.items.length !== 1 ? 's' : ''})
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={addItem}
                        style={S.btn('#f0fdf4', '#15803d', '1px solid #bbf7d0')}
                      >
                        <Plus size={13} /> Add Item
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {form.items.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex', gap: '0.75rem', alignItems: 'center',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#f9fafb', borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 600, minWidth: '1.2rem' }}>
                            {index + 1}.
                          </span>
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder={`Evidence item (e.g. Invoice Copy)`}
                            style={{ ...S.input, flex: 1 }}
                            required
                          />
                          <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.8rem', whiteSpace: 'nowrap',
                            color: '#374151', cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={item.mandatory}
                              onChange={(e) => updateItem(index, 'mandatory', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            Mandatory
                          </label>
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              style={S.iconBtn('#fee2e2', '#991b1b')}
                              title="Remove item"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </form>
              )}
            </div>
          )}
        </div>

        {/* ════════════════ FOOTER ════════════════ */}
        {isAdmin && (
          <div style={{
            display: 'flex',
            justifyContent: mode === 'edit' ? 'space-between' : 'flex-end',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            flexShrink: 0,
          }}>
            {/* ── VIEW mode footer ── */}
            {mode === 'view' && (
              <>
                <button
                  onClick={() => { onClose(); onDelete(template.id); }}
                  style={S.btn('#fee2e2', '#991b1b', '1px solid #fca5a5')}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  onClick={handleSwitchToEdit}
                  disabled={loadingEdit}
                  style={S.btn('#2563eb', 'white')}
                >
                  <Pencil size={14} /> {loadingEdit ? 'Loading…' : 'Edit Template'}
                </button>
              </>
            )}

            {/* ── EDIT mode footer ── */}
            {mode === 'edit' && !loadingEdit && (
              <>
                {/* Left side: discard */}
                <button
                  type="button"
                  onClick={() => { setMode('view'); setFormError(''); }}
                  style={S.btn('white', '#6b7280', '1px solid #d1d5db')}
                >
                  <ArrowLeft size={14} /> Discard Changes
                </button>

                {/* Right side: save */}
                <button
                  type="submit"
                  form="edit-checklist-form"
                  disabled={saving}
                  style={S.btn(saving ? '#6b7280' : '#10b981', 'white')}
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* small style helpers for the modal */
const sectionLabel = {
  margin: '0 0 0.6rem 0', fontSize: '0.72rem', fontWeight: 700,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em',
};
const summaryPill = (bg, border, color) => ({
  padding: '0.45rem 1rem', borderRadius: '0.5rem',
  backgroundColor: bg, border: `1px solid ${border}`,
  fontSize: '0.8rem', fontWeight: 600, color,
});

/* ─────────────────────────────────────────────
   Main page component
───────────────────────────────────────────── */
export default function ChecklistTemplates() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  /* ── Data state ── */
  const [templates,       setTemplates]       = useState([]);
  const [categoryGroups,  setCategoryGroups]  = useState([]);
  const [loading,         setLoading]         = useState(true);

  /* ── Create form (top panel) ── */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  /* ── Modal state ── */
  const [modalTemplate,     setModalTemplate]     = useState(null);
  const [modalViewItems,    setModalViewItems]     = useState([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

  /* ── Fetch all templates + categories + item counts ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, catsRes] = await Promise.all([
        api.get('/evidence-checklist'),
        masterCategoriesApi.getAll(),
      ]);
      const tList = templatesRes.data;
      setTemplates(tList);
      setCategoryGroups(buildCategoryOptions(catsRes.data));
    } catch (err) {
      console.error('Error fetching checklist data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Open view modal for a template ── */
  const handleView = async (t) => {
    setModalTemplate(t);
    setModalViewItems([]);
    setLoadingModalItems(true);
    try {
      const res = await api.get(`/evidence-checklist/${t.id}/items`);
      setModalViewItems(res.data.map(({ description, mandatory }) => ({ description, mandatory })));
    } catch {
      setModalViewItems([]);
    } finally {
      setLoadingModalItems(false);
    }
  };

  /* ── Close modal ── */
  const handleCloseModal = () => {
    setModalTemplate(null);
    setModalViewItems([]);
    setLoadingModalItems(false);
  };

  /* ── After a successful edit save inside the modal ── */
  const handleModalSaved = () => {
    handleCloseModal();
    fetchData();
  };

  /* ── Delete (called from inside modal) ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? This action cannot be undone.')) return;
    try {
      await api.delete(`/evidence-checklist/${id}`);
      fetchData();
    } catch {
      alert('Failed to delete template.');
    }
  };

  /* ── Create form helpers ── */
  const addCreateItem    = () => setCreateForm(f => ({ ...f, items: [...f.items, { description: '', mandatory: true }] }));
  const removeCreateItem = (i) => setCreateForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateCreateItem = (i, field, value) =>
    setCreateForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const handleCancelCreate = () => {
    setShowCreate(false);
    setCreateForm(emptyForm);
    setCreateError('');
  };

  /* ── Submit create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim())            { setCreateError('Please provide a template name.'); return; }
    if (createForm.categories.length === 0) { setCreateError('Please select at least one category.'); return; }
    setCreating(true);
    try {
      const payload = {
        name:       createForm.name.trim(),
        categories: createForm.categories,
        items:      createForm.items.map(({ description, mandatory }) => ({ description, mandatory })),
      };
      await api.post('/evidence-checklist', payload);
      handleCancelCreate();
      fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create template. Please try again.');
      setCreating(false);
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  if (loading && templates.length === 0) {
    return (
      <div style={{ padding: '3rem', color: '#6b7280', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        Loading checklist templates…
      </div>
    );
  }

  return (
    <div>
      {/* ══════════ Page header ══════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
            Evidence Checklists
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Manage reusable checklist templates for evidence collection
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={showCreate ? handleCancelCreate : () => setShowCreate(true)}
            style={showCreate
              ? S.btn('#f3f4f6', '#374151', '1px solid #d1d5db')
              : S.btn('#2563eb', 'white')
            }
          >
            {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Checklist</>}
          </button>
        )}
      </div>

      {/* ══════════ Create form panel ══════════ */}
      {showCreate && isAdmin && (
        <div style={{
          backgroundColor: 'white', borderRadius: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: '1.5rem', overflow: 'hidden',
        }}>
          {/* Form header */}
          <div style={{
            padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)',
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              ➕  Create New Checklist Template
            </h3>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {createError && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem',
                backgroundColor: '#fee2e2', color: '#991b1b',
                borderRadius: '0.375rem', fontSize: '0.875rem',
                border: '1px solid #fca5a5',
              }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              {/* Name + Categories */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={S.label}>Template Name *</label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    style={S.input}
                    placeholder="e.g. GST Compliance Checklist"
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>
                    Linked Categories *{' '}
                    <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>(select one or more)</span>
                  </label>
                  {categoryGroups.length === 0 ? (
                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.375rem', fontSize: '0.8rem', border: '1px solid #fde68a' }}>
                      No categories found. Complete Organisation Setup first.
                    </div>
                  ) : (
                    <>
                      {createForm.categories.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                          {createForm.categories.map(cat => (
                            <span key={cat} style={{ ...S.badge('#e0e7ff', '#3730a3'), gap: '0.3rem' }}>
                              {cat}
                              <button
                                type="button"
                                onClick={() => setCreateForm(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 700, padding: 0, lineHeight: 1, fontSize: '0.85rem' }}
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ position: 'relative' }}>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !createForm.categories.includes(val))
                              setCreateForm(f => ({ ...f, categories: [...f.categories, val] }));
                          }}
                          style={{ ...S.input, paddingRight: '2rem', appearance: 'none', cursor: 'pointer' }}
                        >
                          <option value="">— Add a category —</option>
                          {categoryGroups.map((group, gi) => (
                            <optgroup key={gi} label={group.label}>
                              {group.items
                                .filter(item => !createForm.categories.includes(item.name))
                                .map(item => (
                                  <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Evidence items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ ...S.label, margin: 0 }}>Evidence Items</label>
                  <button type="button" onClick={addCreateItem} style={S.btn('#f0fdf4', '#15803d', '1px solid #bbf7d0')}>
                    <Plus size={13} /> Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {createForm.items.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex', gap: '0.75rem', alignItems: 'center',
                      padding: '0.5rem 0.75rem', backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem', border: '1px solid #e5e7eb',
                    }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 600, minWidth: '1.2rem' }}>{index + 1}.</span>
                      <input
                        value={item.description}
                        onChange={(e) => updateCreateItem(index, 'description', e.target.value)}
                        placeholder={`Evidence item (e.g. Invoice Copy)`}
                        style={{ ...S.input, flex: 1 }}
                        required
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', whiteSpace: 'nowrap', color: '#374151', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.mandatory}
                          onChange={(e) => updateCreateItem(index, 'mandatory', e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Mandatory
                      </label>
                      {createForm.items.length > 1 && (
                        <button type="button" onClick={() => removeCreateItem(index)} style={S.iconBtn('#fee2e2', '#991b1b')} title="Remove item">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={creating} style={S.btn(creating ? '#6b7280' : '#10b981', 'white')}>
                  <Plus size={14} /> {creating ? 'Creating…' : 'Create Template'}
                </button>
                <button type="button" onClick={handleCancelCreate} style={S.btn('white', '#374151', '1px solid #d1d5db')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ Templates table ══════════ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb', overflow: 'hidden',
      }}>
        {/* Table toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1.25rem', borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </span>
          {loading && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Refreshing…</span>
          )}
        </div>

        {templates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <p style={{ margin: 0, fontWeight: 500 }}>No checklist templates yet.</p>
            {isAdmin && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                Click <strong>+ New Checklist</strong> to create your first template.
              </p>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Group Name</th>
                <th style={thStyle}>Linked Categories</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, idx) => {
                const cats  = parseCategories(t.description);
                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* # */}
                    <td style={{ ...tdStyle, width: '3rem', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{t.name}</span>
                    </td>

                    {/* Categories */}
                    <td style={tdStyle}>
                      {cats.length === 0 ? (
                        <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {cats.slice(0, 3).map(cat => (
                            <span key={cat} style={S.badge('#dbeafe', '#1e40af')}>{cat}</span>
                          ))}
                          {cats.length > 3 && (
                            <span style={S.badge('#e5e7eb', '#6b7280')}>+{cats.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => handleView(t)}
                        style={S.iconBtn('#eff6ff', '#2563eb', '1px solid #bfdbfe')}
                        title="View / Edit details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════ Template Modal (View + Edit) ══════════ */}
      {modalTemplate && (
        <TemplateModal
          template={modalTemplate}
          viewItems={modalViewItems}
          loadingViewItems={loadingModalItems}
          categoryGroups={categoryGroups}
          isAdmin={isAdmin}
          onClose={handleCloseModal}
          onDelete={handleDelete}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}

/* ── Table style constants ── */
const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.875rem 1rem',
  fontSize: '0.875rem',
  color: '#374151',
  verticalAlign: 'middle',
};
