import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [trainer, setTrainer] = useState(null)

  if (!trainer) {
    return <Login onLoginSuccess={setTrainer} />
  }

  return <Dashboard trainer={trainer} onLogout={() => setTrainer(null)} />
}

export default App
