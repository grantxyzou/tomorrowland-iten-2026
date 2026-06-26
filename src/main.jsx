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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
