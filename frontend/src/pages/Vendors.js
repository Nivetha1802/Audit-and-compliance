import React, { useState, useEffect } from 'react';
import { vendorsApi, masterCategoriesApi } from '../services/api';
import { FiCheckCircle, FiShield, FiAlertTriangle } from 'react-icons/fi';
import { FiPlus, FiTrash2, FiEdit2, FiEye, FiUser, FiCreditCard, FiPhone, FiX } from 'react-icons/fi';

// Build grouped options: optgroup = "L1 › L2", options = L3 names only.
function buildCategoryOptions(flatList) {
    if (!flatList || flatList.length === 0) return [];
    const byId = {};
    flatList.forEach(c => { byId[c.id] = c; });
    const l3 = flatList.filter(c => c.level === 3);
    const groupMap = {};
    l3.forEach(item => {
        const l2 = byId[item.parentId];
        if (!l2) return;
        const l1 = byId[l2.parentId];
        const groupLabel = l1 ? `${l1.name} › ${l2.name}` : l2.name;
        if (!groupMap[groupLabel]) groupMap[groupLabel] = [];
        groupMap[groupLabel].push(item.name);
    });
    return Object.entries(groupMap).map(([label, items]) => ({ label, items }));
}

const EMPTY_FORM = {
    customVendorId: '',
    name: '',
    vendorType: 'Supplier',
    category: '',
    gstNumber: '',
    pan: '',
    bankAccountDetails: '',
    contactDetails: '',
};

const TYPE_STYLES = {
    Supplier:   'bg-blue-100 text-blue-700',
    Contractor: 'bg-orange-100 text-orange-700',
    Consultant: 'bg-purple-100 text-purple-700',
};

