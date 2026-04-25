import { Button } from '@resumetailor/ui'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { useState } from 'react'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

interface SignInProps {
  onSuccess: (session: any) => void
  onError: (error: string) => void
}

export function SignIn({ onSuccess, onError }: SignInProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    console.log('[ResumeTailor] Initiating login...')
    try {
      const res = await sendMessage('LOGIN', undefined)
      console.log('[ResumeTailor] Login response:', res)
      if (res.error) {
        setError(res.error)
        onError(res.error)
      } else if (res.session) {
        onSuccess(res.session)
      } else {
        setError('Login cancelled or no session returned.')
      }
    } catch (err: any) {
      console.error('[ResumeTailor] Login failed:', err)
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-lg font-semibold text-center">Unlock Your Career Potential</h2>
      <p className="text-sm text-gray-500 text-center">Sign in to start tailoring your resumes.</p>
      <Button onClick={handleLogin} disabled={loading} className="w-full">
        {loading ? 'Opening Google Sign-in...' : 'Sign in with Google'}
      </Button>
      {error && (
        <p className="text-xs text-red-500 text-center bg-red-50 p-2 rounded w-full break-words">
          {error}
        </p>
      )}
    </div>
  )
}
