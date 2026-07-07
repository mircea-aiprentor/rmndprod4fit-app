import { useEffect, useRef, useState } from 'react'
import { MUSCLE_GROUPS, CONTENT_TYPES } from '../data/reelOptions'
import { MUSIC_TRACKS } from '../data/musicTracks'
import { supabase } from '../supabaseClient'
import BottomSheet from '../components/BottomSheet'
import './ReelForm.css'

const MIN_CLIPS = 1
const MAX_CLIPS = 6

const ICONS = {
  mode: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  ),
  muscle: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="3.4" height="6" rx="1" />
      <rect x="18.6" y="9" width="3.4" height="6" rx="1" />
      <line x1="5.4" y1="12" x2="18.6" y2="12" />
    </svg>
  ),
  type: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  ),
  clips: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="8.3" y1="5" x2="8.3" y2="19" />
      <line x1="15.7" y1="5" x2="15.7" y2="19" />
    </svg>
  ),
  music: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="18" r="2.8" />
      <circle cx="17" cy="16" r="2.8" />
      <path d="M9.8 18V5.5L19.8 3.5V16" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
    </svg>
  ),
}

function ReticleCorner({ className }) {
  return (
    <span className={`reticle-corner reticle-corner--sm ${className}`} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path d="M22 2 H6 a4 4 0 0 0-4 4 V22" />
      </svg>
    </span>
  )
}

function VideoThumb({ file, className }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!url) return null

  return (
    <video
      className={className}
      src={url}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = 0.1
      }}
    />
  )
}

