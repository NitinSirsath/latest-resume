import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { SignIn } from './components/SignIn'
import { Dashboard } from './components/Dashboard'
import { chromeStorage, StorageContext } from '../lib/chrome-storage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@resumetailor/ui'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()
const queryClient = new QueryClient()

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [context, setContext] = useState<StorageContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get Session
        const currentSession = await sendMessage('GET_SESSION', undefined)
        setSession(currentSession)

        // 2. Get AI Context from storage
        const currentContext = await chromeStorage.getContext()
        setContext(currentContext)
      } catch (err) {
        console.error('Failed to init popup', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    // 3. Listen for storage changes (background updates)
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['RT_CONTEXT']) {
        setContext(changes['RT_CONTEXT'].newValue)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  if (loading) return <div className="p-8 text-center text-sm animate-pulse">Checking status...</div>

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="resumetailor-extension-theme">
        <div className="w-80 min-h-[400px] bg-slate-50 dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800 transition-colors duration-300">
          {!session ? (
            <SignIn 
              onSuccess={(s) => setSession(s)} 
              onError={(e) => console.error(e)} 
            />
          ) : (
            <Dashboard 
              session={session} 
              context={context}
              onSignOut={() => {
                setSession(null)
                setContext(null)
              }} 
            />
          )}
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
