import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Progress,
  Separator
} from '@resumetailor/ui'
import { Session } from '@supabase/supabase-js'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { StorageContext } from '../lib/chrome-storage'
import { useTailorMutation } from '../hooks/useTailorMutation'
import { useExportMutation } from '../hooks/useExportMutation'
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Download } from 'lucide-react'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

interface DashboardProps {
  session: Session
  context: StorageContext | null
  onSignOut: () => void
}

export function Dashboard({ session, context, onSignOut }: DashboardProps) {
  const tailorMutation = useTailorMutation()
  const exportMutation = useExportMutation()

  const handleSignOut = async () => {
    await sendMessage('LOGOUT', undefined)
    onSignOut()
  }

  // Determine State
  const isAnalyzing = !context?.analysis && !!context?.activeJD
  const isReady = !!context?.analysis
  const isTailoring = tailorMutation.isPending
  const isDone = tailorMutation.isSuccess

  return (
    <div className="p-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900">ResumeTailor</h1>
          <p className="text-[10px] text-slate-500 truncate w-32">{session.user.email}</p>
        </div>
        <Badge variant={session ? "success" : "secondary"} className="text-[10px]">
          {session ? "Online" : "Offline"}
        </Badge>
      </div>

      <Separator />

      {/* Main Action Card */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Detected Opportunity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {context?.activeJD ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{context.activeJD.jobTitle}</h2>
                <p className="text-xs text-slate-500">{context.activeJD.company}</p>
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing JD requirements...
                </div>
              )}

              {isReady && !isTailoring && !isDone && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Match Score</span>
                    <Badge variant={context.gapReport ? "success" : "outline"}>
                      {context.gapReport?.ats_score_estimate ?? '??'}%
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => tailorMutation.mutate()} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Sparkles className="w-3 h-3 mr-2" />
                    Tailor Resume Now
                  </Button>
                </div>
              )}

              {isTailoring && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Rewriting with Gemini Pro...</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-1" />
                </div>
              )}

              {isDone && (
                <div className="space-y-3 bg-emerald-50 p-3 rounded-md border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Resume Tailored Successfully!
                  </div>
                  <p className="text-[10px] text-emerald-600">
                    High match confirmed. Optimized for {context.analysis?.role_title}.
                  </p>
                  <Button 
                    onClick={() => exportMutation.mutate({ 
                      tailored_id: context.analysis!.id, 
                      tailored_json: tailorMutation.data?.tailored_resume 
                    })}
                    disabled={exportMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    {exportMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Download Optimized PDF
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 px-4">
                No job description detected. Open a job on LinkedIn to start.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-2">
        <button 
          onClick={handleSignOut}
          className="text-[10px] text-slate-400 hover:text-slate-600 w-full text-center transition-colors"
        >
          Sign Out of ResumeTailor
        </button>
      </div>
    </div>
  )
}
