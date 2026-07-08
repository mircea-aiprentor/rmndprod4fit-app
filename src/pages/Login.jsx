import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

const R2_PUBLIC = 'https://pub-8579a74d7311421886bce872c1094073.r2.dev'
const HERO_VIDEO = `${R2_PUBLIC}/Login/hero.mp4`

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
          <video
            className="lc-video lc-active"
            src={HERO_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
          <div className="lc-tint" />
          <div className="lc-tint-lime" />
          <div className="lc-fade" />
        </div>

        <div className="login-content">
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
