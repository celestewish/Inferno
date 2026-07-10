import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initErrorMonitor } from './lib/errorMonitor'

// No-op unless VITE_ERROR_MONITOR_URL is set at build time.
initErrorMonitor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
