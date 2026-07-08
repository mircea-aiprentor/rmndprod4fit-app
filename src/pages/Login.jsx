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
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (name.trim().length === 0 || pin.trim().length === 0) {
      setError('Completează numele și PIN-ul.')
      return
    }

    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('trainers')
      .select('*')
      .ilike('name', name.trim())
      .eq('pin', pin.trim())
      .maybeSingle()
    setLoading(false)

    if (queryError) {
      setError('A apărut o eroare. Încearcă din nou.')
      return
    }
    if (!data) {
      setError('Nume sau PIN incorect.')
      return
    }
    onLoginSuccess(data)
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

          <p className="login-subtitle">Panou antrenor</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label" htmlFor="trainer-name">Nume</label>
            <input
              id="trainer-name"
              className="login-input"
              type="text"
              autoComplete="name"
              placeholder="ex: Andrei"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
            />

            <label className="login-label" htmlFor="trainer-pin">PIN</label>
            <input
              id="trainer-pin"
              className="login-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError('')
              }}
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Se conectează...' : 'Intră în cont'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
