import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi, evidenceApi, taskApi, userApi, riskApi, vendorsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, RefreshCw, Upload, FileCheck, HelpCircle, X } from 'lucide-react';

const STATUS_COLORS = {
  APPROVED:         { bg: '#d1fae5', text: '#065f46' },
  PENDING_EVIDENCE: { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW:     { bg: '#dbeafe', text: '#1e40af' },
  RAISED_RISK:      { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:         { bg: '#fce7f3', text: '#9d174d' },
};

const EvidenceManagement = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [activeTransaction, setActiveTransaction] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setLoading(true);
    try {
      // Assuming transactionApi has getByProject or similar
      const res = await transactionApi.getAll();
      // Filter by project if needed
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await transactionApi.importBank(formData);
      alert('Imported successfully');
      setFile(null);
      if (selectedProject) handleProjectSelect(selectedProject);
    } catch (err) {
      console.error(err);
      alert('Import failed');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    const input = document.getElementById('bank-import-input');
    if (input) input.value = '';
  };

  const getStatusBadge = (status) => {
    const colors = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#475569' };
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: colors.bg,
        color: colors.text
      }}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Evidence Management</h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              type="file"
              id="bank-import-input"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".csv"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                htmlFor="bank-import-input"
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Choose File
              </label>
              {file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>{file.name}</span>
                  <button
                    onClick={handleRemoveFile}
                    style={{
                      padding: '4px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={!file}
                style={{
                  padding: '10px 16px',
                  backgroundColor: file ? '#2563eb' : '#94a3b8',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: file ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Import & Match
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Transaction</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Vendor</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Bank statement</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '500' }}>{tx.description}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{tx.date}</div>
                </td>
                <td style={{ padding: '16px' }}>{tx.vendorName || 'Unlinked'}</td>
                <td style={{ padding: '16px', fontWeight: '600' }}>₹{tx.amount?.toLocaleString()}</td>
                <td style={{ padding: '16px' }}>
                   {tx.bankMatch ? (
                     <span style={{ color: '#166534', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Provided</span>
                   ) : (
                     <span style={{ color: '#991b1b', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>✕ Not Provided</span>
                   )}
                </td>
                <td style={{ padding: '16px' }}>{getStatusBadge(tx.status)}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                    View Evidence
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvidenceManagement;
