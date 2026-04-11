import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { SignIn } from './components/SignIn'
import { Dashboard } from './components/Dashboard'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const currentSession = await sendMessage('GET_SESSION', undefined)
        setSession(currentSession)
      } catch (err) {
        console.error('Failed to get session', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) return <div className="p-8 text-center text-sm">Loading...</div>

  return (
    <div className="w-80 min-h-[300px] bg-slate-50">
      {session ? (
        <Dashboard 
          session={session} 
          onSignOut={() => setSession(null)} 
        />
      ) : (
        <SignIn 
          onSuccess={(s) => setSession(s)} 
          onError={(e) => setError(e)} 
        />
      )}
      {error && <p className="text-[10px] text-red-500 p-2 text-center">{error}</p>}
    </div>
  )
}
