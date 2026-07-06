import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'
const MAX_PIN_LENGTH = 6
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']
export default function Login({ onLoginSuccess }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleKeyPress = (key) => {
    setError('')
    if (key === 'clear') {
      setPin('')
      return
    }
    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1))
      return
    }
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + key : prev))
  }
  const canSubmit = name.trim().length > 0 && pin.length > 0 && !loading
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('trainers')
      .select('*')
      .eq('name', name.trim())
      .eq('pin', pin)
      .maybeSingle()
    setLoading(false)
    if (queryError) {
      setError('A apărut o problemă la conectare. Încearcă din nou.')
      return
    }
    if (!data) {
      setError('Nume sau PIN incorect.')
      setPin('')
      return
    }
    onLoginSuccess(data)
  }
  return (
    <div className="login-screen">
      <div className="login-intro" aria-hidden="true">
        <span className="login-intro__streak login-intro__streak--1" />
        <span className="login-intro__streak login-intro__streak--2" />
        <span className="login-intro__streak login-intro__streak--3" />
        <span className="login-intro__streak login-intro__streak--4" />

        <span className="login-intro__pulse-wrap">
          <svg className="login-intro__pulse" viewBox="0 0 400 84" preserveAspectRatio="none">
            <path
              className="login-intro__pulse-base"
              d="M0,42 L40,42 L54,20 L68,64 L82,10 L96,42 L160,42 L200,42 L214,20 L228,64 L242,10 L256,42 L320,42 L360,42 L374,20 L388,64 L400,42"
            />
            <path
              className="login-intro__pulse-comet"
              d="M0,42 L40,42 L54,20 L68,64 L82,10 L96,42 L160,42 L200,42 L214,20 L228,64 L242,10 L256,42 L320,42 L360,42 L374,20 L388,64 L400,42"
            />
            <circle className="login-intro__pulse-head" r="5">
              <animateMotion
                dur="1.17s"
                begin="0.10s"
                fill="freeze"
                path="M0,42 L40,42 L54,20 L68,64 L82,10 L96,42 L160,42 L200,42 L214,20 L228,64 L242,10 L256,42 L320,42 L360,42 L374,20 L388,64 L400,42"
              />
            </circle>
          </svg>
        </span>

      </div>

      <div className="login-card">
        <span className="login-card__corner login-card__corner--tl" aria-hidden="true" />
        <span className="login-card__corner login-card__corner--tr" aria-hidden="true" />
        <span className="login-card__corner login-card__corner--bl" aria-hidden="true" />
        <span className="login-card__corner login-card__corner--br" aria-hidden="true" />

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
        </div>

        <div className="login-scrub" aria-hidden="true">
          <span className="login-scrub__track" />
          <span className="login-scrub__playhead" />
        </div>

        <p className="login-subtitle">Panou antrenor</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="trainer-name">
            Nume
          </label>
          <input
            id="trainer-name"
            className="login-input"
            type="text"
            autoComplete="off"
            placeholder="ex: Andrei"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
          />
          <div className="login-label">Cod PIN</div>
          <div className="pin-display" aria-live="polite">
            {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`pin-dot ${i < pin.length ? 'pin-dot--filled' : ''}`}
              />
            ))}
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="keypad">
            {KEYPAD_KEYS.map((key) => {
              if (key === 'clear') {
                return (
                  <button
                    type="button"
                    key={key}
                    className="keypad__key keypad__key--utility"
                    onClick={() => handleKeyPress('clear')}
                  >
                    Șterge
                  </button>
                )
              }
              if (key === 'back') {
                return (
                  <button
                    type="button"
                    key={key}
                    className="keypad__key keypad__key--utility"
                    onClick={() => handleKeyPress('back')}
                    aria-label="Șterge ultima cifră"
                  >
                    ⌫
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  key={key}
                  className="keypad__key"
                  onClick={() => handleKeyPress(key)}
                >
                  {key}
                </button>
              )
            })}
          </div>
          <button type="submit" className="login-submit" disabled={!canSubmit}>
            {loading ? 'Se verifică...' : 'Intră în cont'}
          </button>
        </form>
      </div>
    </div>
  )
}
