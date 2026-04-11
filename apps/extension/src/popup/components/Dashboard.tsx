import { Button, Card, CardHeader, CardTitle, CardContent } from '@resumetailor/ui'
import { Session } from '@supabase/supabase-js'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

interface DashboardProps {
  session: Session
  onSignOut: () => void
}

export function Dashboard({ session, onSignOut }: DashboardProps) {
  const handleSignOut = async () => {
    await sendMessage('LOGOUT', undefined)
    onSignOut()
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Welcome Back</CardTitle>
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Button disabled className="w-full">
            Tailor Resume
          </Button>
          <p className="text-[10px] text-center mt-2 text-gray-400">
            Open a job description on LinkedIn to begin.
          </p>
        </CardContent>
      </Card>
      <button 
        onClick={handleSignOut}
        className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
      >
        Sign Out
      </button>
    </div>
  )
}
