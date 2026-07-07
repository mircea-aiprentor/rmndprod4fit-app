import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './ReelHistory.css'

const STATUS_LABELS = {
  processing: 'Se randează',
  done: 'Gata',
  error: 'Eroare',
}

function VideoThumb({ src }) {
  return (
    <video
      className="hist-thumb__video"
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = 0.1
      }}
    />
  )
}

export default function ReelHistory({ trainer, refreshSignal }) {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [openVideoId, setOpenVideoId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

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

  useEffect(() => {
    const hasProcessing = reels.some((r) => r.status === 'processing')
    if (!hasProcessing) return
    const interval = setInterval(loadReels, 5000)
    return () => clearInterval(interval)
  }, [reels, loadReels])

  const handleDelete = async (reelId) => {
    if (!window.confirm('Ștergi definitiv acest reel din istoric?')) return
    setDeletingId(reelId)
    const { error } = await supabase.from('reels').delete().eq('id', reelId)
    setDeletingId(null)
    if (error) {
      alert('Nu am putut șterge reel-ul.')
      return
    }
    setReels((prev) => prev.filter((r) => r.id !== reelId))
  }

  if (loading) {
    return <p className="hist-empty">Se încarcă...</p>
  }

  if (errorMessage) {
    return <p className="hist-empty">{errorMessage}</p>
  }

  if (reels.length === 0) {
    return (
      <p className="hist-empty">
        Niciun reel încă.
        <br />
        Generează primul din tabul alăturat.
      </p>
    )
  }

  return (
    <div className="hist-grid">
      {reels.map((reel) => {
        const isPlayable = reel.status === 'done' && reel.video_url
        const isOpen = openVideoId === reel.id
        return (
          <div key={reel.id} className="hist-card">
            <div
              className="hist-thumb"
              onClick={() => isPlayable && setOpenVideoId(isOpen ? null : reel.id)}
            >
              {isPlayable && <VideoThumb src={reel.video_url} />}

              <span className={`hist-status hist-status--${reel.status}`}>
                {STATUS_LABELS[reel.status] || reel.status}
              </span>

              {isPlayable && (
                <div className="hist-play">
                  <div className="hist-play__icon" />
                </div>
              )}

              <button
                type="button"
                className="hist-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(reel.id)
                }}
                disabled={deletingId === reel.id}
                aria-label="Șterge reel-ul"
              >
                ✕
              </button>
            </div>

            <div className="hist-meta">
              <div className="hist-name">{reel.tema || 'Fără temă'}</div>
              <div className="hist-date">
                {new Date(reel.created_at).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {reel.caption && <p className="hist-caption">{reel.caption}</p>}
            </div>

            {isOpen && isPlayable && (
              <div className="hist-player-overlay" onClick={() => setOpenVideoId(null)}>
                <video
                  className="hist-player-overlay__video"
                  src={reel.video_url}
                  controls
                  autoPlay
                  playsInline
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
