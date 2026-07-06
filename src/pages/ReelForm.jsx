import { useRef, useState } from 'react'
import { MUSCLE_GROUPS, CONTENT_TYPES } from '../data/reelOptions'
import { MUSIC_TRACKS } from '../data/musicTracks'
import { supabase } from '../supabaseClient'
import './ReelForm.css'

const MIN_CLIPS = 2
const MAX_CLIPS = 6

export default function ReelForm({ trainer, onReelCreated }) {
  const [mode, setMode] = useState('prompt') // prompt | subtitle
  const [muscleGroup, setMuscleGroup] = useState('')
  const [contentType, setContentType] = useState('')
  const [altceva, setAltceva] = useState('')
  const [musicChoice, setMusicChoice] = useState('') // '' = fără muzică
  const [playingTrack, setPlayingTrack] = useState(null)
  const [clips, setClips] = useState([null, null])
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')

  const audioRef = useRef(null)

  const usesFreeText = mode === 'prompt' && altceva.trim().length > 0

  const togglePreview = () => {
    const track = MUSIC_TRACKS.find((t) => t.id === musicChoice)
    if (!track) return
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

  const addClipSlot = () => {
    setClips((prev) => {
      if (prev.length >= MAX_CLIPS) return prev
      return [...prev, null]
    })
  }

  const removeClipSlot = (index) => {
    setClips((prev) => {
      if (prev.length <= MIN_CLIPS) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const canSubmit =
    (mode === 'subtitle' || usesFreeText || (muscleGroup && contentType)) &&
    clips.length >= MIN_CLIPS &&
    clips.length <= MAX_CLIPS &&
    clips.every((c) => c !== null) &&
    status !== 'submitting'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const temaValue = mode === 'subtitle'
        ? undefined
        : (usesFreeText ? altceva.trim() : undefined)
      const muscleGroupValue = mode === 'subtitle' || usesFreeText ? undefined : muscleGroup
      const contentTypeValue = mode === 'subtitle' || usesFreeText ? undefined : contentType

      const temaLabel = mode === 'subtitle'
        ? 'Subtitrare automată'
        : (temaValue || `${muscleGroupValue || ''} · ${contentTypeValue || ''}`)

      // 1. Creăm rândul în Supabase, cu status "processing", ca să avem un ID
      //    pe care n8n îl va folosi mai târziu ca să actualizeze rezultatul.
      const { data: reelRow, error: insertError } = await supabase
        .from('reels')
        .insert({
          trainer_id: trainer.id,
          tema: temaLabel,
          music_choice: musicChoice || null,
          status: 'processing',
        })
        .select()
        .single()

      if (insertError) {
        throw new Error('Nu am putut crea reel-ul în istoric.')
      }

      // 2. Pentru fiecare clip: cerem un URL presigned, apoi urcăm fișierul
      //    DIRECT în R2 (ocolim limita de timp/mărime a unei Cloudflare Function).
      const clipUrls = []
      for (let i = 0; i < clips.length; i++) {
        const file = clips[i]

        const presignRes = await fetch('/api/get-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainer_id: trainer.id,
            slot: i,
            content_type: file.type || 'video/mp4',
          }),
        })

        if (!presignRes.ok) {
          throw new Error(`Nu am putut pregăti upload-ul pentru clipul ${i + 1}.`)
        }

        const { uploadUrl, publicUrl } = await presignRes.json()

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/mp4' },
          body: file,
        })

        if (!putRes.ok) {
          throw new Error(`Upload eșuat la clipul ${i + 1}`)
        }

        clipUrls.push(publicUrl)
      }

      // 3. Trimitem comanda finală către n8n, prin backend-ul care ascunde cheia API
      const payload = {
        reel_id: reelRow.id,
        trainer_id: trainer.id,
        content_mode: mode, // 'prompt' | 'subtitle' — n8n decide ramura după asta
        tema: temaValue,
        muscle_group: muscleGroupValue,
        content_type: contentTypeValue,
        music_choice: musicChoice || null,
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
      setMuscleGroup('')
      setContentType('')
      setAltceva('')
      setMusicChoice('')
      setClips([null, null])
      onReelCreated?.()
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'A apărut o eroare.')
      setStatus('error')
    }
  }

  return (
    <div className="reel-form-screen">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      <form className="reel-form" onSubmit={handleSubmit}>
        <section className="reel-section">
          <h2 className="reel-section__title">Ce vrei să faci?</h2>
          <div className="pill-row">
            <button
              type="button"
              className={`pill ${mode === 'prompt' ? 'pill--active' : ''}`}
              onClick={() => setMode('prompt')}
            >
              Prompt (aleg eu tema)
            </button>
            <button
              type="button"
              className={`pill ${mode === 'subtitle' ? 'pill--active' : ''}`}
              onClick={() => setMode('subtitle')}
            >
              Subtitrare (doar transcrie)
            </button>
          </div>
        </section>

        {mode === 'prompt' && (
          <>
            <section className="reel-section">
              <label className="reel-section__title" htmlFor="muscle-group-select">
                Grupă musculară
              </label>
              <select
                id="muscle-group-select"
                className="reel-select"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                disabled={usesFreeText}
              >
                <option value="">Alege o grupă</option>
                {MUSCLE_GROUPS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="reel-section">
              <label className="reel-section__title" htmlFor="content-type-select">
                Tip conținut
              </label>
              <select
                id="content-type-select"
                className="reel-select"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                disabled={usesFreeText}
              >
                <option value="">Alege un tip</option>
                {CONTENT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
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
          </>
        )}

        <section className="reel-section">
          <h2 className="reel-section__title">
            Clipuri ({clips.length} din {MAX_CLIPS}, minim {MIN_CLIPS})
          </h2>
          <div className="clip-slots">
            {clips.map((clip, index) => (
              <label key={index} className="clip-slot">
                <span className="clip-slot__number">{index + 1}</span>
                <span className="clip-slot__text">
                  {clip ? clip.name : 'Alege un clip video'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="clip-slot__input"
                  onChange={(e) => handleClipChange(index, e.target.files?.[0] ?? null)}
                />
                {clips.length > MIN_CLIPS && (
                  <button
                    type="button"
                    className="clip-slot__remove"
                    onClick={(e) => {
                      e.preventDefault()
                      removeClipSlot(index)
                    }}
                    aria-label="Elimină acest clip"
                  >
                    ✕
                  </button>
                )}
              </label>
            ))}
          </div>

          {clips.length < MAX_CLIPS && (
            <button
              type="button"
              className="clip-slot__add"
              onClick={addClipSlot}
            >
              + Adaugă încă un clip
            </button>
          )}
        </section>

        <section className="reel-section">
          <label className="reel-section__title" htmlFor="music-select">
            Muzică (opțional)
          </label>
          <div className="music-picker">
            <select
              id="music-select"
              className="reel-select"
              value={musicChoice}
              onChange={(e) => {
                setMusicChoice(e.target.value)
                setPlayingTrack(null)
                audioRef.current?.pause()
              }}
            >
              <option value="">Fără muzică</option>
              {MUSIC_TRACKS.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
            {musicChoice && (
              <button
                type="button"
                className="music-picker__play"
                onClick={togglePreview}
                aria-label={playingTrack === musicChoice ? 'Oprește previzualizarea' : 'Ascultă previzualizarea'}
              >
                {playingTrack === musicChoice ? '❚❚' : '▶'}
              </button>
            )}
          </div>
        </section>

        <button type="submit" className="reel-submit" disabled={!canSubmit}>
          {status === 'submitting' ? 'Se urcă clipurile și se trimite...' : 'Generează reel'}
        </button>

        {status === 'done' && (
          <p className="reel-status reel-status--ok">
            Trimis cu succes! Urmărește progresul în „Istoricul meu".
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
