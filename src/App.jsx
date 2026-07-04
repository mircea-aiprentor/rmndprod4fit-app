import { useState } from 'react'
import Login from './pages/Login'
import ReelForm from './pages/ReelForm'

function App() {
  const [trainer, setTrainer] = useState(null)

  if (!trainer) {
    return <Login onLoginSuccess={setTrainer} />
  }

  return <ReelForm trainer={trainer} onLogout={() => setTrainer(null)} />
}

export default App
