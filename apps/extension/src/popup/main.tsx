import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '../index.css' // We might need to copy this or ensure it exists
import * as Sentry from "@sentry/browser"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