export default function ReelForm({ trainer, onReelCreated }) {
  const [mode, setMode] = useState('prompt') // prompt | subtitle
  const [muscleGroup, setMuscleGroup] = useState('')
  const [contentType, setContentType] = useState('')
  const [altceva, setAltceva] = useState('')
  const [musicChoice, setMusicChoice] = useState('') // '' = fără muzică
  const [playingTrack, setPlayingTrack] = useState(null)
  const [clips, setClips] = useState([null])
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')
  const [activeSheet, setActiveSheet] = useState(null)

  const audioRef = useRef(null)

  const usesFreeText = mode === 'prompt' && altceva.trim().length > 0
  const filledClipsCount = clips.filter(Boolean).length

  const togglePreview = (trackId) => {
    const track = MUSIC_TRACKS.find((t) => t.id === trackId)
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
      if (prev.length <= MIN_CLIPS) return prev.map((c, i) => (i === index ? null : c))
      return prev.filter((_, i) => i !== index)
    })
  }

  const canSubmit =
    (mode === 'subtitle' || usesFreeText || (muscleGroup && contentType)) &&
    clips.length >= MIN_CLIPS &&
    clips.length <= MAX_CLIPS &&
    clips.every((c) => c !== null) &&
    status !== 'submitting'

  const handleSubmit = async () => {
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

      const payload = {
        reel_id: reelRow.id,
        trainer_id: trainer.id,
        content_mode: mode,
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
      setClips([null])
      onReelCreated?.()
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'A apărut o eroare.')
      setStatus('error')
    }
  }

  const chips = []
  chips.push({ text: mode === 'prompt' ? 'Prompt' : 'Subtitrare', lime: true })
  if (mode === 'prompt' && muscleGroup) {
    chips.push({ text: MUSCLE_GROUPS.find((m) => m.id === muscleGroup)?.label || muscleGroup })
  }
  if (mode === 'prompt' && contentType) {
    chips.push({ text: CONTENT_TYPES.find((c) => c.id === contentType)?.label || contentType })
  }
  if (musicChoice) {
    chips.push({ text: `♪ ${MUSIC_TRACKS.find((m) => m.id === musicChoice)?.label || musicChoice}` })
  }

  const toolButtons = [
    { key: 'mode', label: 'Mod', set: true },
    { key: 'muscle', label: 'Grupă', set: mode === 'prompt' && !!muscleGroup, disabled: mode !== 'prompt' },
    { key: 'type', label: 'Tip', set: mode === 'prompt' && !!contentType, disabled: mode !== 'prompt' },
    { key: 'clips', label: 'Clipuri', set: filledClipsCount >= MIN_CLIPS, badge: `${filledClipsCount}/${MAX_CLIPS}` },
    { key: 'music', label: 'Muzică', set: !!musicChoice },
    { key: 'note', label: 'Notă', set: altceva.trim().length > 0 },
  ]

  const sheetTitles = {
    mode: 'Ce vrei să faci?',
    muscle: 'Grupă musculară',
    type: 'Tip conținut',
    clips: `Clipuri (${filledClipsCount} din ${MAX_CLIPS}, minim ${MIN_CLIPS})`,
    music: 'Muzică',
    note: 'Altceva? (opțional)',
  }

  return (
    <div className="editor-screen">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      <div className="canvas reticle">
        <ReticleCorner className="reticle-corner--tl" />
        <ReticleCorner className="reticle-corner--tr" />
        <ReticleCorner className="reticle-corner--bl" />
        <ReticleCorner className="reticle-corner--br" />

        <div className="canvas__chips">
          {chips.map((chip, i) => (
            <span key={i} className={`cchip ${chip.lime ? 'cchip--lime' : ''}`}>
              {chip.text}
            </span>
          ))}
        </div>

        {filledClipsCount === 0 ? (
          <div className="canvas__empty">
            Alege minim {MIN_CLIPS} clip{MIN_CLIPS > 1 ? 'uri' : ''} ca să vezi previzualizarea aici
          </div>
        ) : (
          <>
            <div className="canvas__strip">
              {clips.filter(Boolean).map((c, i) => (
                <VideoThumb key={i} file={c} className="cstrip-clip" />
              ))}
            </div>
            <div className="canvas__dur">{filledClipsCount} clip{filledClipsCount > 1 ? 'uri' : ''}</div>
          </>
        )}
      </div>

      <div className="tool-tray">
        {toolButtons.map((btn) => (
          <button
            type="button"
            key={btn.key}
            className={`tool-btn ${btn.set ? 'tool-btn--set' : ''} ${btn.disabled ? 'tool-btn--disabled' : ''}`}
            onClick={() => !btn.disabled && setActiveSheet(btn.key)}
            disabled={btn.disabled}
          >
            <span className="tool-btn__icon">{ICONS[btn.key]}</span>
            <span className="tool-btn__label">{btn.label}</span>
            {btn.badge && <span className="tool-btn__badge">{btn.badge}</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`generate-btn ${canSubmit ? 'generate-btn--ready' : ''}`}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {status === 'submitting' ? 'Se urcă și se trimite...' : 'Generează reel'}
      </button>

      {status === 'done' && <p className="editor-status editor-status--ok">Trimis cu succes! Vezi progresul în „Istoricul meu".</p>}
      {status === 'error' && <p className="editor-status editor-status--error">{errorMessage || 'A apărut o problemă. Încearcă din nou.'}</p>}

      <BottomSheet isOpen={activeSheet === 'mode'} title={sheetTitles.mode} onClose={() => setActiveSheet(null)}>
        <div className="pill-toggle">
          <div
            className={`pill ${mode === 'prompt' ? 'pill--on' : 'pill--off'}`}
            onClick={() => setMode('prompt')}
          >
            Prompt (aleg eu tema)
          </div>
          <div
            className={`pill ${mode === 'subtitle' ? 'pill--on' : 'pill--off'}`}
            onClick={() => setMode('subtitle')}
          >
            Subtitrare (doar transcrie)
          </div>
        </div>
        <div className="sheet-hint">
          {mode === 'prompt'
            ? 'Alegem grupa musculară și tipul de conținut, apoi generăm un script nou pentru reel.'
            : 'Transcriem audio-ul clipurilor tale și punem subtitrări sincronizate, fără script nou.'}
        </div>
      </BottomSheet>

      <BottomSheet isOpen={activeSheet === 'muscle'} title={sheetTitles.muscle} onClose={() => setActiveSheet(null)}>
        {MUSCLE_GROUPS.map((opt) => (
          <div
            key={opt.id}
            className={`sheet-opt ${muscleGroup === opt.id ? 'sheet-opt--sel' : ''}`}
            onClick={() => {
              setMuscleGroup(opt.id)
              setActiveSheet(null)
            }}
          >
            {opt.label} {muscleGroup === opt.id ? '✓' : ''}
          </div>
        ))}
      </BottomSheet>

      <BottomSheet isOpen={activeSheet === 'type'} title={sheetTitles.type} onClose={() => setActiveSheet(null)}>
        {CONTENT_TYPES.map((opt) => (
          <div
            key={opt.id}
            className={`sheet-opt ${contentType === opt.id ? 'sheet-opt--sel' : ''}`}
            onClick={() => {
              setContentType(opt.id)
              setActiveSheet(null)
            }}
          >
            {opt.label} {contentType === opt.id ? '✓' : ''}
          </div>
        ))}
      </BottomSheet>

      <BottomSheet isOpen={activeSheet === 'music'} title={sheetTitles.music} onClose={() => setActiveSheet(null)}>
        <div
          className={`sheet-opt ${!musicChoice ? 'sheet-opt--sel' : ''}`}
          onClick={() => {
            setMusicChoice('')
            setActiveSheet(null)
          }}
        >
          Fără muzică {!musicChoice ? '✓' : ''}
        </div>
        {MUSIC_TRACKS.map((track) => (
          <div key={track.id} className={`sheet-opt sheet-opt--music ${musicChoice === track.id ? 'sheet-opt--sel' : ''}`}>
            <span
              className="sheet-opt__label"
              onClick={() => {
                setMusicChoice(track.id)
                setActiveSheet(null)
              }}
            >
              {track.label} {musicChoice === track.id ? '✓' : ''}
            </span>
            <button
              type="button"
              className="sheet-opt__play"
              onClick={(e) => {
                e.stopPropagation()
                togglePreview(track.id)
              }}
            >
              {playingTrack === track.id ? '❚❚' : '▶'}
            </button>
          </div>
        ))}
      </BottomSheet>

      <BottomSheet isOpen={activeSheet === 'note'} title={sheetTitles.note} onClose={() => setActiveSheet(null)}>
        <textarea
          className="sheet-textarea"
          placeholder="ex: cum îmi încălzesc genunchii înainte de picioare"
          value={altceva}
          onChange={(e) => setAltceva(e.target.value)}
        />
        <div className="sheet-hint">Dacă completezi, are prioritate față de grupă / tip.</div>
      </BottomSheet>

      <BottomSheet isOpen={activeSheet === 'clips'} title={sheetTitles.clips} onClose={() => setActiveSheet(null)}>
        {clips.map((clip, index) => (
          <label key={index} className={`clip-row ${clip ? 'clip-row--filled' : ''}`}>
            <span className="clip-row__num">{index + 1}</span>
            {clip && <VideoThumb file={clip} className="clip-row__thumb" />}
            <span className="clip-row__name">{clip ? clip.name : 'Alege un clip video'}</span>
            <input
              type="file"
              accept="video/*"
              className="clip-row__input"
              onChange={(e) => handleClipChange(index, e.target.files?.[0] ?? null)}
            />
            {clips.length > MIN_CLIPS && clip && (
              <button
                type="button"
                className="clip-row__x"
                onClick={(e) => {
                  e.preventDefault()
                  removeClipSlot(index)
                }}
              >
                ✕
              </button>
            )}
          </label>
        ))}
        {clips.length < MAX_CLIPS && (
          <div className="add-clip" onClick={addClipSlot}>
            + Adaugă încă un clip
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
