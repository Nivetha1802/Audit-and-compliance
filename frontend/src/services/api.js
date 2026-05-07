import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout and redirect to login on 401 (expired or invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const projectApi = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
};

export const transactionApi = {
  getAll: () => api.get('/transactions'),
  getByProject: (id) => api.get(`/transactions/project/${id}`),
  importCsv: (formData) => api.post('/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importBank: (formData) => api.post('/transactions/import-bank', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, status) => api.patch(`/transactions/${id}/status?status=${status}`),
  linkVendor: (id, vendorId) => api.patch(`/transactions/${id}/link-vendor?vendorId=${vendorId}`)
};

export const masterCategoriesApi = {
  getAll: () => api.get('/master-categories'),
  saveTree: (tree) => api.post('/master-categories/tree', tree),
  delete: (id) => api.delete(`/master-categories/${id}`),
};

export const vendorsApi = {
  getAll: () => api.get('/vendors'),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`)
};

export const findingApi = {
  getAll: () => api.get('/findings'),
  create: (data) => api.post('/findings', data),
  updateStatus: (id, status) => api.patch(`/findings/${id}/status?status=${status}`),
};

export const organizationApi = {
  get: (id) => api.get(`/organizations/${id}`),
  update: (id, data) => api.put(`/organizations/${id}`, data),
};

export const userApi = {
  getMe: () => api.get('/users/me'),
  getAll: () => api.get('/users'),
  updateMe: (data) => api.patch('/users/me', data),
};

export const evidenceApi = {
  getChecklist: (txId) => api.get(`/evidence/checklist/${txId}`),
  getItems: (txId) => api.get(`/evidence/checklist/${txId}/items`),
  uploadEvidence: (itemId, formData) => api.post(`/evidence/upload/${itemId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  analyzeEvidence: (data) => axios.post('http://localhost:5000/api/ai/analyze-evidence', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  removeEvidence: (itemId) => api.delete(`/evidence/item/${itemId}`),
  getReadiness: (txId) => api.get(`/evidence/readiness/${txId}`),
};

export const taskApi = {
  getAll: () => api.get('/tasks'),
  getMy: () => api.get('/tasks/my'),
  getByTransaction: (txId) => api.get(`/tasks/transaction/${txId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status?status=${status}`),
  remove: (id) => api.delete(`/tasks/${id}`),
  generateForFinding: (findingId, assigneeId, auditorId) =>
    api.post(`/tasks/generate/${findingId}?assigneeId=${assigneeId}&auditorId=${auditorId}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const aiApi = {
  threeWayMatch: (txId, data) => api.post(`/ai/three-way-match/${txId}`, data),
  budgetVariance: (projectId, data) => api.post(`/ai/budget-variance/${projectId}`, data),
  duplicateDetection: (projectId) => api.post(`/ai/duplicate-detection/${projectId}`),
  validateEvidence: (txId, data) => api.post(`/ai/validate-evidence/${txId}`, data),
  validateEvidenceFile: (txId, documentId) => api.post(`/ai/validate-evidence-file/${txId}/${documentId}`),
  getPendingReviews: () => api.get('/ai/pending-reviews'),
  submitReview: (resultId, data) => api.post(`/ai/review/${resultId}`, data),
  getAllResults: () => api.get('/ai/results'),
  getByTransaction: (txId) => api.get(`/ai/results/transaction/${txId}`),
};

export default api;
