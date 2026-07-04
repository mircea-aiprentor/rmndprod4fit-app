import { useRef, useState } from 'react'
import { MUSCLE_GROUPS, CONTENT_TYPES } from '../data/reelOptions'
import { MUSIC_TRACKS } from '../data/musicTracks'
import './ReelForm.css'

const CLIP_SLOTS = [0, 1, 2]

export default function ReelForm({ trainer, onLogout }) {
  const [muscleGroup, setMuscleGroup] = useState(null)
  const [contentType, setContentType] = useState(null)
  const [altceva, setAltceva] = useState('')
  const [musicChoice, setMusicChoice] = useState('track1')
  const [playingTrack, setPlayingTrack] = useState(null)
  const [clips, setClips] = useState([null, null, null])
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')

  const audioRef = useRef(null)

  const usesFreeText = altceva.trim().length > 0

  const togglePreview = (track) => {
    if (playingTrack === track.id) {
      audioRef.current?.pause()
      setPlayingTrack(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.play()
    }
    setPlayingTrack(track.id)
  }

  const handleClipChange = (index, file) => {
    setClips((prev) => {
      const next = [...prev]
      next[index] = file
      return next
    })
  }

  const canSubmit =
    (usesFreeText || (muscleGroup && contentType)) &&
    clips.every((c) => c !== null) &&
    status !== 'submitting'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      // 1. Urcăm fiecare clip video, pe rând, către backend (care le pune în R2)
      const clipUrls = []
      for (let i = 0; i < clips.length; i++) {
        const formData = new FormData()
        formData.append('file', clips[i])
        formData.append('trainer_id', trainer.id)
        formData.append('slot', String(i))

        const uploadRes = await fetch('/api/upload-clip', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error(`Upload eșuat la clipul ${i + 1}`)
        }

        const { url } = await uploadRes.json()
        clipUrls.push(url)
      }

      // 2. Trimitem comanda finală către n8n, prin backend-ul care ascunde cheia API
      const payload = {
        trainer_id: trainer.id,
        tema: usesFreeText ? altceva.trim() : undefined,
        muscle_group: usesFreeText ? undefined : muscleGroup,
        content_type: usesFreeText ? undefined : contentType,
        music_choice: musicChoice,
        clip_urls: clipUrls,
      }

      const submitRes = await fetch('/api/submit-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!submitRes.ok) {
        throw new Error('Trimiterea către n8n a eșuat.')
      }

      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'A apărut o eroare.')
      setStatus('error')
    }
  }

  return (
    <div className="reel-form-screen">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      <header className="reel-form-header">
        <div>
          <p className="reel-form-eyebrow">Conectat ca</p>
          <h1 className="reel-form-name">{trainer.name}</h1>
        </div>
        <button className="reel-form-logout" onClick={onLogout}>
          Deconectează-te
        </button>
      </header>

      <form className="reel-form" onSubmit={handleSubmit}>
        <section className="reel-section">
          <h2 className="reel-section__title">Grupă musculară</h2>
          <div className="pill-row">
            {MUSCLE_GROUPS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`pill ${muscleGroup === option.id ? 'pill--active' : ''}`}
                onClick={() => setMuscleGroup(option.id)}
                disabled={usesFreeText}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="reel-section">
          <h2 className="reel-section__title">Tip conținut</h2>
          <div className="pill-row">
            {CONTENT_TYPES.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`pill ${contentType === option.id ? 'pill--active' : ''}`}
                onClick={() => setContentType(option.id)}
                disabled={usesFreeText}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="reel-section">
          <label className="reel-section__title" htmlFor="altceva">
            Altceva? (opțional — dacă completezi, are prioritate)
          </label>
          <input
            id="altceva"
            className="reel-input"
            type="text"
            placeholder="ex: Cum îmi încălzesc genunchii înainte de picioare"
            value={altceva}
            onChange={(e) => setAltceva(e.target.value)}
          />
        </section>

        <section className="reel-section">
          <h2 className="reel-section__title">Muzică</h2>
          <div className="track-list">
            {MUSIC_TRACKS.map((track) => (
              <div
                key={track.id}
                className={`track-row ${musicChoice === track.id ? 'track-row--active' : ''}`}
                onClick={() => setMusicChoice(track.id)}
              >
                <span className="track-row__label">{track.label}</span>
                <button
                  type="button"
                  className="track-row__play"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePreview(track)
                  }}
                  aria-label={playingTrack === track.id ? 'Oprește previzualizarea' : 'Ascultă previzualizarea'}
                >
                  {playingTrack === track.id ? '❚❚' : '▶'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="reel-section">
          <h2 className="reel-section__title">Clipuri (3 fișiere video)</h2>
          <div className="clip-slots">
            {CLIP_SLOTS.map((index) => (
              <label key={index} className="clip-slot">
                <span className="clip-slot__number">{index + 1}</span>
                <span className="clip-slot__text">
                  {clips[index] ? clips[index].name : 'Alege un clip video'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="clip-slot__input"
                  onChange={(e) => handleClipChange(index, e.target.files?.[0] ?? null)}
                />
              </label>
            ))}
          </div>
        </section>

        <button type="submit" className="reel-submit" disabled={!canSubmit}>
          {status === 'submitting' ? 'Se urcă clipurile și se trimite...' : 'Generează reel'}
        </button>

        {status === 'done' && (
          <p className="reel-status reel-status--ok">
            Trimis cu succes! Reel-ul se randează acum — vei primi videoul gata (vezi
            callback-ul din n8n).
          </p>
        )}

        {status === 'error' && (
          <p className="reel-status reel-status--error">
            {errorMessage || 'A apărut o problemă. Încearcă din nou.'}
          </p>
        )}
      </form>
    </div>
  )
}
