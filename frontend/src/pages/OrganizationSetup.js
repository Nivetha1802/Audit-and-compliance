import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizationApi, userApi, masterCategoriesApi } from '../services/api';

const DEFAULT_TREE = [
  {
    name: 'Expense',
    children: [
      { name: 'Vendor Payments (Construction & Procurement)', children: ['Cement','Steel','Bricks & Blocks','Sand & Aggregates','Ready Mix Concrete (RMC)','Tiles & Flooring','Electrical Materials','Plumbing Materials','Paint & Finishing Materials','Glass & Aluminium','Hardware & Fittings','Construction Chemicals','Wood & Carpentry Materials'] },
      { name: 'Contractor Payments', children: ['Civil Contractor','Electrical Contractor','Plumbing Contractor','Interior Contractor','HVAC Contractor','Landscaping Contractor','Waterproofing Contractor'] },
      { name: 'Payroll', children: ['Site Staff Salaries','Corporate Staff Salaries','Contract Labour Wages','Consultant Fees (Architect, Engineer)'] },
      { name: 'Operating Expenses', children: ['Office Rent','Utilities (Electricity, Water)','Internet & IT Expenses','Travel & Conveyance','Marketing & Advertising','Legal & Professional Fees','Insurance','Maintenance & Repairs','Security Services','Admin Expenses'] },
      { name: 'Capital Expenditure (CapEx)', children: ['Land Purchase','Machinery & Equipment','Office Infrastructure','Vehicles','Furniture & Fixtures','IT Systems & Software'] },
      { name: 'Tax & Compliance', children: ['GST Payments','TDS Payments','Property Tax','Stamp Duty & Registration','Other Government Fees'] },
    ],
  },
  {
    name: 'Revenue',
    children: [
      { name: 'Sales / Customer Payments', children: ['Flat / Unit Sales','Plot Sales','Commercial Property Sales','Parking Charges','Amenities Charges (Clubhouse, etc.)','Maintenance Advance','Booking Advance'] },
      { name: 'Other Income', children: ['Rental Income','Interest Income','Penalty / Late Fees','Miscellaneous Income'] },
    ],
  },
  {
    name: 'WIP',
    children: [
      { name: 'Construction Costs', children: ['Material Consumption','Labour Cost','Contractor Work in Progress','Site Overheads'] },
      { name: 'Project Development Costs', children: ['Architect & Design Cost','Approval & Licensing Fees','Site Development Expenses','Project Management Cost'] },
      { name: 'Inventory / Progress Tracking', children: ['Unsold Inventory','Construction in Progress','Completed Units (Unsold)'] },
    ],
  },
];

function transformToTree(flatList) {
  if (!flatList || flatList.length === 0) return null;
  const l1 = flatList.filter(c => c.level === 1);
  const l2 = flatList.filter(c => c.level === 2);
  const l3 = flatList.filter(c => c.level === 3);
  return l1.map(p => ({
    name: p.name,
    children: l2.filter(c => String(c.parentId) === String(p.id)).map(s => ({
      name: s.name,
      children: l3.filter(c => String(c.parentId) === String(s.id)).map(i => i.name),
    })),
  }));
}

