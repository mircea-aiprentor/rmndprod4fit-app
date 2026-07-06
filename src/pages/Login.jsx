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
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand__mark">ELVIS</span>
          <span className="login-brand__mark login-brand__mark--accent">PROCUT.RO</span>
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