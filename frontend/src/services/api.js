import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { token: newToken, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem('token', newToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...user, token: newToken }));
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
  getReadiness: (id) => api.get(`/projects/${id}/readiness`),
  advanceAudit: (id, data) => api.post(`/projects/${id}/advance-audit`, data),
  signOff: (id, data) => api.post(`/projects/${id}/sign-off`, data),
};

export const transactionApi = {
  getAll: () => api.get('/transactions'),
  getByProject: (id) => api.get(`/transactions/project/${id}`),
  importCsv: (formData) => api.post('/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importBank: (formData) => api.post('/transactions/import-bank', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, status) => api.patch(`/transactions/${id}/status?status=${status}`),
  linkVendor: (id, vendorId) => {
    const url = vendorId
      ? `/transactions/${id}/link-vendor?vendorId=${vendorId}`
      : `/transactions/${id}/link-vendor`;
    return api.patch(url);
  },
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
  delete: (id) => api.delete(`/vendors/${id}`),
  verifyGst: (id) => api.post(`/vendors/${id}/verify-gst`),
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

export const maintenanceApi = {
  seedMasterData: () => api.post('/maintenance/seed-master-data'),
};

export const aiApi = {
  threeWayMatchFromDocs: (txId) => api.post(`/ai/three-way-match-docs/${txId}`),
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
