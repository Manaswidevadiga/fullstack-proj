import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_SKIN_ID } from '../lib/skins'
import { socket } from '../lib/socket'

const AuthContext = createContext(null)

const GUEST_ADJECTIVES = [
  'Wiggly', 'Sneaky', 'Zoomy', 'Slippery', 'Noodly',
  'Zippy', 'Curly', 'Sizzling', 'Bouncy', 'Spicy', 'Giggly', 'Sly',
]
const GUEST_NOUNS = [
  'Noodle', 'Zigzag', 'Slider', 'Viper', 'Wiggler',
  'Rattler', 'Squiggle', 'Cobra', 'Mamba', 'Sidewinder',
]

function generateGuestName() {
  const adjective = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)]
  const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)]
  const number = Math.floor(10 + Math.random() * 90)
  return `${adjective}${noun}${number}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skin, setSkin] = useState(() => localStorage.getItem('skin') || DEFAULT_SKIN_ID)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    localStorage.setItem('skin', skin)
  }, [skin])

  // Forces the socket to re-authenticate on its next connect, so a switch
  // between accounts (or to/from guest) in the same tab doesn't leave the
  // server still treating this connection as the previous identity.
  const resetSocketIdentity = () => {
    if (socket.connected) socket.disconnect()
  }

  const loginUser = (userData, jwt) => {
    localStorage.setItem('token', jwt)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setToken(jwt)
    resetSocketIdentity()
  }

  const continueAsGuest = () => {
    // Guests get a session-only identity: no token, nothing written to
    // localStorage, so it doesn't persist or get mistaken for a real account.
    const guestUser = { username: generateGuestName(), isGuest: true }
    setUser(guestUser)
    setToken(null)
    resetSocketIdentity()
    return guestUser
  }

  const logoutUser = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    resetSocketIdentity()
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginUser, continueAsGuest, logoutUser, skin, setSkin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}