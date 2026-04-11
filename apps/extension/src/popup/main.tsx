import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '../index.css' // We might need to copy this or ensure it exists

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
