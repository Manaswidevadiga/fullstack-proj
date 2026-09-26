import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snake-royale-backend-yd7m.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attaches the JWT (if present) to every outgoing request, so authenticated
// endpoints like /api/skins don't need headers set manually at each call site.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const signup = (username, password) =>
  api.post('/api/auth/signup', { username, password })

export const login = (username, password) =>
  api.post('/api/auth/login', { username, password })

export const getLeaderboard = () =>
  api.get('/api/leaderboard')

export const getSkins = () =>
  api.get('/api/skins')

export const saveCustomSkin = (body, head) =>
  api.post('/api/skins/custom', { body, head })

export default api