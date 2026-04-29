import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const assessmentsAPI = {
  list: () => api.get('/assessments/'),
  create: (data) => api.post('/assessments/', data),
  get: (id) => api.get(`/assessments/${id}`),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  delete: (id) => api.delete(`/assessments/${id}`),
}

export const risksAPI = {
  list: (params) => api.get('/risks/', { params }),
  create: (data) => api.post('/risks/', data),
  get: (id) => api.get(`/risks/${id}`),
  update: (id, data) => api.put(`/risks/${id}`, data),
  delete: (id) => api.delete(`/risks/${id}`),
  addMitigation:    (riskId, data)               => api.post(`/risks/${riskId}/mitigations`, data),
  deleteMitigation: (riskId, mitigationId)       => api.delete(`/risks/${riskId}/mitigations/${mitigationId}`),
  updateMitigation: (riskId, mitigationId, data) => api.patch(`/risks/${riskId}/mitigations/${mitigationId}`, data),
}

export const aiAPI = {
  analyze: (data) => api.post('/ai/analyze', data),
}

export const financialAPI = {
  dcf: (data) => api.post('/financial/dcf', data),
  cashflow: (data) => api.post('/financial/cashflow', data),
  loanDefault: (data) => api.post('/financial/loan-default', data),
}

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
}

export const reportsAPI = {
  list: () => api.get('/reports/'),
  create: (data) => api.post('/reports/', data),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
}

export const templatesAPI = {
  list: () => api.get('/templates'),
}

export const billingAPI = {
  getPlans: () => api.get('/billing/plans'),
  getSubscription: () => api.get('/billing/subscription'),
  createOrder: (data) => api.post('/billing/create-order', data),
  verifyPayment: (data) => api.post('/billing/verify-payment', data),
  cancel: () => api.post('/billing/cancel', {}),
  getInvoices: () => api.get('/billing/invoices'),
}

export const teamAPI = {
  getMembers: () => api.get('/team/'),
  invite: (data) => api.post('/team/invite', data),
  acceptInvite: (data) => api.post('/team/accept-invite', data),
  updateRole: (id, role) => api.put(`/team/${id}/role`, { role }),
  remove: (id) => api.delete(`/team/${id}`),
}

export const auditAPI = {
  list: (params) => api.get('/audit/', { params }),
  summary: () => api.get('/audit/summary'),
}

export const webhookAPI = {
  list: () => api.get('/webhooks/'),
  events: () => api.get('/webhooks/events'),
  create: (data) => api.post('/webhooks/', data),
  update: (id, data) => api.put(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`),
}

export const companyAPI = {
  list: () => api.get('/companies/'),
  create: (data) => api.post('/companies/', data),
  get: (id) => api.get(`/companies/${id}`),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  fetch: (ticker) => api.get(`/companies/fetch/${ticker}`),
  fetchAndSave: (ticker) => api.post(`/companies/fetch-and-save/${ticker}`),
  analyze: (id) => api.post(`/companies/${id}/analyze`),
}

export const newsAPI = {
  list: (params) => api.get('/news/', { params }),
  read: (id) => api.get(`/news/${id}/read`),
  refresh: () => api.post('/news/refresh'),
  refreshSync: () => api.post('/news/refresh/sync'),
  sources: () => api.get('/news/sources'),
  toggleSource: (id) => api.put(`/news/sources/${id}/toggle`),
  stats: () => api.get('/news/stats'),
}

export const notificationsAPI = {
  list: () => api.get('/notifications/'),
}

export const marketAPI = {
  syncNow: () => api.post('/market/sync/now'),
  companies: (params) => api.get('/market/companies', { params }),
  getCompany: (symbol) => api.get(`/market/companies/${symbol}`),
  fetchCompany: (symbol) => api.post(`/market/companies/${symbol}/fetch`),
  download: (symbol, docType) =>
    api.get(`/market/companies/${symbol}/download/${docType}`, { responseType: 'blob' }),
  concall: (symbol) => api.get(`/market/companies/${symbol}/concall`),
}

export const expertAPI = {
  list: (params) => api.get('/experts/', { params }),
  create: (data) => api.post('/experts/', data),
  update: (id, data) => api.put(`/experts/${id}`, data),
  delete: (id) => api.delete(`/experts/${id}`),
  getOpinions: (id) => api.get(`/experts/${id}/opinions`),
  addOpinion: (id, data) => api.post(`/experts/${id}/opinions`, data),
  deleteOpinion: (expertId, opinionId) => api.delete(`/experts/${expertId}/opinions/${opinionId}`),
  getIndustryOpinions: (industry) => api.get(`/experts/opinions/industry/${industry}`),
}

export default api
