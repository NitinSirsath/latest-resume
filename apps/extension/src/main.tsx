import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Session } from '@supabase/supabase-js'

function Popup() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      setSession(res)
    })
  }, [])

  const handleLogin = () => {
    chrome.runtime.sendMessage({ type: 'LOGIN' }, (res) => {
      if (res.error) setError(res.error)
      else setSession(res.session)
    })
  }

  return (
    <div className="p-4 w-80">
      <h1 className="text-xl font-bold mb-4">ResumeTailor</h1>
      {session ? (
        <div className="space-y-2">
          <p className="text-sm text-green-600">Logged in as: {session.user.email}</p>
          <button 
            className="w-full py-2 bg-gray-200 rounded"
            onClick={() => chrome.runtime.sendMessage({ type: 'LOGOUT' })}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={handleLogin}
            className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Sign In with Google
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
