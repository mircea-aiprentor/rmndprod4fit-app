import { useState } from 'react'
import ReelForm from './ReelForm'
import ReelHistory from './ReelHistory'
import './Dashboard.css'

export default function Dashboard({ trainer, onLogout }) {
  const [activeTab, setActiveTab] = useState('form') // form | history
  const [refreshSignal, setRefreshSignal] = useState(0)

  const handleReelCreated = () => {
    setRefreshSignal((n) => n + 1)
    setActiveTab('history')
  }

  return (
    <div className="dashboard-screen">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Conectat ca</p>
          <h1 className="dashboard-name">{trainer.name}</h1>
        </div>
        <button className="dashboard-logout" onClick={onLogout}>
          Deconectează-te
        </button>
      </header>

      <nav className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === 'form' ? 'dashboard-tab--active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          Generează reel
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'history' ? 'dashboard-tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Istoricul meu
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'form' ? (
          <ReelForm trainer={trainer} onReelCreated={handleReelCreated} />
        ) : (
          <ReelHistory trainer={trainer} refreshSignal={refreshSignal} />
        )}
      </div>
    </div>
  )
}
