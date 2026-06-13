import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Pronostics from './pages/Pronostics.jsx'
import Resultats from './pages/Resultats.jsx'
import Classement from './pages/Classement.jsx'
import Admin from './pages/Admin.jsx'
import MagicLink from './pages/MagicLink.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>⚽ Pronostics Coupe du Monde 2026</h1>
      </header>

      <nav className="tabbar">
        <NavLink to="/pronostics" className="tab">Mes Pronostics</NavLink>
        <NavLink to="/resultats" className="tab">Résultats</NavLink>
        <NavLink to="/classement" className="tab">Classement</NavLink>
        <NavLink to="/admin" className="tab">Admin</NavLink>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/pronostics" replace />} />
          <Route path="/pronostics" element={<Pronostics />} />
          <Route path="/resultats" element={<Resultats />} />
          <Route path="/classement" element={<Classement />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/p/:token" element={<MagicLink />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
