import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

const R2_PUBLIC = 'https://pub-8579a74d7311421886bce872c1094073.r2.dev'
const COLLAGE_CLIPS = ['1.mp4', '2.mp4', '3.mp4', '5.mp4', '7.mp4'].map(
  (name) => `${R2_PUBLIC}/Login/${name}`
)

function ReticleCorner({ className }) {
  return (
    <span className={`reticle-corner ${className}`} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path d="M22 2 H6 a4 4 0 0 0-4 4 V22" />
      </svg>
    </span>
  )
}

export default function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('login') // login | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // pentru contul nou care încă n-are un rând în trainers (ex: prima oară via Google)
  const [needsName, setNeedsName] = useState(false)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [activeClip, setActiveClip] = useState(0)
  const videoRefs = useRef([])

  useEffect(() => {
    const first = videoRefs.current[0]
    if (first) first.play().catch(() => {})
  }, [])

  const handleClipEnded = (index) => {
    if (index !== activeClip) return
    const nextIndex = (index + 1) % COLLAGE_CLIPS.length
    const nextVideo = videoRefs.current[nextIndex]
    if (nextVideo) {
      nextVideo.currentTime = 0
      nextVideo.play().catch(() => {})
    }
    setActiveClip(nextIndex)
  }

  // --- găsește / creează profilul de antrenor legat de contul autentificat ---
  const resolveTrainerForUser = async (user) => {
    const { data: existing } = await supabase
      .from('trainers')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (existing) {
      onLoginSuccess(existing)
      return
    }

    const metaName = user.user_metadata?.full_name
    if (metaName && metaName.trim().length > 0) {
      const { data: created, error: createError } = await supabase
        .from('trainers')
        .insert({ auth_user_id: user.id, name: metaName.trim() })
        .select()
        .single()
      if (!createError && created) {
        onLoginSuccess(created)
        return
      }
    }

    // nu avem nume (ex: primul login prin Google) — îl cerem o singură dată
    setPendingUserId(user.id)
    setNeedsName(true)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session?.user) {
        resolveTrainerForUser(data.session.user).finally(() => setCheckingSession(false))
      } else {
        setCheckingSession(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        resolveTrainerForUser(session.user)
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) {
      setError('Nu am putut porni conectarea cu Google.')
      setGoogleLoading(false)
    }
    // la succes, browserul redirecționează spre Google — nu mai continuăm aici
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'signup' && name.trim().length === 0) {
      setError('Completează numele.')
      return
    }
    if (email.trim().length === 0 || password.length === 0) {
      setError('Completează email și parolă.')
      return
    }

    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      })
      setLoading(false)
      if (signUpError) {
        setError(signUpError.message || 'Nu am putut crea contul.')
        return
      }
      if (!data.session) {
        setNotice('Cont creat! Verifică-ți emailul ca să confirmi contul, apoi conectează-te.')
        setMode('login')
        return
      }
      // sesiune activă imediat (confirmarea prin email e dezactivată) — onAuthStateChange preia de aici
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (signInError) {
        setError('Email sau parolă incorectă.')
        return
      }
    }
  }

  const handleForgotPassword = async () => {
    if (email.trim().length === 0) {
      setError('Scrie-ți emailul mai sus, apoi apasă din nou.')
      return
    }
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (resetError) {
      setError('Nu am putut trimite emailul de resetare.')
      return
    }
    setNotice('Ți-am trimis un email cu instrucțiuni de resetare a parolei.')
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (profileName.trim().length === 0) return
    setProfileLoading(true)
    const { data: created, error: createError } = await supabase
      .from('trainers')
      .insert({ auth_user_id: pendingUserId, name: profileName.trim() })
      .select()
      .single()
    setProfileLoading(false)
    if (createError) {
      setError('Nu am putut salva profilul.')
      return
    }
    onLoginSuccess(created)
  }

  return (
    <div className="login-screen">
      <div className="login-card reticle">
        <ReticleCorner className="reticle-corner--tl" />
        <ReticleCorner className="reticle-corner--tr" />
        <ReticleCorner className="reticle-corner--bl" />
        <ReticleCorner className="reticle-corner--br" />

        <div className="login-collage" aria-hidden="true">
          {COLLAGE_CLIPS.map((src, i) => (
            <video
              key={src}
              ref={(el) => (videoRefs.current[i] = el)}
              className={`lc-video ${i === activeClip ? 'lc-active' : ''}`}
              muted
              playsInline
              preload="auto"
              onEnded={() => handleClipEnded(i)}
            >
              <source src={src} type="video/mp4" />
            </video>
          ))}
          <div className="lc-tint" />
          <div className="lc-tint-lime" />
          <div className="lc-fade" />
        </div>

        <div className="login-content">
          <div className="login-brand">
            <div className="login-brand__aperture">
              <img src="/logo.png" alt="ElvisProCut" className="login-brand__logo" />
              <svg className="login-brand__iris" width="112" height="112" viewBox="0 0 112 112">
                <path className="login-brand__slice login-brand__slice--0" d="M56,56 L56,-29 A85,85 0 0,1 116.1,-4.1 Z" />
                <path className="login-brand__slice login-brand__slice--1" d="M56,56 L116.1,-4.1 A85,85 0 0,1 141,56 Z" />
                <path className="login-brand__slice login-brand__slice--2" d="M56,56 L141,56 A85,85 0 0,1 116.1,116.1 Z" />
                <path className="login-brand__slice login-brand__slice--3" d="M56,56 L116.1,116.1 A85,85 0 0,1 56,141 Z" />
                <path className="login-brand__slice login-brand__slice--4" d="M56,56 L56,141 A85,85 0 0,1 -4.1,116.1 Z" />
                <path className="login-brand__slice login-brand__slice--5" d="M56,56 L-4.1,116.1 A85,85 0 0,1 -29,56 Z" />
                <path className="login-brand__slice login-brand__slice--6" d="M56,56 L-29,56 A85,85 0 0,1 -4.1,-4.1 Z" />
                <path className="login-brand__slice login-brand__slice--7" d="M56,56 L-4.1,-4.1 A85,85 0 0,1 56,-29 Z" />
              </svg>
            </div>
            <div className="login-brand__name">
              ELVISPRO<span className="login-brand__name-cut">CUT</span>
            </div>
          </div>

          {checkingSession ? (
            <p className="login-subtitle">Se verifică sesiunea...</p>
          ) : needsName ? (
            <>
              <p className="login-subtitle">Ultimul pas</p>
              <form onSubmit={handleProfileSubmit} className="login-form">
                <label className="login-label" htmlFor="profile-name">Cum te numești?</label>
                <input
                  id="profile-name"
                  className="login-input"
                  type="text"
                  autoComplete="off"
                  placeholder="ex: Andrei"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  autoFocus
                />
                {error && <p className="login-error">{error}</p>}
                <button type="submit" className="login-submit" disabled={profileLoading || profileName.trim().length === 0}>
                  {profileLoading ? 'Se salvează...' : 'Continuă'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="login-subtitle">Panou antrenor</p>
              <form onSubmit={handleSubmit} className="login-form">
                {mode === 'signup' && (
                  <>
                    <label className="login-label" htmlFor="trainer-name">Nume</label>
                    <input
                      id="trainer-name"
                      className="login-input"
                      type="text"
                      autoComplete="name"
                      placeholder="ex: Andrei"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </>
                )}

                <label className="login-label" htmlFor="trainer-email">Email</label>
                <input
                  id="trainer-email"
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  placeholder="ex: nume@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                />

                <label className="login-label" htmlFor="trainer-password">Parolă</label>
                <input
                  id="trainer-password"
                  className="login-input"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                />

                {error && <p className="login-error">{error}</p>}
                {notice && <p className="login-notice">{notice}</p>}

                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? 'Se procesează...' : mode === 'signup' ? 'Creează cont' : 'Intră în cont'}
                </button>

                {mode === 'login' && (
                  <button type="button" className="login-forgot" onClick={handleForgotPassword}>
                    Ai uitat parola?
                  </button>
                )}
              </form>

              <div className="login-divider">
                <span>sau {mode === 'signup' ? 'creează-ți cont' : 'conectează-te'} cu</span>
              </div>

              <button type="button" className="login-google" onClick={handleGoogle} disabled={googleLoading}>
                <svg viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.9-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.6 0-14.1 4.3-17.7 11.2z" />
                  <path fill="#4CAF50" d="M24 44.5c5.4 0 10.3-1.9 14-5.1l-6.5-5.4C29.5 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.9 40.2 16.4 44.5 24 44.5z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.5-4.3 5.9l6.5 5.4C40.8 36.6 44.5 30.9 44.5 24c0-1.2-.1-2.4-.9-3.5z" />
                </svg>
                {googleLoading ? 'Se conectează...' : 'Continuă cu Google'}
              </button>

              <button
                type="button"
                className="login-switch"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError('')
                  setNotice('')
                }}
              >
                {mode === 'login' ? 'Nu ai cont? Creează unul' : 'Ai deja cont? Conectează-te'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