export default function OrganizationSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage]   = useState({ type: '', text: '' });

  const [orgForm, setOrgForm] = useState({
    name: '', industry: 'Real Estate', country: '',
    taxId: '', fyStart: '', contactEmail: '', address: '',
  });
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', password: '' });

  const [tree, setTree]     = useState([]);
  const [newL1, setNewL1]   = useState('');
  const [newL2, setNewL2]   = useState({});
  const [newL3, setNewL3]   = useState({});
  const [editState, setEditState] = useState({ type: null, l1Idx: null, l2Idx: null, l3Idx: null, value: '' });

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, userRes, catRes] = await Promise.all([
          organizationApi.get(user?.organizationId),
          userApi.getMe(),
          masterCategoriesApi.getAll(),
        ]);
        const o = orgRes.data;
        setOrgForm({
          name: o.name || '', industry: 'Real Estate', country: o.country || '',
          taxId: o.taxId || '', fyStart: o.fyStart || '',
          contactEmail: o.contactEmail || '', address: o.address || '',
        });
        const u = userRes.data;
        setAdminForm({ fullName: u.fullName || '', email: u.email || '', password: '' });
        const saved = transformToTree(catRes.data);
        setTree(saved || DEFAULT_TREE);
      } catch (err) {
        console.error('Failed to load setup data', err);
        setTree(DEFAULT_TREE);
      } finally {
        setFetching(false);
      }
    };
    if (user?.organizationId) fetchData();
    else setFetching(false);
  }, [user]);

  // ── Tree helpers ───────────────────────────────────────────────────────────
  const addL1 = () => {
    const name = newL1.trim();
    if (!name) return;
    if (tree.some(t => t.name.toLowerCase() === name.toLowerCase())) { alert('Category already exists!'); return; }
    setTree([...tree, { name, children: [] }]);
    setNewL1('');
  };

  const addL2 = (l1Idx) => {
    const name = (newL2[l1Idx] || '').trim();
    if (!name) return;
    const updated = [...tree];
    const target = { ...updated[l1Idx] };
    if (target.children?.some(c => c.name.toLowerCase() === name.toLowerCase())) { alert('Subcategory already exists!'); return; }
    target.children = [...(target.children || []), { name, children: [] }];
    updated[l1Idx] = target;
    setTree(updated);
    setNewL2({ ...newL2, [l1Idx]: '' });
  };

  const addL3 = (l1Idx, l2Idx) => {
    const key = `${l1Idx}-${l2Idx}`;
    const name = (newL3[key] || '').trim();
    if (!name) return;
    const updated = [...tree];
    const tL1 = { ...updated[l1Idx] };
    const tL2 = { ...tL1.children[l2Idx] };
    if (tL2.children?.some(i => i.toLowerCase() === name.toLowerCase())) { alert('Line item already exists!'); return; }
    tL2.children = [...(tL2.children || []), name];
    tL1.children = [...tL1.children];
    tL1.children[l2Idx] = tL2;
    updated[l1Idx] = tL1;
    setTree(updated);
    setNewL3({ ...newL3, [key]: '' });
  };

  const removeL1 = (idx) => setTree(tree.filter((_, i) => i !== idx));

  const removeL2 = (l1Idx, l2Idx) => {
    const updated = [...tree];
    updated[l1Idx] = { ...updated[l1Idx], children: updated[l1Idx].children.filter((_, i) => i !== l2Idx) };
    setTree(updated);
  };

  const removeL3 = (l1Idx, l2Idx, l3Name) => {
    const updated = [...tree];
    const tL1 = { ...updated[l1Idx] };
    const tL2 = { ...tL1.children[l2Idx] };
    tL2.children = tL2.children.filter(n => n !== l3Name);
    tL1.children = [...tL1.children];
    tL1.children[l2Idx] = tL2;
    updated[l1Idx] = tL1;
    setTree(updated);
  };

  const startEdit = (type, l1Idx, l2Idx = null, l3Idx = null, value = '') =>
    setEditState({ type, l1Idx, l2Idx, l3Idx, value });

  const cancelEdit = () => setEditState({ type: null, l1Idx: null, l2Idx: null, l3Idx: null, value: '' });

  const saveEdit = () => {
    const { type, l1Idx, l2Idx, l3Idx, value } = editState;
    const name = value.trim();
    if (!name) return;
    const updated = [...tree];
    if (type === 'L1') {
      updated[l1Idx] = { ...updated[l1Idx], name };
    } else if (type === 'L2') {
      const l1 = { ...updated[l1Idx] };
      l1.children = [...l1.children];
      l1.children[l2Idx] = { ...l1.children[l2Idx], name };
      updated[l1Idx] = l1;
    } else if (type === 'L3') {
      const l1 = { ...updated[l1Idx] };
      const l2 = { ...l1.children[l2Idx] };
      l2.children = [...l2.children];
      l2.children[l3Idx] = name;
      l1.children = [...l1.children];
      l1.children[l2Idx] = l2;
      updated[l1Idx] = l1;
    }
    setTree(updated);
    cancelEdit();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Warn if the tree has no L3 items — saving would wipe existing L3 categories
    const l3Count = tree.reduce((acc, l1) =>
      acc + (l1.children || []).reduce((a, l2) => a + (l2.children || []).length, 0), 0);
    if (l3Count === 0) {
      const confirmed = window.confirm(
        'Warning: Your category tree has no Level 3 items (line items like Cement, Steel, etc.).\n\n' +
        'Saving now will permanently delete any existing Level 3 categories from the database.\n\n' +
        'Are you sure you want to continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      await organizationApi.update(user.organizationId, orgForm);
      await masterCategoriesApi.saveTree({ categories: tree });
      const userUpdates = { fullName: adminForm.fullName, email: adminForm.email };
      if (adminForm.password.trim()) userUpdates.password = adminForm.password;
      await userApi.updateMe(userUpdates);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db',
    borderRadius: '0.375rem', fontSize: '0.9rem', boxSizing: 'border-box', marginTop: '0.4rem',
  };
  const labelStyle  = { display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#4b5563' };
  const sectionStyle = { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '1.5rem' };

  if (fetching) return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading Organization Settings...</div>;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.875rem', color: '#111827' }}>Organization Settings</h1>
        <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0' }}>Manage profile, tax details, audit category hierarchy, and admin account.</p>
      </div>

      {message.text && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.5rem', fontWeight: '500',
          backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}` }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Step 1: Business Profile ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            Business Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Organization Name *</label>
              <input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <input value="Real Estate" readOnly style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={labelStyle}>Country *</label>
              <input value={orgForm.country} onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })} style={inputStyle} required placeholder="India" />
            </div>
            <div>
              <label style={labelStyle}>GST / Tax ID</label>
              <input value={orgForm.taxId} onChange={(e) => setOrgForm({ ...orgForm, taxId: e.target.value })} style={inputStyle} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label style={labelStyle}>Financial Year Start *</label>
              <input type="date" value={orgForm.fyStart} onChange={(e) => setOrgForm({ ...orgForm, fyStart: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Contact Email *</label>
              <input type="email" value={orgForm.contactEmail} onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })} style={inputStyle} required />
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
          </div>
        </div>

        {/* ── Step 2: Audit Hierarchy ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#111827' }}>Audit Category Hierarchy</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Configure 3 levels: Root Group → Sub-category → Line Item.
          </p>

          {/* Add L1 */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
            <input type="text" value={newL1} onChange={(e) => setNewL1(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addL1())}
              placeholder="New Root Category (Level 1)" style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
            <button type="button" onClick={addL1}
              style={{ padding: '0 1.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}>
              + Add Root
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {tree.map((l1, l1Idx) => (
              <div key={l1Idx} style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                {/* L1 header */}
                <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#1e3a8a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {editState.type === 'L1' && editState.l1Idx === l1Idx ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                      <input value={editState.value} onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                        style={{ ...inputStyle, marginTop: 0, color: 'black', flex: 1 }} autoFocus />
                      <button type="button" onClick={saveEdit} style={{ padding: '0 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Save</button>
                      <button type="button" onClick={cancelEdit} style={{ padding: '0 0.75rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: '700', letterSpacing: '0.025em' }}>LEVEL 1: {l1.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => startEdit('L1', l1Idx, null, null, l1.name)}
                          style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => removeL1(l1Idx)}
                          style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* L2 children */}
                <div style={{ padding: '1.25rem', backgroundColor: '#fcfcfc' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {l1.children?.map((l2, l2Idx) => (
                      <div key={l2Idx} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        {/* L2 header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          {editState.type === 'L2' && editState.l1Idx === l1Idx && editState.l2Idx === l2Idx ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                              <input value={editState.value} onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                                style={{ ...inputStyle, marginTop: 0, height: '32px', flex: 1 }} autoFocus />
                              <button type="button" onClick={saveEdit} style={{ height: '32px', padding: '0 0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>Save</button>
                              <button type="button" onClick={cancelEdit} style={{ height: '32px', padding: '0 0.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>LEVEL 2: {l2.name}</span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" onClick={() => startEdit('L2', l1Idx, l2Idx, null, l2.name)}
                                  style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}>Edit</button>
                                <button type="button" onClick={() => removeL2(l1Idx, l2Idx)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}>Remove</button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* L3 chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          {l2.children?.map((l3, l3Idx) => (
                            <span key={l3Idx} style={{ backgroundColor: '#f3f4f6', color: '#1f2937', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid #e5e7eb' }}>
                              {editState.type === 'L3' && editState.l1Idx === l1Idx && editState.l2Idx === l2Idx && editState.l3Idx === l3Idx ? (
                                <>
                                  <input value={editState.value} onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                                    style={{ border: 'none', background: 'white', fontSize: '0.75rem', width: '80px', outline: 'none' }} autoFocus />
                                  <button type="button" onClick={saveEdit} style={{ border: 'none', background: 'none', color: '#10b981', cursor: 'pointer', fontWeight: '700' }}>✓</button>
                                  <button type="button" onClick={cancelEdit} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700' }}>×</button>
                                </>
                              ) : (
                                <>
                                  <span onClick={() => startEdit('L3', l1Idx, l2Idx, l3Idx, l3)} style={{ cursor: 'pointer' }} title="Click to edit">{l3}</span>
                                  <button type="button" onClick={() => removeL3(l1Idx, l2Idx, l3)}
                                    style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}>&times;</button>
                                </>
                              )}
                            </span>
                          ))}
                        </div>

                        {/* Add L3 */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            placeholder="Add line item (Level 3)"
                            value={newL3[`${l1Idx}-${l2Idx}`] || ''}
                            onChange={(e) => setNewL3({ ...newL3, [`${l1Idx}-${l2Idx}`]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addL3(l1Idx, l2Idx))}
                            style={{ ...inputStyle, marginTop: 0, fontSize: '0.85rem', height: '32px', flex: 1 }}
                          />
                          <button type="button" onClick={() => addL3(l1Idx, l2Idx)}
                            style={{ height: '32px', padding: '0 0.75rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                            + L3
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add L2 */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        placeholder={`New sub-category under ${l1.name}`}
                        value={newL2[l1Idx] || ''}
                        onChange={(e) => setNewL2({ ...newL2, [l1Idx]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addL2(l1Idx))}
                        style={{ ...inputStyle, marginTop: 0, flex: 1, height: '38px', borderStyle: 'dashed' }}
                      />
                      <button type="button" onClick={() => addL2(l1Idx)}
                        style={{ height: '38px', padding: '0 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        + Sub
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 3: Administrator Profile ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            Administrator Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Admin Name *</label>
              <input value={adminForm.fullName} onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })} style={inputStyle} required placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Admin Email *</label>
              <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} style={inputStyle} required placeholder="admin@company.com" />
            </div>
            <div>
              <label style={labelStyle}>
                New Password
                <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '0.4rem', fontSize: '0.8rem' }}>(leave blank to keep current)</span>
              </label>
              <input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} style={inputStyle} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '1.25rem', backgroundColor: loading ? '#6ee7b7' : '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '1.1rem' }}>
          {loading ? 'Saving All Changes...' : 'Save & Update Settings'}
        </button>
      </form>
    </div>
  );
}
