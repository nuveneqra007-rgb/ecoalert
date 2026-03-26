// src/services/api.js
// Axios instance that auto-refreshes JWT tokens on 401
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── REQUEST: attach access token ──────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eco_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── RESPONSE: auto-refresh on 401 ─────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('eco_refresh')
    if (!refreshToken) {
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)) },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken })
      localStorage.setItem('eco_access',  data.accessToken)
      localStorage.setItem('eco_refresh', data.refreshToken)
      localStorage.setItem('eco_user',    JSON.stringify(data.user))
      api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
      original.headers.Authorization = `Bearer ${data.accessToken}`
      processQueue(null, data.accessToken)
      return api(original)
    } catch (err) {
      processQueue(err, null)
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

// ── AUTH ──────────────────────────────────────
export const authAPI = {
  register: (body)          => api.post('/auth/register', body).then(r => r.data),
  login:    (body)          => api.post('/auth/login', body).then(r => r.data),
  refresh:  (refreshToken)  => api.post('/auth/refresh-token', { refreshToken }).then(r => r.data),
  logout:   (refreshToken)  => api.post('/auth/logout', { refreshToken }).then(r => r.data),
  me:       ()              => api.get('/auth/me').then(r => r.data),
}

// ── REPORTS ───────────────────────────────────
export const reportsAPI = {
  getAll: (params = {}) => api.get('/reports', { params }).then(r => r.data),
  getOne: (id)          => api.get(`/reports/${id}`).then(r => r.data),
  create: (formData)    => api.post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  update: (id, body)    => api.put(`/reports/${id}`, body).then(r => r.data),
  delete: (id)          => api.delete(`/reports/${id}`).then(r => r.data),
  upvote: (id)          => api.post(`/reports/${id}/upvote`).then(r => r.data),
  stats:  ()            => api.get('/reports/stats').then(r => r.data),
  nearby: (lat, lng, r) => api.get('/reports/nearby', { params: { lat, lng, radius: r } }).then(d => d.data),
}

// ── AI ────────────────────────────────────────
export const aiAPI = {
  status:      ()         => api.get('/ai/status').then(r => r.data),
  detectTrash: (formData) => api.post('/ai/detect-trash', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
}

// ── USERS (admin) ─────────────────────────────
export const usersAPI = {
  getAll:  (params = {}) => api.get('/users', { params }).then(r => r.data),
  update:  (id, body)    => api.patch(`/users/${id}`, body).then(r => r.data),
  delete:  (id)          => api.delete(`/users/${id}`).then(r => r.data),
}

export default api
