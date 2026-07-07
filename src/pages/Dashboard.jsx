import { useState } from 'react'
import ReelForm from './ReelForm'
import ReelHistory from './ReelHistory'
import RenderScreen from './RenderScreen'
import './Dashboard.css'

export default function Dashboard({ trainer, onLogout }) {
  const [view, setView] = useState('editor') // editor | render | history
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [renderingReelId, setRenderingReelId] = useState(null)

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
      <header className="dashboard-header">
        <div className="dashboard-header__identity">
          <img src="/logo.png" alt="" className="dashboard-header__mark" />
          <div>
            <p className="dashboard-eyebrow">Conectat ca</p>
            <h1 className="dashboard-name">{trainer.name}</h1>
          </div>
        </div>
        <button className="dashboard-logout" onClick={onLogout}>
          Deconectează-te
        </button>
      </header>

      {view !== 'render' && (
        <nav className="dashboard-seg">
          <button
            className={`dashboard-seg__btn ${view === 'editor' ? 'dashboard-seg__btn--active' : ''}`}
            onClick={() => setView('editor')}
          >
            Editor
          </button>
          <button
            className={`dashboard-seg__btn ${view === 'history' ? 'dashboard-seg__btn--active' : ''}`}
            onClick={() => setView('history')}
          >
            Istoric
          </button>
        </nav>
      )}

      <div className="dashboard-content" key={view}>
        {view === 'editor' && <ReelForm trainer={trainer} onRenderStart={handleRenderStart} />}
        {view === 'render' && (
          <RenderScreen reelId={renderingReelId} onDone={handleRenderDone} onCancel={handleRenderExit} />
        )}
        {view === 'history' && <ReelHistory trainer={trainer} refreshSignal={refreshSignal} />}
      </div>
    </div>
  )
}
