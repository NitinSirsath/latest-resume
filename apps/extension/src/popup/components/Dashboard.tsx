import { 
  Button, 
  Badge,
  Progress,
  Separator,
  ThemeToggle
} from '@resumetailor/ui'
import { Session } from '@supabase/supabase-js'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { StorageContext } from '../../lib/chrome-storage'
import { useTailorMutation } from '../hooks/useTailorMutation'
import { useExportMutation } from '../hooks/useExportMutation'
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Download, Search, Zap } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

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

  const { data: creditsData } = useQuery({
    queryKey: ['usage_credits', session.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_credits')
        .select('credits_remaining, plan')
        .eq('user_id', session.user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || { credits_remaining: 0, plan: 'free' }
    }
  })

  const credits = creditsData?.credits_remaining ?? 0

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
    } catch (err: unknown) {
      setDetectError(err instanceof Error ? err.message : 'Error communicating with the page.')
    } finally {
      setManualDetecting(false)
    }
  }

  // Determine State
  const status = context?.status || 'IDLE'
  const isIdle = status === 'IDLE' && !!context?.activeJD
  const isAnalyzing = status === 'LOADING'
  const isReady = status === 'READY' && !!context?.gapReport
  const isError = status === 'VALIDATION_ERROR' || status === 'PIPELINE_ERROR' || status === 'SAFETY_BLOCKED'
  const isTailoring = tailorMutation.isPending
  const isDone = status === 'COMPLETE' || !!context?.tailorResult
  
  const requiresReview = isDone && context?.tailorResult?.tailored_resume && !(context.tailorResult.tailored_resume as { output_url?: string }).output_url;

  const formatError = (error: string | null) => {
    if (!error) return null
    if (error.includes('429') || error.toLowerCase().includes('quota')) {
      return 'Rate Limit Exceeded: You have hit the AI limit. Please wait a minute and try again.'
    }
    return error
  }

  return (
    <div className="p-3 space-y-4 transition-colors duration-300">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-white shrink-0 shadow-sm">
             <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight">ResumeTailor</h1>
            <p className="text-[8px] text-muted truncate w-24 font-medium uppercase tracking-tighter">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {creditsData && (
            <Badge variant={credits > 0 ? "secondary" : "destructive"} className="text-[9px] px-1.5 py-0">
              <Zap className="w-2.5 h-2.5 mr-0.5" />
              {credits} {credits === 1 ? 'cr' : 'cr'}
            </Badge>
          )}
          <ThemeToggle />
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Main Action Card */}
      <div className="glass-card rounded overflow-hidden shadow-sm">
        <div className="px-3 py-1.5 border-b border-border bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-[9px] font-bold text-muted uppercase tracking-widest">
            Opportunity
          </h3>
        </div>
        <div className="p-3 space-y-3">
          {context?.activeJD ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-xs font-bold leading-tight">{context.activeJD.jobTitle}</h2>
                <p className="text-[10px] text-muted mt-0.5 font-bold uppercase tracking-tighter">{context.activeJD.company}</p>
              </div>

              {isIdle && (
                <div className="pt-1 flex gap-2">
                   <Button 
                    onClick={() => sendMessage('START_ANALYSIS', undefined)} 
                    size="sm"
                    className="flex-1 shadow-sm text-[10px] h-7"
                  >
                    <Search className="w-3 h-3 mr-1.5" />
                    Analyze
                  </Button>
                  <Button 
                    onClick={async () => {
                      // Fetch default resume
                      const { data: resume } = await supabase
                        .from('resumes')
                        .select('parsed_json')
                        .eq('user_id', session.user.id)
                        .eq('is_default', true)
                        .single();
                      
                      if (resume?.parsed_json) {
                        const json = resume.parsed_json as any;
                        const data = {
                          firstName: json.summary?.name?.split(' ')[0] || '',
                          lastName: json.summary?.name?.split(' ').slice(1).join(' ') || '',
                          email: json.summary?.email || '',
                          phone: json.summary?.phone || '',
                          linkedin: json.skills?.flat_list?.find((s: string) => s.includes('linkedin.com')) || '',
                        };
                        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        if (tab?.id) {
                          sendMessage('START_AUTOFILL', data, tab.id);
                        }
                      } else {
                        alert('No default resume found. Please set one in the dashboard.');
                      }
                    }} 
                    size="sm"
                    variant="outline"
                    className="flex-1 shadow-sm text-[10px] h-7 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10"
                  >
                    <Zap className="w-3 h-3 mr-1.5" />
                    Autofill
                  </Button>
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="animate-pulse">{context?.reasoning || 'Thinking...'}</span>
                  </div>
                  <Progress 
                    value={
                      context?.reasoning?.includes('Extracting') ? 25 :
                      context?.reasoning?.includes('Analyzing') ? 50 :
                      context?.reasoning?.includes('Identifying') ? 75 :
                      context?.reasoning?.includes('Rewriting') ? 90 : 10
                    } 
                    className="h-1 bg-slate-100 dark:bg-white/5" 
                  />
                </div>
              )}

              {isError && (
                <div className="bg-red-500/5 border border-red-500/20 p-2.5 rounded space-y-2 max-h-32 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[10px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {context?.failedAt ? `Error at ${context.failedAt}` : 'Pipeline Error'}
                  </div>
                  <p className="text-[9px] text-red-500 leading-relaxed font-bold uppercase tracking-tighter">
                    {formatError(context?.error || 'An unexpected error occurred.')}
                  </p>
                  <Button 
                    onClick={() => sendMessage('START_ANALYSIS', undefined)} 
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] h-7 border-red-500/20 text-red-600 hover:bg-red-500/10"
                  >
                    Retry Analysis
                  </Button>
                </div>
              )}

              {isReady && !isTailoring && !isDone && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50/50 dark:bg-white/5 p-2 rounded border border-border">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Match Score</span>
                    <Badge variant="success" className="scale-90 origin-right">
                      {context.gapReport?.ats_score_estimate ?? '??'}%
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => {
                      if (credits <= 0) {
                        const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5173'
                        window.open(`${dashboardUrl}/billing`, '_blank')
                      } else {
                        tailorMutation.mutate()
                      }
                    }} 
                    size="sm"
                    className={`w-full h-7 text-[10px] ${credits <= 0 ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    {credits <= 0 ? (
                      <>No credits left. Tap to upgrade →</>
                    ) : (
                      <><Sparkles className="w-3 h-3 mr-1.5" /> Optimize Resume</>
                    )}
                  </Button>
                  {credits === 1 && (
                    <p className="text-[9px] text-amber-600 font-bold uppercase mt-2">⚠️ 1 credit remaining</p>
                  )}
                  
                  {tailorMutation.isError && (
                    <div className="p-2 bg-red-500/5 border border-red-500/10 text-red-500 text-[9px] rounded flex gap-2 items-start font-bold uppercase">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{formatError(tailorMutation.error?.message || 'Failed')}</p>
                    </div>
                  )}
                </div>
              )}

              {isTailoring && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Optimizing experience...
                  </div>
                  <Progress value={95} className="h-1 bg-slate-100 dark:bg-white/5" />
                </div>
              )}

              {isDone && requiresReview && (
                <div className="space-y-3 bg-indigo-500/5 p-3 rounded border border-indigo-500/20">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Review Required
                  </div>
                  <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-tighter leading-tight">
                    Optimized for {context.analysis?.role_title}. Please review the AI edits.
                  </p>
                  <Button 
                    onClick={() => {
                      // Note: VITE_WEB_URL should be defined in extension env, 
                      // but we'll use localhost directly for now since it's a dev task, 
                      // or better yet try to get it from env.
                      const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5173';
                      window.open(`${dashboardUrl}/review/${context!.tailoredResumeId}`, '_blank')
                    }}
                    size="sm"
                    className="w-full h-7 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Review & Finalize
                  </Button>
                </div>
              )}

              {isDone && !requiresReview && (
                <div className="space-y-3 bg-emerald-500/5 p-3 rounded border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready to Download
                  </div>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tighter leading-tight">
                    Optimized for {context.analysis?.role_title}.
                  </p>
                  <Button 
                    onClick={() => {
                      exportMutation.mutate({ 
                        tailored_id: context!.tailoredResumeId!
                      })
                    }}
                    disabled={exportMutation.isPending}
                    size="sm"
                    className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                  >
                    {exportMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
                    Download DOCX
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-border">
                <Search className="w-5 h-5 text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-[10px] text-muted px-4 font-bold uppercase tracking-widest leading-relaxed">
                No job detected.
              </p>
              
              <Button 
                variant="secondary" 
                size="sm"
                className="w-full h-7 text-[10px]" 
                onClick={handleManualDetect}
                disabled={manualDetecting}
              >
                {manualDetecting ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Scanning...</>
                ) : (
                  <><Search className="w-3 h-3 mr-1.5" /> Scan Page</>
                )}
              </Button>
              
              {detectError && (
                <p className="text-[9px] text-red-500 mt-1 font-bold uppercase tracking-tighter">
                  {detectError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-1">
        <button 
          onClick={handleSignOut}
          className="text-[8px] text-muted hover:text-primary w-full text-center transition-all font-bold uppercase tracking-widest"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
