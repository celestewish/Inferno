import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GuestBoardView from './components/GuestBoardView.jsx'
import { initErrorMonitor } from './lib/errorMonitor'

// No-op unless VITE_ERROR_MONITOR_URL is set at build time.
initErrorMonitor()

// Guest board links (?guest=<token>) render a standalone read-only view and
// skip App entirely, so a guest never triggers the authenticated app's
// session bootstrap, data loads, or realtime subscriptions.
const guestToken = new URLSearchParams(window.location.search).get('guest')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {guestToken ? <GuestBoardView token={guestToken} /> : <App />}
  </StrictMode>,
)
