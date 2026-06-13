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
        <div className="brand-lockup">
          <span className="world-cup-mark" aria-hidden="true">
            <svg
              className="world-cup-icon"
              viewBox="0 0 64 88"
              focusable="false"
            >
              <circle className="world-cup-globe" cx="32" cy="17" r="14" />
              <path
                className="world-cup-body"
                d="M18 18c-7 4-11 12-10 21 1 10 8 16 17 18v11h14V57c9-2 16-8 17-18 1-9-3-17-10-21-1 12-6 23-14 31-8-8-13-19-14-31Z"
              />
              <path
                className="world-cup-relief"
                d="M23 27c2 8 5 14 9 19 4-5 7-11 9-19"
              />
              <path className="world-cup-stem" d="M23 68h18l4 9H19l4-9Z" />
              <rect className="world-cup-base" x="15" y="77" width="34" height="8" rx="3" />
            </svg>
          </span>
          <h1 className="brand-title">
            <span className="brand-main">Jeu Pronostics</span>
            <span className="brand-subtitle">Just for Fun</span>
          </h1>
        </div>
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
