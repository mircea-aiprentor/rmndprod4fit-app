import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Profile.css'

function formatMinutes(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.round(totalSeconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'chiar acum'
  if (mins < 60) return `acum ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `acum ${hours} h`
  const days = Math.floor(hours / 24)
  return `acum ${days} zi${days > 1 ? 'le' : ''}`
}

export default function Profile({ trainer, onBack, onLogout }) {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [allPlans, setAllPlans] = useState([])
  const [reels, setReels] = useState([])
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(trainer.avatar_url || null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const [trainerRes, plansRes, reelsRes] = await Promise.all([
        supabase
          .from('trainers')
          .select('*, plan:plans(*)')
          .eq('id', trainer.id)
          .single(),
        supabase.from('plans').select('*').order('tier', { ascending: true }),
        supabase
          .from('reels')
          .select('id, tema, status, duration_seconds, created_at')
          .eq('trainer_id', trainer.id)
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      if (!active) return

      if (trainerRes.data?.plan) setPlan(trainerRes.data.plan)
      if (trainerRes.data?.avatar_url) setAvatarUrl(trainerRes.data.avatar_url)
      if (plansRes.data) setAllPlans(plansRes.data)
      if (reelsRes.data) setReels(reelsRes.data)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [trainer.id])

  const doneReels = reels.filter((r) => r.status === 'done')
  const totalReels = reels.length
  const totalDurationSeconds = doneReels.reduce((sum, r) => sum + (r.duration_seconds || 0), 0)

  const now = new Date()
  const reelsThisMonth = reels.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // estimare simpatică: editare manuală ~ 25 min per reel, față de generarea automată
  const estimatedManualMinutes = doneReels.length * 25
  const estimatedActualMinutes = totalDurationSeconds / 60
  const estimatedSavedMinutes = Math.max(0, Math.round(estimatedManualMinutes - estimatedActualMinutes))

  const recentActivity = reels.slice(0, 5)

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploading(true)
    try {
      // notă: necesită endpoint dedicat pentru avatar — vine în pasul următor
      const presignRes = await fetch('/api/get-avatar-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: trainer.id, content_type: file.type || 'image/jpeg' }),
      })
      if (!presignRes.ok) throw new Error('no-endpoint')
      const { uploadUrl, publicUrl } = await presignRes.json()

      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })

      await supabase.from('trainers').update({ avatar_url: publicUrl }).eq('id', trainer.id)
      setAvatarUrl(publicUrl)
    } catch (err) {
      console.error(err)
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="profile-screen">
      <div className="profile-top">
        <button className="profile-back" onClick={onBack} aria-label="Înapoi">‹</button>
        <span className="profile-top__title">Profil</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="profile-scroll">
        <div className="profile-identity">
          <label className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-avatar__img" />
            ) : (
              <span className="profile-avatar__placeholder">{(trainer.name || '?').charAt(0).toUpperCase()}</span>
            )}
            <span className="profile-avatar__edit">{avatarUploading ? '...' : '✎'}</span>
            <input type="file" accept="image/*" className="profile-avatar__input" onChange={handleAvatarPick} />
          </label>

          <h2 className="profile-name">{trainer.name}</h2>

          {plan ? (
            <span className="profile-badge" style={{ '--badge-color': plan.badge_color }}>
              {plan.badge_label}
            </span>
          ) : (
            <span className="profile-badge profile-badge--none">Fără plan activ</span>
          )}
        </div>

        <div className="profile-section-title">Analitici</div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat__value">{totalReels}</div>
            <div className="profile-stat__label">Reels generate</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat__value">{formatMinutes(totalDurationSeconds)}</div>
            <div className="profile-stat__label">Video randat</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat__value">{reelsThisMonth}</div>
            <div className="profile-stat__label">Luna aceasta</div>
          </div>
          <div className="profile-stat profile-stat--accent">
            <div className="profile-stat__value">{estimatedSavedMinutes}m</div>
            <div className="profile-stat__label">Timp economisit* </div>
          </div>
        </div>
        <p className="profile-stat-note">*estimat, față de editare manuală (~25 min/reel)</p>

        <div className="profile-section-title">Activitate recentă</div>
        <div className="profile-activity">
          {loading && <p className="profile-empty">Se încarcă...</p>}
          {!loading && recentActivity.length === 0 && (
            <p className="profile-empty">Niciun reel încă.</p>
          )}
          {recentActivity.map((r) => (
            <div key={r.id} className="profile-activity__row">
              <span className={`profile-activity__dot profile-activity__dot--${r.status}`} />
              <span className="profile-activity__name">{r.tema || 'Reel'}</span>
              <span className="profile-activity__time">{timeAgo(r.created_at)}</span>
            </div>
          ))}
        </div>

        <div className="profile-section-title">Planul tău</div>
        <div className="profile-plans">
          {allPlans.map((p) => (
            <div
              key={p.id}
              className={`profile-plan-card ${plan?.id === p.id ? 'profile-plan-card--current' : ''}`}
            >
              <div className="profile-plan-card__head">
                <span className="profile-plan-card__name">{p.name}</span>
                {plan?.id === p.id && <span className="profile-plan-card__current-tag">Activ</span>}
              </div>
              <div className="profile-plan-card__price">{p.price_label}</div>
            </div>
          ))}
        </div>

        <button className="profile-cta" disabled>
          Alege / schimbă planul — disponibil în pasul următor
        </button>

        {plan && (
          <button className="profile-cancel" disabled>
            Anulează plata recurentă — disponibil în pasul următor
          </button>
        )}

        <button className="profile-logout" onClick={onLogout}>
          Deconectează-te
        </button>
      </div>
    </div>
  )
}
