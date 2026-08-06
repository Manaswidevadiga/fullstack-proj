import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { socket } from '../lib/socket'

export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) return null // don't show navbar on login/signup

  const handleLogout = () => {
    socket.disconnect()
    logoutUser()
    navigate('/login')
  }

  const linkClass = (path) =>
    `text-sm font-medium transition ${
      location.pathname === path
        ? 'text-green-400'
        : 'text-zinc-400 hover:text-white'
    }`

  return (
    <nav className="w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-6 py-3 flex items-center justify-between">
      <Link to="/lobby" className="text-green-400 font-bold text-lg">
        🐍 Snake Royale
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/lobby" className={linkClass('/lobby')}>
          Lobby
        </Link>
        <Link to="/leaderboard" className={linkClass('/leaderboard')}>
          Leaderboard
        </Link>
        <span className="text-zinc-500 text-sm">Hi, {user.username}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 hover:text-red-300 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  )
} 