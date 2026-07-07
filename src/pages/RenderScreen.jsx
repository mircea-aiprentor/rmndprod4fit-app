import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import './RenderScreen.css'

const STEPS = [
  'Clipurile sunt încărcate',
  'Se procesează vorbirea și tăieturile',
  'Se generează textul / subtitrările',
  'Se randează video-ul final',
]

export default function RenderScreen({ reelId, onDone, onCancel }) {
  const [percent, setPercent] = useState(2)
  const [stepIndex, setStepIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const startTimeRef = useRef(Date.now())

  // creștere vizuală continuă, se apropie de 92% dar nu ajunge singură la 100%
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const target = 92 * (1 - Math.exp(-elapsed / 35))
      setPercent(Math.max(2, target))

      if (elapsed > 3 && elapsed <= 15) setStepIndex(1)
      else if (elapsed > 15 && elapsed <= 40) setStepIndex(2)
      else if (elapsed > 40) setStepIndex(3)
    }, 300)
    return () => clearInterval(tick)
  }, [])

  // verificăm periodic statusul REAL din Supabase
  useEffect(() => {
    if (!reelId) return
    let cancelled = false

    const checkStatus = async () => {
      const { data } = await supabase
        .from('reels')
        .select('status')
        .eq('id', reelId)
        .maybeSingle()

      if (cancelled || !data) return

      if (data.status === 'done') {
        setPercent(100)
        setStepIndex(STEPS.length)
        setCompleted(true)
        setTimeout(() => !cancelled && onDone?.(), 1400)
      } else if (data.status === 'error') {
        setFailed(true)
      }
    }

    checkStatus()
    const poll = setInterval(checkStatus, 4000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [reelId, onDone])

  const dialDeg = Math.round(percent * 3.6)

  return (
    <div className="render-screen">
      <div className={`render-dial ${completed ? 'render-dial--done' : ''}`}>
        {!completed && <div className="render-dial__scan" />}
        <div
          className="render-dial__arc"
          style={{
            background: failed
              ? 'conic-gradient(var(--danger) 0deg 360deg, transparent 360deg)'
              : `conic-gradient(var(--accent) 0deg ${dialDeg}deg, transparent ${dialDeg}deg 360deg)`,
          }}
        />
        <div className="render-dial__center">
          {completed ? (
            <svg className="render-check" viewBox="0 0 52 52">
              <circle className="render-check__circle" cx="26" cy="26" r="23" />
              <path className="render-check__mark" d="M14 27 L22 35 L39 17" />
            </svg>
          ) : (
            <>
              <span className="render-dial__pct">{failed ? '✕' : `${Math.round(percent)}%`}</span>
              <span className="render-dial__lbl">{failed ? 'eroare' : 'randare'}</span>
            </>
          )}
        </div>
      </div>

      <h2 className="render-title">
        {completed ? 'Reel gata!' : failed ? 'Ceva n-a mers bine' : 'Reelul prinde formă'}
      </h2>
      <p className="render-sub">
        {completed
          ? 'Îl găsești în Istoric, gata de descărcat și postat.'
          : failed
          ? 'Randarea a eșuat. Poți încerca din nou din Editor.'
          : 'Combinăm clipurile, adăugăm subtitrări sincronizate și potrivim tăieturile pe ritm.'}
      </p>

      {!failed && !completed && (
        <div className="render-steps">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`render-step ${i < stepIndex ? 'render-step--done' : ''} ${i === stepIndex ? 'render-step--now' : ''}`}
            >
              <span className="render-step__dot">{i < stepIndex ? '✓' : ''}</span>
              {step}
            </div>
          ))}
        </div>
      )}

      {!completed && (
        <button type="button" className="render-cancel" onClick={onCancel}>
          {failed ? 'Înapoi la istoric' : 'Trimite în fundal'}
        </button>
      )}
    </div>
  )
}
