import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from '@asgardeo/auth-react';

const config = {
  signInRedirectURL: `${window.location.origin}`,
  signOutRedirectURL: `${window.location.origin}`,
  clientID: import.meta.env.VITE_ASGARDEO_CLIENT_ID,
  baseUrl: import.meta.env.VITE_ASGARDEO_BASE_URL,
  scope: [ "openid", "profile", "email" ]
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider config={config}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
