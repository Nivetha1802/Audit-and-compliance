import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  X,
  Eye,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { evidenceApi } from '../services/api';

export default function Evidence({ projectId, transactionId, transaction, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (transactionId) {
      fetchItems();
    }
  }, [transactionId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await evidenceApi.getItems(transactionId);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching evidence items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('transactionId', transactionId);
      formData.append('projectId', projectId);

      await evidenceApi.upload(formData);
      setSelectedFile(null);
      fetchItems();
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this evidence?')) return;
    try {
      await evidenceApi.deleteItem(itemId);
      fetchItems();
    } catch (error) {
      console.error('Error deleting evidence:', error);
    }
  };

  const handleDownload = (documentId) => {
    const url = evidenceApi.download(documentId);
    window.open(url, '_blank');
  };

  if (loading && items.length === 0) {
    return <div className="p-8 text-center">Loading evidence...</div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      {/* Evidence Workspace Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
            <span>Transactions</span>
            <ChevronRight size={14} />
            <span>Evidence</span>
            <ChevronRight size={14} />
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{transaction?.referenceNo || 'Details'}</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Manage Evidence</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: File List */}
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Uploaded Documents</h3>
            </div>
            
            {items.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No evidence documents uploaded yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>File Name</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ color: '#2563eb' }}><FileText size={20} /></div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{item.documentName || 'Document'}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#166534' }}>Verified</span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleDownload(item.documentId)}
                            style={{ padding: '6px', color: '#64748b', hover: { color: '#2563eb' }, background: 'none', border: 'none', cursor: 'pointer' }}
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ padding: '6px', color: '#64748b', hover: { color: '#ef4444' }, background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Transaction Details & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Transaction Context</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Reference:</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{transaction?.referenceNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Date:</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{transaction?.transactionDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Amount:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: transaction?.amount < 0 ? '#ef4444' : '#10b981' }}>
                  ${Math.abs(transaction?.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Upload New Evidence</h3>
            <form onSubmit={handleFileUpload}>
              {!selectedFile ? (
                <label style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', 
                  border: '2px dashed #e2e8f0', borderRadius: '12px', cursor: 'pointer'
                }}>
                  <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
                  <Upload size={32} style={{ color: '#2563eb', marginBottom: '12px' }} />
                  <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '14px' }}>Choose file to upload</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>PDF, JPG, PNG up to 10MB</span>
                </label>
              ) : (
                <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <FileText color="#2563eb" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                      </div>
                    </div>
                    <button onClick={() => setSelectedFile(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <button 
                    type="submit" 
                    disabled={uploading}
                    style={{ 
                      width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', 
                      borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Import'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
