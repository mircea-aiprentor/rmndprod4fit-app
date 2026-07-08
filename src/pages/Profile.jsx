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
  const [planGroup, setPlanGroup] = useState('platform') // platform | pro
  const [selectedPlanId, setSelectedPlanId] = useState(null)

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

  const visiblePlans = allPlans.filter((p) => p.is_plus === (planGroup === 'pro'))
  const selectedPlan = allPlans.find((p) => p.id === selectedPlanId) || null

  return (
    <div className="editor-screen profile-screen">
      <div className="edits-top">
        <button className="edits-x" onClick={onBack} aria-label="Înapoi">‹</button>
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
            <div className="profile-emblem" style={{ '--badge-color': plan.badge_color }}>
              <span className="profile-emblem__ring" />
              <span className="profile-emblem__label">{plan.badge_label}</span>
            </div>
          ) : (
            <span className="cchip">Fără plan activ</span>
          )}
        </div>

        <div className="plans-sub" style={{ padding: '0 0 4px' }}>Analitici</div>
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
            <div className="profile-stat__label">Timp economisit*</div>
          </div>
        </div>
        <p className="plans-foot-note">*estimat, față de editare manuală (~25 min/reel)</p>

        <div className="plans-sub" style={{ padding: '10px 0 4px' }}>Activitate recentă</div>
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

        <div className="plans-top" style={{ padding: '14px 0 0' }}>
          <div className="plans-title">Planuri</div>
          {plan && <div className="plans-badge">Planul tău: {plan.name}</div>}
        </div>
        <div className="plans-sub" style={{ padding: '6px 0 10px' }}>
          Două moduri de lucru — de la un tool AI, până la <b>done-for-you</b> complet.
        </div>

        <div className="pill-toggle" style={{ margin: '0 0 12px' }}>
          <div
            className={`pill ${planGroup === 'platform' ? 'pill--on' : 'pill--off'}`}
            onClick={() => setPlanGroup('platform')}
          >
            Platform
          </div>
          <div
            className={`pill ${planGroup === 'pro' ? 'pill--on' : 'pill--off'}`}
            onClick={() => setPlanGroup('pro')}
          >
            + Professional
          </div>
        </div>

        {visiblePlans.map((p) => {
          const isCurrent = plan?.id === p.id
          const isSelected = selectedPlanId === p.id
          return (
            <div
              key={p.id}
              className={`plan-card ${isSelected ? 'plan-card--selected' : ''} ${isCurrent ? 'plan-card--current' : ''}`}
              onClick={() => setSelectedPlanId(isSelected ? null : p.id)}
            >
              <div className="plan-card-head">
                <div className="plan-name">{p.name}{isCurrent ? ' · activ' : ''}</div>
                <div className="plan-check">✓</div>
              </div>
              <div className="plan-desc">{p.description}</div>
              <div className="plan-price-row">
                <div className="plan-price">{p.price_label}</div>
                <div className="plan-price-yr">{p.price_yearly_label}</div>
              </div>
              <div className="plan-select-btn">{isCurrent ? 'Planul curent' : 'Alege planul'}</div>
            </div>
          )
        })}

        <div className="plans-foot-note">
          Fiecare plan: lunar sau anual −29%. Gym-Studio: prețul afișat = până la 5 antrenori.
        </div>

        <button className="generate-btn" disabled style={{ marginTop: 14 }}>
          {selectedPlan ? `Continuă cu ${selectedPlan.name} — disponibil în pasul următor` : 'Alege un plan mai sus'}
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
