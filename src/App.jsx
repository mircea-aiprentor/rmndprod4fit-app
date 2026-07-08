import { useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  const [trainer, setTrainer] = useState(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setTrainer(null)
  }

  if (!trainer) {
    return <Login onLoginSuccess={setTrainer} />
  }
  return <Dashboard trainer={trainer} onLogout={handleLogout} />
}

export default App
