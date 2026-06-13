import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Pronostics from './pages/Pronostics.jsx'
import Resultats from './pages/Resultats.jsx'
import Picks from './pages/Picks.jsx'
import Classement from './pages/Classement.jsx'
import Admin from './pages/Admin.jsx'
import MagicLink from './pages/MagicLink.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-lockup">
          <img
            className="world-cup-mark"
            src="/world-cup-trophy.png"
            alt=""
            aria-hidden="true"
          />
          <h1 className="brand-title">
            <span className="brand-main">Jeu Pronostics</span>
            <span className="brand-subtitle">Just for Fun</span>
          </h1>
        </div>
      </header>

      <nav className="tabbar">
        <NavLink to="/pronostics" className="tab">Mes Pronostics</NavLink>
        <NavLink to="/resultats" className="tab">Résultats</NavLink>
        <NavLink to="/picks" className="tab">Picks</NavLink>
        <NavLink to="/classement" className="tab">Classement</NavLink>
        <NavLink to="/admin" className="tab">Admin</NavLink>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/pronostics" replace />} />
          <Route path="/pronostics" element={<Pronostics />} />
          <Route path="/resultats" element={<Resultats />} />
          <Route path="/picks" element={<Picks />} />
          <Route path="/classement" element={<Classement />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/p/:token" element={<MagicLink />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
