import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://snake-royale-backend-yd7m.onrender.com'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  // Function form: socket.io-client calls this fresh on every (re)connect
  // attempt, so it always sends whatever token is currently in
  // localStorage (null for guests) — not a value captured once when this
  // singleton module first loaded, which is before any login/logout could
  // have happened.
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
})