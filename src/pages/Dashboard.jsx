import { useRef, useState } from 'react'
import ReelForm from './ReelForm'
import ReelHistory from './ReelHistory'
import RenderScreen from './RenderScreen'
import Profile from './Profile'
import './Dashboard.css'
import './DashboardTopBar.css'

export default function Dashboard({ trainer, onLogout }) {
  const [view, setView] = useState('editor') // editor | render | history | profile
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [renderingReelId, setRenderingReelId] = useState(null)
  const [formState, setFormState] = useState({ canSubmit: false, submitting: false })
  const reelFormRef = useRef(null)

  const handleRenderStart = (reelId) => {
    setRenderingReelId(reelId)
    setView('render')
  }

  const handleRenderDone = () => {
    setRefreshSignal((n) => n + 1)
    setView('history')
  }

  const handleRenderExit = () => {
    setRefreshSignal((n) => n + 1)
    setView('history')
  }

  return (
    <div className="dashboard-screen">
      {view !== 'render' && view !== 'profile' && (
        <div className="edits-top">
          <button className="edits-x" onClick={onLogout} aria-label="Delogare">✕</button>
          <div className="edits-seg">
            <button
              className={`seg-btn ${view === 'editor' ? 'seg-btn--active' : ''}`}
              onClick={() => setView('editor')}
            >
              Editor
            </button>
            <button
              className={`seg-btn ${view === 'history' ? 'seg-btn--active' : ''}`}
              onClick={() => setView('history')}
            >
              Istoric
            </button>
          </div>
          <button
            type="button"
            className={`btn-generate-top ${formState.canSubmit ? 'btn-generate-top--ready' : ''}`}
            disabled={view !== 'editor' || !formState.canSubmit}
            onClick={() => reelFormRef.current?.submit()}
          >
            {formState.submitting ? 'Se trimite...' : 'Generează'}
          </button>
        </div>
      )}

      <div className="dashboard-content" key={view}>
        {view === 'editor' && (
          <ReelForm
            ref={reelFormRef}
            trainer={trainer}
            onRenderStart={handleRenderStart}
            onOpenProfile={() => setView('profile')}
            onStateChange={setFormState}
          />
        )}
        {view === 'render' && (
          <RenderScreen reelId={renderingReelId} onDone={handleRenderDone} onCancel={handleRenderExit} />
        )}
        {view === 'history' && <ReelHistory trainer={trainer} refreshSignal={refreshSignal} />}
        {view === 'profile' && (
          <Profile trainer={trainer} onBack={() => setView('editor')} onLogout={onLogout} />
        )}
      </div>
    </div>
  )
}
