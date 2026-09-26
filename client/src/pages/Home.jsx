import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getSkins, saveCustomSkin } from '../lib/api'
import { SKINS, SKIN_PACKS, CUSTOM_SKIN_ID, CUSTOM_UNLOCK_ID, CUSTOM_UNLOCK_HINT, getSkinById } from '../lib/skins'
import { INK, PAPER, CORAL, SUN, SKY, BUBBLEGUM } from '../lib/theme'
import { Star, Zigzag, ScribbleArrow, WobblyRing, BG_BLOBS } from '../components/doodles'

const stickerRotations = [-6, 4, -3, 6, -5, 3]

export default function Home() {
  const { user, token, continueAsGuest, skin, setSkin } = useAuth()
  const navigate = useNavigate()

  const [unlocks, setUnlocks] = useState([])
  const [customSkin, setCustomSkin] = useState(null)
  const [draftBody, setDraftBody] = useState('#4ade80')
  const [draftHead, setDraftHead] = useState('#22c55e')
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState('')

  // Costume packs and the custom designer are account features — nothing
  // to fetch for guests (no token) or before the auth check finishes.
  useEffect(() => {
    if (!token) return
    getSkins()
      .then((res) => {
        setUnlocks(res.data.unlocks || [])
        if (res.data.customSkin) {
          setCustomSkin(res.data.customSkin)
          setDraftBody(res.data.customSkin.body)
          setDraftHead(res.data.customSkin.head)
        }
      })
      .catch(() => {
        // Non-fatal — the picker just shows base skins if this fails.
      })
  }, [token])

  const handlePlay = () => {
    if (!user) {
      continueAsGuest()
    }
    navigate('/lobby')
  }

  const handleSaveCustom = async () => {
    setSavingCustom(true)
    setCustomError('')
    try {
      const res = await saveCustomSkin(draftBody, draftHead)
      setCustomSkin(res.data.customSkin)
      setSkin(CUSTOM_SKIN_ID)
    } catch (err) {
      setCustomError(err.response?.data?.error || 'Failed to save your design.')
    } finally {
      setSavingCustom(false)
    }
  }

  const customUnlocked = unlocks.includes(CUSTOM_UNLOCK_ID)

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-8"
      style={{
        background: PAPER,
        backgroundImage: 'radial-gradient(#e7e2d3 1.4px, transparent 1.4px)',
        backgroundSize: '22px 22px',
      }}
    >
      {BG_BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: b.color,
            opacity: 0.28,
            borderRadius: '58% 42% 65% 35% / 45% 55% 45% 55%',
          }}
          animate={{ rotate: [b.rotate, b.rotate + 10, b.rotate] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <Star style={{ position: 'absolute', top: '10%', left: '14%', transform: 'rotate(-8deg)' }} />
      <Star style={{ position: 'absolute', top: '78%', left: '88%', transform: 'rotate(14deg) scale(0.8)' }} />
      <Zigzag style={{ position: 'absolute', top: '20%', left: '84%', transform: 'rotate(-6deg)' }} />
      <Zigzag style={{ position: 'absolute', top: '82%', left: '10%', transform: 'rotate(4deg)' }} color={SKY} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95, rotate: -3 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -1.5 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-[28px] p-8 text-center"
        style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
      >
        <motion.h1
          initial={{ opacity: 0, y: -10, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 12 }}
          className="text-5xl mb-1 inline-block"
          style={{
            fontFamily: "'Bangers', cursive",
            color: CORAL,
            WebkitTextStroke: `2px ${INK}`,
            letterSpacing: '0.02em',
          }}
        >
          Snake Royale
        </motion.h1>
        <p className="mb-6 -rotate-1" style={{ fontFamily: "'Kalam', cursive", color: INK, fontSize: '1.05rem' }}>
          {user ? `Welcome back, ${user.username}!` : 'jump in and battle — no account needed!'}
        </p>

        <p className="text-sm mb-3 text-left" style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}>
          pick your snake →
        </p>
        <div className="grid grid-cols-3 gap-4 mb-6 place-items-center">
          {SKINS.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => setSkin(s.id)}
              initial={{ rotate: stickerRotations[i % stickerRotations.length] }}
              animate={{
                rotate:
                  skin === s.id
                    ? 0
                    : [
                        stickerRotations[i % stickerRotations.length],
                        stickerRotations[i % stickerRotations.length] - 6,
                        stickerRotations[i % stickerRotations.length],
                      ],
              }}
              transition={
                skin === s.id
                  ? { type: 'spring', stiffness: 300, damping: 12 }
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }
              }
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: s.head,
                border: `3px solid ${INK}`,
                boxShadow: skin === s.id ? `4px 4px 0 ${INK}` : `3px 3px 0 ${INK}`,
                outline: skin === s.id ? `3px solid ${SUN}` : 'none',
                outlineOffset: '2px',
              }}
            >
              <span className="absolute left-3 top-4 w-2 h-2 rounded-full bg-white">
                <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full" style={{ background: INK }} />
              </span>
              <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-white">
                <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full" style={{ background: INK }} />
              </span>
            </motion.button>
          ))}
        </div>

        {/* Costume packs + custom designer — account features only. */}
        {user && !user.isGuest && (
          <div className="mb-6 text-left">
            {SKIN_PACKS.map((pack) => {
              const packUnlocked = unlocks.includes(pack.unlockId)
              return (
                <div key={pack.unlockId} className="mb-4">
                  <p
                    className="text-xs mb-2"
                    style={{ fontFamily: "'Kalam', cursive", color: packUnlocked ? INK : '#8A8372', fontWeight: 700 }}
                  >
                    {packUnlocked ? pack.name : `🔒 ${pack.name} — ${pack.hint}`}
                  </p>
                  <div className="flex gap-3">
                    {pack.skinIds.map((skinId) => {
                      const s = getSkinById(skinId)
                      const isSelected = skin === s.id
                      return (
                        <motion.button
                          key={s.id}
                          disabled={!packUnlocked}
                          onClick={() => packUnlocked && setSkin(s.id)}
                          whileHover={packUnlocked ? { scale: 1.1 } : {}}
                          whileTap={packUnlocked ? { scale: 0.9 } : {}}
                          className="relative w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: s.head,
                            border: `3px solid ${INK}`,
                            boxShadow: isSelected ? `4px 4px 0 ${INK}` : `2px 2px 0 ${INK}`,
                            outline: isSelected ? `3px solid ${SUN}` : 'none',
                            outlineOffset: '2px',
                            opacity: packUnlocked ? 1 : 0.35,
                            cursor: packUnlocked ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {!packUnlocked && <span className="text-xs">🔒</span>}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Custom designer — only rendered once earned, and only its
                unlock hint shown otherwise, matching how the packs above
                communicate what's still locked. */}
            {customUnlocked ? (
              <div>
                <p className="text-xs mb-2" style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}>
                  design your own
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px]" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>body</span>
                    <input
                      type="color"
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      className="w-9 h-9 rounded-full cursor-pointer"
                      style={{ border: `2px solid ${INK}` }}
                    />
                  </label>
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px]" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>head</span>
                    <input
                      type="color"
                      value={draftHead}
                      onChange={(e) => setDraftHead(e.target.value)}
                      className="w-9 h-9 rounded-full cursor-pointer"
                      style={{ border: `2px solid ${INK}` }}
                    />
                  </label>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    disabled={savingCustom}
                    onClick={handleSaveCustom}
                    className="ml-auto px-3 py-2 rounded-xl text-sm disabled:opacity-60"
                    style={{
                      fontFamily: "'Bangers', cursive",
                      letterSpacing: '0.02em',
                      color: '#fff',
                      background: BUBBLEGUM,
                      border: `2.5px solid ${INK}`,
                      boxShadow: `3px 3px 0 ${INK}`,
                    }}
                  >
                    {savingCustom ? 'saving…' : customSkin ? 'update' : 'save'}
                  </motion.button>

                  {customSkin && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSkin(CUSTOM_SKIN_ID)}
                      className="relative w-12 h-12 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: customSkin.head,
                        border: `3px solid ${INK}`,
                        boxShadow: skin === CUSTOM_SKIN_ID ? `4px 4px 0 ${INK}` : `2px 2px 0 ${INK}`,
                        outline: skin === CUSTOM_SKIN_ID ? `3px solid ${SUN}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  )}
                </div>
                {customError && (
                  <p className="text-xs" style={{ fontFamily: "'Kalam', cursive", color: CORAL }}>
                    {customError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ fontFamily: "'Kalam', cursive", color: '#8A8372', fontWeight: 700 }}>
                🔒 Design your own — {CUSTOM_UNLOCK_HINT}
              </p>
            )}
          </div>
        )}

        <div className="relative flex items-center justify-center mb-2" style={{ height: 90 }}>
          <WobblyRing style={{ position: 'absolute', inset: '-10px -6px' }} />
          <motion.button
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.94, y: 4, rotate: 0 }}
            onClick={handlePlay}
            className="relative w-[85%] text-2xl py-4 rounded-2xl"
            style={{
              fontFamily: "'Bangers', cursive",
              letterSpacing: '0.03em',
              color: INK,
              background: SUN,
              border: `4px solid ${INK}`,
              boxShadow: `6px 6px 0 ${INK}`,
            }}
          >
            PLAY!
          </motion.button>
        </div>
        <ScribbleArrow style={{ position: 'absolute', bottom: -6, right: 30, transform: 'rotate(8deg)' }} />

        {!user && (
          <p className="text-sm mt-6" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>
            want costume packs and a custom snake?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold"
              style={{ color: BUBBLEGUM, textDecoration: 'underline wavy' }}
            >
              sign in
            </button>{' '}
            or{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-bold"
              style={{ color: SKY, textDecoration: 'underline wavy' }}
            >
              sign up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}