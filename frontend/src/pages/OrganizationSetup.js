import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizationApi, userApi, masterCategoriesApi } from '../services/api';

const INDUSTRIES = ['Real Estate'];

const DEFAULT_TREE = [
  {
    name: 'Revenue',
    children: ['Sales', 'Customer Payments'],
  },
  {
    name: 'Expense',
    children: [
      'Capital Expenditure (CapEx)',
      'Operating Expenses (OpEx)',
      'Payroll',
      'Vendor Payments',
    ],
  },
  {
    name: 'WIP',
    children: ['Construction in Progress', 'Ongoing Project Costs'],
  },
];

export default function OrganizationSetup() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [orgForm, setOrgForm] = useState({
    name: '', industry: 'Real Estate', country: '',
    taxId: '', fyStart: '', contactEmail: '', address: '',
  });
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', password: '' });

  // Category tree: [{ name, children: [string] }]
  const [tree, setTree] = useState(DEFAULT_TREE);
  const [newL1, setNewL1] = useState('');
  const [newL2, setNewL2] = useState({}); // { [l1Index]: string }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, userRes] = await Promise.all([
          organizationApi.get(user?.organizationId),
          userApi.getMe(),
        ]);
        const o = orgRes.data;
        setOrgForm({
          name: o.name || '', industry: 'Real Estate', country: o.country || '',
          taxId: o.taxId || '', fyStart: o.fyStart || '',
          contactEmail: o.contactEmail || '', address: o.address || '',
        });
        const u = userRes.data;
        setAdminForm({ fullName: u.fullName || '', email: u.email || '', password: '' });
      } catch (err) {
        console.error('Failed to load setup data', err);
      } finally {
        setFetching(false);
      }
    };
    if (user?.organizationId) fetchData();
    else setFetching(false);
  }, [user]);

  // ── Tree helpers ──
  const addL1 = () => {
    const name = newL1.trim();
    if (!name || tree.some(t => t.name === name)) return;
    setTree([...tree, { name, children: [] }]);
    setNewL1('');
  };

  const removeL1 = (idx) => setTree(tree.filter((_, i) => i !== idx));

  const addL2 = (idx) => {
    const name = (newL2[idx] || '').trim();
    if (!name || tree[idx].children.includes(name)) return;
    const updated = tree.map((t, i) =>
      i === idx ? { ...t, children: [...t.children, name] } : t
    );
    setTree(updated);
    setNewL2({ ...newL2, [idx]: '' });
  };

  const removeL2 = (l1Idx, childName) => {
    const updated = tree.map((t, i) =>
      i === l1Idx ? { ...t, children: t.children.filter(c => c !== childName) } : t
    );
    setTree(updated);
  };

  // ── Validation ──
  const validateGst = (gst) => {
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return !gst || gst.trim() === '' || regex.test(gst);
  };
  const validatePassword = (pass) => {
    if (!pass) return true;
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validateGst(orgForm.taxId)) {
      setMessage({ type: 'error', text: 'Invalid GST format (e.g. 22AAAAA0000A1Z5)' });
      return;
    }
    if (adminForm.password && !validatePassword(adminForm.password)) {
      setMessage({ type: 'error', text: 'Password must be 8+ chars with uppercase, lowercase, number and special character.' });
      return;
    }
    if (tree.length === 0) {
      setMessage({ type: 'error', text: 'Please define at least one audit category.' });
      return;
    }

    setLoading(true);
    try {
      await organizationApi.update(user.organizationId, orgForm);
      await masterCategoriesApi.saveTree({ categories: tree });

      const userUpdates = { fullName: adminForm.fullName, email: adminForm.email };
      if (adminForm.password.trim()) userUpdates.password = adminForm.password;
      const updatedUser = await userApi.updateMe(userUpdates);

      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      login({ ...stored, fullName: updatedUser.data.fullName, email: updatedUser.data.email });

      setMessage({ type: 'success', text: 'Setup completed! Redirecting...' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Setup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
    borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box', marginTop: '0.375rem',
  };
  const labelStyle = { display: 'block', fontWeight: '500', fontSize: '0.875rem', color: '#374151' };
  const fieldStyle = { marginBottom: '1.25rem' };
  const sectionStyle = { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' };

  if (fetching) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Organization Setup</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Complete your profile to start using the audit system.</p>
      </div>

      {message.text && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: '0.375rem', fontSize: '0.875rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Step 1: Organization Details ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#111827' }}>Step 1 — Organization Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Organization Name *</label>
              <input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} style={inputStyle} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Industry</label>
              <input
                value="Real Estate"
                readOnly
                style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Country *</label>
              <input value={orgForm.country} onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })} style={inputStyle} required placeholder="India" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>GST Number / Tax ID</label>
              <input value={orgForm.taxId} onChange={(e) => setOrgForm({ ...orgForm, taxId: e.target.value })} style={inputStyle} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Financial Year Start *</label>
              <input type="date" value={orgForm.fyStart} onChange={(e) => setOrgForm({ ...orgForm, fyStart: e.target.value })} style={inputStyle} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contact Email</label>
              <input type="email" value={orgForm.contactEmail} onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })} style={inputStyle} placeholder="finance@company.com" />
            </div>
          </div>
        </div>

        {/* ── Step 2: Audit Categories (2-level) ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#111827' }}>Step 2 — Audit Categories</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.25rem', marginTop: 0 }}>
            Define a two-level category hierarchy. Level 1 groups (e.g. Revenue) contain Level 2 sub-categories
            (e.g. Sales). Both levels can be selected when creating projects and transactions.
          </p>

          {/* Add L1 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="text" value={newL1}
              onChange={(e) => setNewL1(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addL1(); } }}
              placeholder="New Level 1 category (e.g. Tax)"
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
            <button type="button" onClick={addL1}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Add Group
            </button>
          </div>

          {/* Tree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tree.map((l1, idx) => (
              <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                {/* L1 header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', backgroundColor: '#1e40af', color: 'white' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{l1.name}</span>
                  <button type="button" onClick={() => removeL1(idx)}
                    style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '0.25rem', cursor: 'pointer', padding: '0.1rem 0.4rem', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                </div>

                {/* L2 children */}
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {l1.children.map(child => (
                      <span key={child} style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {child}
                        <button type="button" onClick={() => removeL2(idx, child)}
                          style={{ border: 'none', background: 'none', color: '#93c5fd', cursor: 'pointer', fontWeight: 'bold', padding: 0, lineHeight: 1 }}>
                          &times;
                        </button>
                      </span>
                    ))}
                    {l1.children.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>No sub-categories yet</span>
                    )}
                  </div>
                  {/* Add L2 */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      value={newL2[idx] || ''}
                      onChange={(e) => setNewL2({ ...newL2, [idx]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addL2(idx); } }}
                      placeholder={`Add sub-category under ${l1.name}`}
                      style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: '0.8rem', padding: '0.375rem 0.5rem' }}
                    />
                    <button type="button" onClick={() => addL2(idx)}
                      style={{ padding: '0.375rem 0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 3: Admin Profile ── */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#111827' }}>Step 3 — Administrator Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admin Name *</label>
              <input value={adminForm.fullName} onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })} style={inputStyle} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admin Email *</label>
              <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} style={inputStyle} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                New Password
                <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '0.25rem' }}>(leave blank to keep current)</span>
              </label>
              <input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} style={inputStyle} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '0.875rem', backgroundColor: loading ? '#6ee7b7' : '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '1rem' }}>
            {loading ? 'Saving...' : 'Complete Setup & Go to Dashboard'}
          </button>
          <button type="button" onClick={() => navigate('/')}
            style={{ padding: '0.875rem 1.5rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
