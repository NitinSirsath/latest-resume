import { Button } from '@resumetailor/ui'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

interface SignInProps {
  onSuccess: (session: any) => void
  onError: (error: string) => void
}

export function SignIn({ onSuccess, onError }: SignInProps) {
  const handleLogin = async () => {
    const res = await sendMessage('LOGIN', undefined)
    if (res.error) onError(res.error)
    else if (res.session) onSuccess(res.session)
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-lg font-semibold text-center">Unlock Your Career Potential</h2>
      <p className="text-sm text-gray-500 text-center">Sign in to start tailoring your resumes.</p>
      <Button onClick={handleLogin} className="w-full">
        Sign in with Google
      </Button>
    </div>
  )
}
