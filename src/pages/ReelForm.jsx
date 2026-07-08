import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { MUSCLE_GROUPS, CONTENT_TYPES } from '../data/reelOptions'
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
  tema: (
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
  profile: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.4" />
      <path d="M4.8 20c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4" />
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
  const [prevFile, setPrevFile] = useState(null)

  if (file !== prevFile) {
    setPrevFile(file)
    if (url) URL.revokeObjectURL(url)
    setUrl(file ? URL.createObjectURL(file) : null)
  }

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

const ReelForm = forwardRef(function ReelForm({ trainer, onRenderStart, onOpenProfile, onStateChange }, ref) {
  const [mode, setMode] = useState('prompt') // prompt | subtitle
  const [muscleGroup, setMuscleGroup] = useState('')
  const [contentType, setContentType] = useState('')
  const [altceva, setAltceva] = useState('')
  const [clips, setClips] = useState([null])
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')
  const [activeSheet, setActiveSheet] = useState(null)

  const usesFreeText = mode === 'prompt' && altceva.trim().length > 0
  const filledClipsCount = clips.filter(Boolean).length

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

  useEffect(() => {
    onStateChange?.({ canSubmit, submitting: status === 'submitting' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, status])

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

      setStatus('idle')
      setMuscleGroup('')
      setContentType('')
      setAltceva('')
      setClips([null])
      onRenderStart?.(reelRow.id)
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'A apărut o eroare.')
      setStatus('error')
    }
  }

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }))

  const chips = []
  chips.push({ text: mode === 'prompt' ? 'Prompt' : 'Subtitrare', lime: true })
  if (mode === 'prompt' && muscleGroup) {
    chips.push({ text: MUSCLE_GROUPS.find((m) => m.id === muscleGroup)?.label || muscleGroup })
  }
  if (mode === 'prompt' && contentType) {
    chips.push({ text: CONTENT_TYPES.find((c) => c.id === contentType)?.label || contentType })
  }

  const toolButtons = [
    { key: 'mode', label: 'Mod', set: true },
    {
      key: 'tema',
      label: 'Temă',
      set: mode === 'prompt' && !!muscleGroup && !!contentType,
      disabled: mode !== 'prompt',
    },
    { key: 'clips', label: 'Clipuri', set: filledClipsCount >= MIN_CLIPS, badge: `${filledClipsCount}/${MAX_CLIPS}` },
    { key: 'note', label: 'Notă', set: altceva.trim().length > 0 },
    { key: 'profile', label: 'Profil', set: false, action: 'profile' },
  ]

  const sheetTitles = {
    mode: 'Ce vrei să faci?',
    tema: 'Tema reel-ului',
    clips: `Clipuri (${filledClipsCount} din ${MAX_CLIPS}, minim ${MIN_CLIPS})`,
    note: 'Altceva? (opțional)',
  }

  return (
    <div className="editor-screen">
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
            onClick={() => {
              if (btn.disabled) return
              if (btn.action === 'profile') {
                onOpenProfile?.()
                return
              }
              setActiveSheet(btn.key)
            }}
            disabled={btn.disabled}
          >
            <span className="tool-btn__icon">{ICONS[btn.key]}</span>
            <span className="tool-btn__label">{btn.label}</span>
            {btn.badge && <span className="tool-btn__badge">{btn.badge}</span>}
          </button>
        ))}
      </div>

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

      <BottomSheet isOpen={activeSheet === 'tema'} title={sheetTitles.tema} onClose={() => setActiveSheet(null)}>
        <div className="sheet-hint" style={{ marginBottom: 14 }}>Grupă musculară</div>
        {MUSCLE_GROUPS.map((opt) => (
          <div
            key={opt.id}
            className={`sheet-opt ${muscleGroup === opt.id ? 'sheet-opt--sel' : ''}`}
            onClick={() => setMuscleGroup(opt.id)}
          >
            {opt.label} {muscleGroup === opt.id ? '✓' : ''}
          </div>
        ))}
        <div className="sheet-hint" style={{ margin: '18px 0 14px' }}>Tip conținut</div>
        {CONTENT_TYPES.map((opt) => (
          <div
            key={opt.id}
            className={`sheet-opt ${contentType === opt.id ? 'sheet-opt--sel' : ''}`}
            onClick={() => setContentType(opt.id)}
          >
            {opt.label} {contentType === opt.id ? '✓' : ''}
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
})

export default ReelForm