// ── Shared form fields used by both Create and Edit modals ──────────────────
function VendorForm({ formData, setFormData, categoryGroups, onSubmit, onCancel, submitLabel }) {
    const field = 'w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
    return (
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Vendor ID *</label>
                <input required className={field} value={formData.customVendorId}
                    onChange={e => setFormData({ ...formData, customVendorId: e.target.value })}
                    placeholder="e.g. VEND-001" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Vendor Name *</label>
                <input required className={field} value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Legal entity name" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Vendor Type *</label>
                <select required className={field} value={formData.vendorType}
                    onChange={e => setFormData({ ...formData, vendorType: e.target.value })}>
                    <option value="Supplier">Supplier</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Consultant">Consultant</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Category *</label>
                <select required className={field} value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    <option value="">Select a category...</option>
                    {categoryGroups.map((group, gi) => (
                        <optgroup key={gi} label={group.label}>
                            {group.items.map((item, ii) => (
                                <option key={ii} value={item}>{item}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">GST Number *</label>
                <input required className={field} value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="15-digit GSTIN" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">PAN</label>
                <input className={field} value={formData.pan}
                    onChange={e => setFormData({ ...formData, pan: e.target.value })}
                    placeholder="10-digit PAN (optional)" />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <FiCreditCard size={12} /> Bank Account Details
                </label>
                <textarea rows={2} className={field} value={formData.bankAccountDetails}
                    onChange={e => setFormData({ ...formData, bankAccountDetails: e.target.value })}
                    placeholder="A/C No, IFSC, Bank Name" />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <FiPhone size={12} /> Contact Details
                </label>
                <textarea rows={2} className={field} value={formData.contactDetails}
                    onChange={e => setFormData({ ...formData, contactDetails: e.target.value })}
                    placeholder="Name, Phone, Email, Address" />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors">
                    {submitLabel}
                </button>
                <button type="button" onClick={onCancel}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── View / Edit drawer ───────────────────────────────────────────────────────
function VendorDrawer({ vendor, categoryGroups, onClose, onSaved, onDeleted }) {
    const [mode, setMode] = useState('view'); // 'view' | 'edit'
    const [formData, setFormData] = useState({ ...vendor });
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await vendorsApi.update(vendor.id, formData);
            onSaved();
        } catch (err) {
            alert('Error updating vendor: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return;
        try {
            await vendorsApi.delete(vendor.id);
            onDeleted();
        } catch {
            alert('Error deleting vendor');
        }
    };

    const handleVerifyGst = async () => {
        if (!vendor.gstNumber) return;
        setVerifying(true);
        try {
            await vendorsApi.verifyGst(vendor.id);
            onSaved();
        } catch (err) {
            alert('GST Verification failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setVerifying(false);
        }
    };

    const DetailRow = ({ label, value }) => (
        <div className="py-3 border-b border-gray-50 last:border-0">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{value || <span className="text-gray-400 italic">Not provided</span>}</div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
            className="bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {vendor.customVendorId}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[vendor.vendorType] || 'bg-gray-100 text-gray-600'}`}>
                            {vendor.vendorType}
                        </span>
                        {vendor.isGstVerified && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <FiCheckCircle size={10} /> GST VERIFIED
                        </span>
                    )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{vendor.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{vendor.category}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                    <FiX size={20} />
                </button>
            </div>

            {/* Mode toggle */}
            <div className="flex border-b border-gray-100">
                <button onClick={() => setMode('view')}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'view' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    View Details
                </button>
                <button onClick={() => { setMode('edit'); setFormData({ ...vendor }); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'edit' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Edit
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
                {mode === 'view' ? (
                    <div>
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                           <div className="flex items-center justify-between mb-3">
                               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compliance Check</h3>
                               {vendor.gstNumber ? (
                                   <button 
                                       onClick={handleVerifyGst}
                                       disabled={verifying}
                                       className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                           vendor.isGstVerified 
                                           ? 'bg-green-600 text-white cursor-default'
                                           : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                       }`}
                                   >
                                       {verifying ? 'Verifying...' : vendor.isGstVerified ? <><FiCheckCircle /> Verified</> : 'Verify GSTIN'}
                                   </button>
                               ) : (
                                   <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
                                       <FiAlertTriangle /> No GSTIN provided
                                   </span>
                               )}
                           </div>

                           {vendor.isGstVerified ? (
                               <div className="space-y-3">
                                   <div>
                                       <div className="text-[10px] font-bold text-gray-400 uppercase">Legal Name</div>
                                       <div className="text-sm font-semibold text-gray-800">{vendor.legalName}</div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-3">
                                       <div>
                                           <div className="text-[10px] font-bold text-gray-400 uppercase">Status</div>
                                           <div className="text-xs font-bold text-green-600">{vendor.gstStatus}</div>
                                       </div>
                                       <div>
                                           <div className="text-[10px] font-bold text-gray-400 uppercase">Reg. Date</div>
                                           <div className="text-xs font-medium text-gray-700">{vendor.registrationDate}</div>
                                       </div>
                                   </div>
                                   <div>
                                       <div className="text-[10px] font-bold text-gray-400 uppercase">Verified Address</div>
                                       <div className="text-xs text-gray-600 leading-relaxed">{vendor.verifiedAddress}</div>
                                   </div>
                               </div>
                           ) : (
                               <div className="text-xs text-gray-500 italic">
                                   Click verify to fetch official registration details from the GST portal.
                               </div>
                           )}
                        </div>

                        <DetailRow label="Vendor ID" value={vendor.customVendorId} />
                        <DetailRow label="Vendor Name" value={vendor.name} />
                        <DetailRow label="Type" value={vendor.vendorType} />
                        <DetailRow label="Category" value={vendor.category} />
                        <DetailRow label="GST Number" value={vendor.gstNumber} />
                        <DetailRow label="PAN" value={vendor.pan} />
                        <DetailRow label="Bank Account Details" value={vendor.bankAccountDetails} />
                        <DetailRow label="Contact Details" value={vendor.contactDetails} />
                    </div>
                ) : (
                    <VendorForm
                        formData={formData}
                        setFormData={setFormData}
                        categoryGroups={categoryGroups}
                        onSubmit={saving ? e => e.preventDefault() : handleSave}
                        onCancel={() => setMode('view')}
                        submitLabel={saving ? 'Saving...' : 'Save Changes'}
                    />
                )}
            </div>

            {/* Footer — delete button only in view mode */}
            {mode === 'view' && (
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <FiTrash2 size={14} /> Delete Vendor
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryGroups, setCategoryGroups] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });

    useEffect(() => {
        fetchVendors();
        fetchCategories();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await vendorsApi.getAll();
            setVendors(response.data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await masterCategoriesApi.getAll();
            setCategoryGroups(buildCategoryOptions(response.data));
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await vendorsApi.create(formData);
            setShowCreateModal(false);
            setFormData({ ...EMPTY_FORM });
            fetchVendors();
        } catch (error) {
            alert('Error creating vendor: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDrawerSaved = () => {
        fetchVendors();
        setSelectedVendor(null);
    };

    const handleDrawerDeleted = () => {
        fetchVendors();
        setSelectedVendor(null);
    };

    return (
        <div style={{ paddingRight: selectedVendor ? '496px' : 0, transition: 'padding-right 0.25s ease' }}>

            {/* Page header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendor Management</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                    <FiPlus /> Add New Vendor
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3">Vendor ID</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">GST / PAN</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {vendors.map(vendor => (
                                <tr key={vendor.id}
                                    onClick={() => setSelectedVendor(vendor)}
                                    className={`cursor-pointer transition-colors ${selectedVendor?.id === vendor.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4 font-semibold text-indigo-600 text-sm">{vendor.customVendorId}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{vendor.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_STYLES[vendor.vendorType] || 'bg-gray-100 text-gray-600'}`}>
                                            {vendor.vendorType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{vendor.category}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        <div>GST: {vendor.gstNumber || '—'}</div>
                                        <div>PAN: {vendor.pan || '—'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setSelectedVendor(vendor)}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors" title="View">
                                                <FiEye size={15} />
                                            </button>
                                            <button onClick={() => setSelectedVendor(vendor)}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                                                <FiEdit2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {vendors.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                                        <FiUser size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No vendors yet</p>
                                        <p className="text-sm mt-1">Click "Add New Vendor" to get started.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative my-8 shadow-xl">
                        <button onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <FiX size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-800">
                            <FiUser className="text-indigo-600" /> Create Vendor Profile
                        </h2>
                        <VendorForm
                            formData={formData}
                            setFormData={setFormData}
                            categoryGroups={categoryGroups}
                            onSubmit={handleCreate}
                            onCancel={() => setShowCreateModal(false)}
                            submitLabel="Create Vendor"
                        />
                    </div>
                </div>
            )}

            {/* View / Edit drawer */}
            {selectedVendor && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black bg-opacity-20 z-40"
                        onClick={() => setSelectedVendor(null)} />
                    <VendorDrawer
                        vendor={selectedVendor}
                        categoryGroups={categoryGroups}
                        onClose={() => setSelectedVendor(null)}
                        onSaved={handleDrawerSaved}
                        onDeleted={handleDrawerDeleted}
                    />
                </>
            )}
        </div>
    );
};

export default Vendors;
