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
      <nav className="dashboard-seg">
        <button
          className={`dashboard-seg__btn ${activeTab === 'form' ? 'dashboard-seg__btn--active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          Editor
        </button>
        <button
          className={`dashboard-seg__btn ${activeTab === 'history' ? 'dashboard-seg__btn--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Istoric
        </button>
      </nav>
      <div className="dashboard-content" key={activeTab}>
        {activeTab === 'form' ? (
          <ReelForm trainer={trainer} onReelCreated={handleReelCreated} />
        ) : (
          <ReelHistory trainer={trainer} refreshSignal={refreshSignal} />
        )}
      </div>
    </div>
  )
}
