import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snake-royale-backend-yd7m.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
})

export const signup = (username, password) =>
  api.post('/api/auth/signup', { username, password })

export const login = (username, password) =>
  api.post('/api/auth/login', { username, password })

export const getLeaderboard = () =>
  api.get('/api/leaderboard')

export default api 