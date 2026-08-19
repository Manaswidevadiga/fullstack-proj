import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_SKIN_ID } from '../lib/skins'

const AuthContext = createContext(null)

function generateGuestName() {
  return `Guest${Math.floor(1000 + Math.random() * 9000)}`
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

  const loginUser = (userData, jwt) => {
    localStorage.setItem('token', jwt)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setToken(jwt)
  }

  const continueAsGuest = () => {
    const guestUser = { username: generateGuestName(), isGuest: true }
    setUser(guestUser)
    setToken(null)
    return guestUser
  }

  const logoutUser = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
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