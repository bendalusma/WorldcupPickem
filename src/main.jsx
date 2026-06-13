import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthProvider.jsx'
import { ParticipantProvider } from './lib/ParticipantProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ParticipantProvider>
          <App />
        </ParticipantProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
