import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import AuthGate from './auth/AuthGate.jsx'
import { GroupProvider } from './groups/GroupContext.jsx'
import GroupGate from './components/GroupGate.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import './index.css'

// Privacy page is public — no auth required. Short-circuit before the full tree.
const isPrivacy = window.location.pathname === '/privacy';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isPrivacy ? (
      <PrivacyPage />
    ) : (
      <AuthProvider>
        <AuthGate>
          <GroupProvider>
            <GroupGate>
              <App />
            </GroupGate>
          </GroupProvider>
        </AuthGate>
      </AuthProvider>
    )}
  </React.StrictMode>,
)

// Register the PWA service worker in production only (keeps Vite HMR uncached).
//
// Auto-update: without this, an installed PWA keeps running the old in-memory
// build on a warm resume — you'd have to force-quit to get a new deploy. The SW
// already skipWaiting()s + clients.claim()s, so when a new version is detected it
// takes control and fires `controllerchange`; we reload once to swap to it. We
// also poke `reg.update()` on focus/visibility so a resumed PWA actually checks
// for a new version. (sw.js is stamped per deploy, so its bytes change → the
// browser detects the update. Pick writes live in a persisted outbox, so a
// reload never loses anything.)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // True when an SW already controls this page (i.e. a return visit). On a
    // first-ever install the controller is null, so we must NOT reload then.
    const hadController = !!navigator.serviceWorker.controller
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return
      reloaded = true
      window.location.reload()
    })

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const checkForUpdate = () => { reg.update().catch(() => {}) }
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate() })
      window.addEventListener('focus', checkForUpdate)
    }).catch(() => {})
  })
}
