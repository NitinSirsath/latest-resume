import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '../index.css' // We might need to copy this or ensure it exists
import * as Sentry from "@sentry/browser"

Sentry.init({
  dsn: "https://3b4e9793c03b6cd0a01e3769400885de@o4511316837269504.ingest.us.sentry.io/4511319558455296",
  tracesSampleRate: 1.0,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
