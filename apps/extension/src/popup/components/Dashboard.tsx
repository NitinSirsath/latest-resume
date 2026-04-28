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
import { StorageContext } from '../../lib/chrome-storage'
import { useTailorMutation } from '../hooks/useTailorMutation'
import { useExportMutation } from '../hooks/useExportMutation'
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Download, Search } from 'lucide-react'
import { useState } from 'react'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

interface DashboardProps {
  session: Session
  context: StorageContext | null
  onSignOut: () => void
}

export function Dashboard({ session, context, onSignOut }: DashboardProps) {
  const tailorMutation = useTailorMutation()
  const exportMutation = useExportMutation()
  const [manualDetecting, setManualDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const handleSignOut = async () => {
    await sendMessage('LOGOUT', undefined)
    onSignOut()
  }

  const handleManualDetect = async () => {
    setManualDetecting(true)
    setDetectError(null)
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab found')

      const res = await sendMessage('MANUAL_DETECT', undefined, tab.id)
      if (!res?.success) {
        setDetectError(res?.error || 'Could not detect a job on this page.')
      }
    } catch (err: any) {
      setDetectError(err.message || 'Error communicating with the page.')
    } finally {
      setManualDetecting(false)
    }
  }

  // Determine State
  const status = context?.status || 'IDLE'
  const isAnalyzing = status === 'LOADING'
  const isReady = status === 'READY' && !!context?.gapReport
  const isError = status === 'VALIDATION_ERROR' || status === 'PIPELINE_ERROR' || status === 'SAFETY_BLOCKED'
  const isTailoring = tailorMutation.isPending
  const isDone = status === 'COMPLETE' || !!context?.tailorResult

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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {context?.reasoning || 'AI is thinking...'}
                  </div>
                  <Progress 
                    value={
                      context?.reasoning?.includes('Extracting') ? 25 :
                      context?.reasoning?.includes('Analyzing') ? 50 :
                      context?.reasoning?.includes('Identifying') ? 75 :
                      context?.reasoning?.includes('Rewriting') ? 90 : 10
                    } 
                    className="h-1 bg-indigo-50" 
                  />
                </div>
              )}

              {isError && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    {status === 'VALIDATION_ERROR' ? 'Data Quality Error' : 
                     status === 'SAFETY_BLOCKED' ? 'Safety Block' : 'System Error'}
                  </div>
                  <p className="text-[10px] text-red-600 leading-relaxed">
                    {context?.error || 'An unexpected error occurred. Please try again.'}
                  </p>
                  {status === 'PIPELINE_ERROR' && context?.failedAt && (
                    <p className="text-[8px] text-red-400 uppercase font-bold">
                      Failed at: {context.failedAt}
                    </p>
                  )}
                </div>
              )}

              {isReady && !isTailoring && !isDone && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Match Score</span>
                    <Badge variant={context.gapReport ? "success" : "outline"} className="text-xs">
                      {context.gapReport?.ats_score_estimate ?? '??'}%
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => tailorMutation.mutate()} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-2" />
                    Optimize Resume Now
                  </Button>
                </div>
              )}

              {isTailoring && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fine-tuning your resume experience...
                  </div>
                  <Progress value={95} className="h-1 bg-indigo-50" />
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
                    onClick={() => {
                      const result = context?.tailorResult || tailorMutation.data;
                      const finalJson = result?.tailored_resume || result;
                      
                      exportMutation.mutate({ 
                        tailored_id: context!.tailoredResumeId!, 
                        tailored_json: finalJson 
                      })
                    }}
                    disabled={exportMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {exportMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Download Optimized PDF
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 px-4">
                No job description detected automatically. 
              </p>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs mt-2" 
                onClick={handleManualDetect}
                disabled={manualDetecting}
              >
                {manualDetecting ? (
                  <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Scanning Page...</>
                ) : (
                  <><Search className="w-3 h-3 mr-2" /> Detect Job on Page</>
                )}
              </Button>
              
              {detectError && (
                <p className="text-[10px] text-red-500 mt-2 bg-red-50 p-1 rounded border border-red-100">
                  {detectError}
                </p>
              )}
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
