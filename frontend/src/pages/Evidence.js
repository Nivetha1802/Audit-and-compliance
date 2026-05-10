import React, { useState, useEffect } from 'react';
import { transactionApi, projectApi, evidenceApi, aiApi } from '../services/api';
import { 
  FiUploadCloud, FiCheckCircle, FiXCircle, FiPaperclip, 
  FiFileText, FiSearch, FiLayers, FiAlertCircle 
} from 'react-icons/fi';

const Evidence = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null); // ID of item being uploaded
  const [aiAnalysis, setAiAnalysis] = useState(null); // Result of AI validation
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
    } catch (err) {
      console.error('Error loading projects', err);
    }
  };

  const loadTransactions = async (projectId) => {
    setLoading(true);
    try {
      const res = await transactionApi.getByProject(projectId);
      setTransactions(res.data);
      setSelectedTx(null);
      setChecklistItems([]);
    } catch (err) {
      console.error('Error loading transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async (txId) => {
    try {
      const res = await evidenceApi.getItems(txId);
      setChecklistItems(res.data);
    } catch (err) {
      console.error('Error loading checklist', err);
    }
  };

  const handleProjectChange = (e) => {
    const pId = e.target.value;
    const project = projects.find(p => p.id === pId);
    setSelectedProject(project);
    if (pId) loadTransactions(pId);
    else {
      setTransactions([]);
      setSelectedTx(null);
      setChecklistItems([]);
    }
  };

  const handleTxClick = (tx) => {
    setSelectedTx(tx);
    loadChecklist(tx.id);
  };

  const handleFileUpload = async (itemId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(itemId);
    try {
      // 1. Upload the document first to get an ID
      const uploadRes = await evidenceApi.uploadEvidence(itemId, formData);
      const documentId = uploadRes.data.id; 

      // 2. Trigger AI Validation via backend
      const aiRes = await aiApi.validateEvidenceFile(selectedTx.id, documentId);
      const extractedAmount = aiRes.data.extractedAmount;
      
      const amountDiff = Math.abs(extractedAmount - selectedTx.amount);
      const isMatch = amountDiff < 0.01;

      setAiAnalysis({
        extracted: extractedAmount,
        actual: selectedTx.amount,
        isMatch: isMatch,
        itemName: checklistItems.find(i => i.id === itemId)?.description
      });

      if (!isMatch) {
        window.confirm(
          `AI detected an amount of ₹${extractedAmount.toLocaleString()} in the document, but the transaction amount is ₹${selectedTx.amount.toLocaleString()}. The amounts do not match. Keep this evidence?`
        );
      }

      loadChecklist(selectedTx.id); 
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(null);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.vendorCustomer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <FiUploadCloud className="mr-2 text-indigo-600" />
          Evidence Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Project & Transaction Selection */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              onChange={handleProjectChange}
              value={selectedProject?.id || ''}
            >
              <option value="">-- All Projects --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center">
              <FiLayers className="mr-2 text-gray-500" />
              <h2 className="font-semibold text-gray-700">Transactions</h2>
            </div>
            
            <div className="p-4 bg-white border-b border-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {!selectedProject ? (
                <div className="p-8 text-center text-gray-400 italic text-sm">
                  Select a project to see transactions
                </div>
              ) : loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No transactions found</div>
              ) : (
                filteredTransactions.map(tx => (
                  <div 
                    key={tx.id}
                    onClick={() => handleTxClick(tx)}
                    className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                      selectedTx?.id === tx.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                          {tx.description}
                        </span>
                        <div className="flex space-x-1 mt-1">
                          {tx.isHighRisk && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                              HIGH RISK
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            tx.complianceStatus === 'COMPLIANT' ? 'bg-green-100 text-green-600' : 
                            tx.complianceStatus === 'FLAGGED' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tx.complianceStatus || 'PENDING'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${tx.debitCredit === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{tx.amount?.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">{tx.transactionDate}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                      <span className="truncate max-w-[100px]">{tx.vendorCustomer || 'Internal'}</span>
                      <span className="text-[10px] italic">Ref: {tx.referenceNo || 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Content: Checklist & Upload */}
        <div className="lg:col-span-8">
          {!selectedTx ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <FiPaperclip className="mx-auto text-4xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Transaction Selected</h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">
                Select a transaction from the list on the left to start uploading evidence.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {aiAnalysis && (
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${
                  aiAnalysis.isMatch ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {aiAnalysis.isMatch ? <FiCheckCircle className="mr-3 text-xl" /> : <FiAlertCircle className="mr-3 text-xl" />}
                    <div>
                      <p className="text-sm font-bold">
                        AI Validation Result for {aiAnalysis.itemName}
                      </p>
                      <p className="text-xs">
                        {aiAnalysis.isMatch 
                          ? `Amount confirmed: ₹${aiAnalysis.extracted.toLocaleString()} matches transaction.` 
                          : `Amount mismatch: Document has ₹${aiAnalysis.extracted.toLocaleString()}, Transaction has ₹${aiAnalysis.actual.toLocaleString()}.`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAiAnalysis(null)} 
                    className="text-xs font-bold hover:underline"
                  >Dismiss</button>
                </div>
              )}

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTx.description}</h2>
                    <p className="text-sm text-gray-500">Ref: {selectedTx.referenceNo} | Ledger: {selectedTx.ledgerName}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedTx.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                      selectedTx.status === 'Finding Raised' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedTx.status}
                    </span>
                    {selectedTx.bankMatched && (
                      <span className="flex items-center text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                        <FiCheckCircle className="mr-1" /> BANK MATCHED
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Project Code</p>
                    <p className="text-sm font-medium">{selectedTx.projectCode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Category</p>
                    <p className="text-sm font-medium">{selectedTx.categoryName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Subcategory</p>
                    <p className="text-sm font-medium">{selectedTx.subcategory}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Vendor</p>
                    <p className="text-sm font-medium">{selectedTx.vendorCustomer}</p>
                  </div>
                </div>

                {(selectedTx.validationReason || selectedTx.poNumber) && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start mb-3">
                      <FiAlertCircle className="text-indigo-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs font-bold text-indigo-900">Audit Intelligence</p>
                        <p className="text-xs text-indigo-700">{selectedTx.validationReason || 'Standard transaction matching rules applied.'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">PO Number</p>
                        <p className="text-[11px] font-bold">{selectedTx.poNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">GRN Number</p>
                        <p className="text-[11px] font-bold">{selectedTx.grnNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">Invoice No</p>
                        <p className="text-[11px] font-bold">{selectedTx.invoiceNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center">
                    <FiCheckCircle className="mr-2 text-green-500" />
                    <h2 className="font-semibold text-gray-700">Evidence Checklist</h2>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {checklistItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <FiAlertCircle className="mx-auto text-2xl mb-2" />
                      <p className="text-sm">No checklist template mapped for this category.</p>
                    </div>
                  ) : (
                    checklistItems.map(item => (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {item.provided ? (
                            <FiCheckCircle className="text-green-500 flex-shrink-0" />
                          ) : item.mandatory ? (
                            <FiAlertCircle className="text-amber-500 flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="text-sm font-medium text-gray-800">{item.description}</p>
                            <p className="text-xs text-gray-400">
                              {item.mandatory && <span className="text-red-400 font-bold ml-1">*Required</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {item.provided ? (
                            <div className="flex items-center bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                              <FiFileText className="text-green-600 mr-2 text-xs" />
                              <span className="text-[10px] font-medium text-green-700 max-w-[100px] truncate">
                                {item.documentName || 'Document Linked'}
                              </span>
                            </div>
                          ) : null}

                          <label className={`cursor-pointer flex items-center px-3 py-1.5 rounded-lg transition-colors ${
                            item.provided ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          }`}>
                            <FiUploadCloud className="mr-2 text-sm" />
                            <span className="text-xs font-medium">
                              {uploading === item.id ? '...' : item.provided ? 'Replace' : 'Upload'}
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(item.id, e)}
                              disabled={uploading === item.id}
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Evidence;
