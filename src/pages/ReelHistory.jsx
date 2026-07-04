import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './ReelHistory.css'

const STATUS_LABELS = {
  processing: 'Se randează...',
  done: 'Gata',
  error: 'Eroare',
}

export default function ReelHistory({ trainer, refreshSignal }) {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadReels = useCallback(async () => {
    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .eq('trainer_id', trainer.id)
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage('Nu am putut încărca istoricul.')
      return
    }
    setErrorMessage('')
    setReels(data || [])
  }, [trainer.id])

  useEffect(() => {
    setLoading(true)
    loadReels().finally(() => setLoading(false))
  }, [loadReels, refreshSignal])

  // Reîmprospătare automată la fiecare 5 secunde, cât timp există reels în curs de randare
  useEffect(() => {
    const hasProcessing = reels.some((r) => r.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(loadReels, 5000)
    return () => clearInterval(interval)
  }, [reels, loadReels])

  if (loading) {
    return <p className="reel-history__empty">Se încarcă...</p>
  }

  if (errorMessage) {
    return <p className="reel-history__empty">{errorMessage}</p>
  }

  if (reels.length === 0) {
    return <p className="reel-history__empty">Nu ai generat încă niciun reel.</p>
  }

  return (
    <div className="reel-history">
      {reels.map((reel) => (
        <div key={reel.id} className="reel-card">
          <div className="reel-card__top">
            <span className="reel-card__tema">{reel.tema || 'Fără temă'}</span>
            <span className={`reel-card__status reel-card__status--${reel.status}`}>
              {STATUS_LABELS[reel.status] || reel.status}
            </span>
          </div>

          {reel.status === 'done' && reel.video_url && (
            <video
              className="reel-card__video"
              src={reel.video_url}
              controls
              playsInline
            />
          )}

          {reel.caption && <p className="reel-card__caption">{reel.caption}</p>}

          {reel.hashtags && (
            <p className="reel-card__hashtags">
              {Array.isArray(reel.hashtags) ? reel.hashtags.join(' ') : reel.hashtags}
            </p>
          )}

          <span className="reel-card__date">
            {new Date(reel.created_at).toLocaleString('ro-RO')}
          </span>
        </div>
      ))}
    </div>
  )
}
