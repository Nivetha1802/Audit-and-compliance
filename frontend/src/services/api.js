import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const projectApi = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const transactionApi = {
  getAll: () => api.get('/transactions'),
  getByProject: (projectId) => api.get(`/transactions/project/${projectId}`),
  importCsv: (formData) => api.post('/transactions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importBankStatement: (formData) => api.post('/transactions/import-bank', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  linkVendor: (id, vendorId) => api.patch(`/transactions/${id}/link-vendor?vendorId=${vendorId || ''}`),
  autoLinkVendor: (id) => api.post(`/transactions/${id}/auto-link-vendor`),
};

export const riskApi = {
  getAll: () => api.get('/risks'),
  create: (data) => api.post('/risks', data),
  update: (id, data) => api.put(`/risks/${id}`, data),
  delete: (id) => api.delete(`/risks/${id}`),
};

export const taskApi = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  getComments: (id) => api.get(`/tasks/${id}/comments`),
  addComment: (id, comment) => api.post(`/tasks/${id}/comments`, { comment }),
};

export const evidenceApi = {
  getItems: (txId) => api.get(`/evidence/checklist/${txId}`),
  upload: (formData) => api.post('/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadByTransaction: (txId, formData) => api.post(`/evidence/upload-by-transaction/${txId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteItem: (id) => api.delete(`/evidence/checklist/${id}`),
  download: (docId) => `${API_URL}/documents/download/${docId}`,
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const aiApi = {
  threeWayMatchDocs: (txId) => api.post(`/ai/three-way-match-docs/${txId}`),
  threeWayMatch: (txId, data) => api.post(`/ai/three-way-match/${txId}`, data),
  budgetVariance: (projectId, data) => api.post(`/ai/budget-variance/${projectId}`, data),
  duplicateDetection: (projectId) => api.post(`/ai/duplicate-detection/${projectId}`),
  getWorkflowFeedback: (projectId) => api.get(`/audit-analysis/feedback/${projectId}`),
  validateEvidence: (txId, data) => api.post(`/ai/validate-evidence/${txId}`, data),
  getPendingReviews: () => api.get('/ai/pending-reviews'),
  submitReview: (id, data) => api.post(`/ai/review/${id}`, data),
  getAllResults: () => api.get('/ai/results'),
  getByTransaction: (txId) => api.get(`/ai/results/transaction/${txId}`),
  getAuditInsights: (projectId) => api.get(`/ai/audit-insights/${projectId}`),
  runComprehensiveAnalysis: (projectId) => api.post(`/ai/run-comprehensive-analysis/${projectId}`),
};

export const masterCategoriesApi = {
  getAll: () => api.get('/master-categories'),
  saveTree: (tree) => api.post('/master-categories/tree', tree),
};

export const vendorsApi = {
  getAll: () => api.get('/vendors'),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  verifyGst: (id) => api.post(`/vendors/${id}/verify-gst`),
};

export const vendorApi = vendorsApi;

export const userApi = {
  getAll: () => api.get('/users'),
};

export default api;
