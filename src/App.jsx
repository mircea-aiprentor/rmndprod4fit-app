import { useState } from 'react'
import Login from './pages/Login'
import './App.css'

function App() {
  const [trainer, setTrainer] = useState(null)

  if (!trainer) {
    return <Login onLoginSuccess={setTrainer} />
  }

  return (
    <div className="dashboard-placeholder">
      <p className="dashboard-placeholder__eyebrow">Conectat ca</p>
      <h1 className="dashboard-placeholder__name">{trainer.name}</h1>
      <p className="dashboard-placeholder__note">
        Aici urmează formularul de generare reel (temă, mușchi, muzică, upload clipuri).
      </p>
      <button className="dashboard-placeholder__logout" onClick={() => setTrainer(null)}>
        Deconectează-te
      </button>
    </div>
  )
}

export default App
