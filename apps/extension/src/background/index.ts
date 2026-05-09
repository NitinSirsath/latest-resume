import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging, JDPayload } from '@resumetailor/types'
import { jobDescriptionSchema } from '@resumetailor/ai-pipeline'
import { supabase } from '../lib/supabase'
import { chromeStorage } from '../lib/chrome-storage'
import { Session } from '@supabase/supabase-js'
import * as Sentry from "@sentry/browser"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
})

const { onMessage } = defineExtensionMessaging<ExtensionMessaging>()

onMessage('GET_SESSION', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
})

onMessage('LOGIN', async () => {
  return handleOAuthLogin()
})

onMessage('LOGOUT', async () => {
  await supabase.auth.signOut()
  await chromeStorage.clearContext()
})

onMessage('REFRESH_TOKEN', async () => {
  await supabase.auth.getSession()
})

onMessage('PORTAL_DETECTED', ({ data: { portal } }) => {
  console.log(`Portal detected: ${portal}`)
})

// Orchestrate the AI Pipeline in the background
onMessage('JD_SCRAPED', async ({ data: payload }) => {
  console.log('[ResumeTailor] Background received JD:', payload)
  
  // Just store the JD and set status to IDLE
  await chromeStorage.setContext({ 
    activeJD: payload, 
    status: 'IDLE' 
  })
})

onMessage('START_ANALYSIS', async () => {
  console.log('[ResumeTailor] Manual analysis triggered')
  
  // 1. Get current context
  const context = await chromeStorage.getContext()
  if (!context?.activeJD) {
    console.error('[ResumeTailor] No active JD found in storage')
    return
  }

  // 2. Check Auth
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.log('[ResumeTailor] No session, cannot run pipeline')
    await chromeStorage.updateContext({ 
      status: 'PIPELINE_ERROR', 
      error: 'Please sign in to analyze this job.' 
    })
    return
  }

  // 3. Validate JD
  const validation = jobDescriptionSchema.safeParse(context.activeJD)
  if (!validation.success) {
    console.error('[ResumeTailor] JD Validation failed:', validation.error.format())
    await chromeStorage.updateContext({ 
      status: 'VALIDATION_ERROR', 
      error: validation.error.errors[0].message 
    })
    return
  }

  // 4. Trigger Pipeline
  Sentry.setUser({ id: session.user.id, email: session.user.email })
  try {
    Sentry.setTag('portal', new URL(context.activeJD.sourceUrl).hostname)
  } catch { /* ignore invalid URLs */ }
  runPipeline(context.activeJD, session.user.id)
})

// Orchestrate the tailoring step from the background
onMessage('START_TAILOR', async () => {
  console.log('[ResumeTailor] Manual tailoring triggered from popup')

  const context = await chromeStorage.getContext()
  if (!context?.analysis || !context?.activeJD || !context?.tailoredResumeId) {
    console.error('[ResumeTailor] Missing context for tailoring')
    return
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await chromeStorage.updateContext({ status: 'PIPELINE_ERROR', error: 'Please sign in.' })
    return
  }

  try {
    await chromeStorage.updateContext({ status: 'LOADING', reasoning: 'Optimizing your resume...' })

    // Fetch latest base resume (prefer default)
    const { data: resumes, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (resumeError) throw resumeError
    if (!resumes || resumes.length === 0) throw new Error('No resume found. Upload and set a default resume in the dashboard.')
    if (!resumes[0].parsed_json) throw new Error('Base resume not parsed yet. Re-upload.')

    // Call tailor-resume edge function
    const tailorData = await withRetry(() =>
      supabase.functions.invoke('tailor-resume', {
        body: {
          base_resume_json: resumes[0].parsed_json,
          base_resume_id: resumes[0].id,
          gap_report: context.gapReport,
          jd_analysis: context.analysis,
          tailored_resume_id: context.tailoredResumeId
        }
      })
    , 'tailor-resume')

    // Track the job application
    try {
      await supabase.from('tracked_jobs').insert({
        user_id: session.user.id,
        company: context.activeJD.company,
        role_title: context.activeJD.jobTitle,
        url: context.activeJD.sourceUrl,
        status: 'Saved',
        tailored_resume_id: context.tailoredResumeId
      })
    } catch (trackerError) {
      console.error('[ResumeTailor] Failed to track job:', trackerError)
    }

    await chromeStorage.updateContext({
      status: 'COMPLETE',
      reasoning: 'Tailoring complete!',
      tailorResult: tailorData
    })

    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icon-128.png',
      title: 'Resume Ready!',
      message: 'Your resume has been optimized. Click the extension to review!',
      priority: 2
    })
  } catch (error: unknown) {
    const err = error as Error & { step?: string }
    console.error('[ResumeTailor] Tailor error:', err)
    Sentry.captureException(err, { extra: { failedAt: 'tailor-resume' } })
    await chromeStorage.updateContext({
      status: 'PIPELINE_ERROR',
      error: err.message || 'Tailoring failed',
      failedAt: 'tailor-resume'
    })
  }
})

// Handle manual page scan request from popup
onMessage('MANUAL_DETECT', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return { success: false, error: 'No active tab found' }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Re-dispatch the content script detection event
        window.dispatchEvent(new CustomEvent('RT_MANUAL_DETECT'))
        return true
      }
    })

    if (!results || results.length === 0) {
      return { success: false, error: 'Cannot access this page. Try a job listing page.' }
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Detection failed'
    return { success: false, error: errorMsg }
  }
})

async function runPipeline(payload: JDPayload, userId: string) {
  try {
    await chromeStorage.setContext({ activeJD: payload, status: 'LOADING' })

    // Step 1: Analyze JD
    console.log('[ResumeTailor] Triggering JD Analysis...')
    await chromeStorage.updateContext({ status: 'LOADING', reasoning: 'Extracting job requirements and keywords...' })
    const cleanedDescription = payload.description.replace(/\s+/g, ' ').trim().substring(0, 5000)
    
    const analysisData = await withRetry(() => 
      supabase.functions.invoke('analyze-jd', {
        body: { jd_text: cleanedDescription, user_id: userId, job_url: payload.sourceUrl }
      })
    , 'analyze-jd')

    const { analysis, id: tailoredResumeId } = analysisData
    await chromeStorage.updateContext({ analysis, tailoredResumeId, reasoning: 'Analyzing your resume for the best match...' })

    // Step 2: Fetch Base Resume (prefer default)
    console.log('[ResumeTailor] Fetching latest base resume...')
    const { data: resumes, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (resumeError) {
      ;(resumeError as any).step = 'Fetching latest base resume'
      throw resumeError
    }
    
    if (!resumes || resumes.length === 0) {
      throw new Error('No resume found. Upload and set a default resume in the dashboard.')
    }

    const baseResume = resumes[0]
    
    if (baseResume.processing_status === 'pending' || baseResume.processing_status === 'processing') {
      const err = new Error('Your base resume is currently being analyzed by AI. Please wait a few seconds and try again!') as Error & { step?: string }
      err.step = 'Fetching latest base resume'
      throw err
    }

    if (baseResume.processing_status === 'failed') {
      const err = new Error(`Resume parsing failed: ${baseResume.processing_error || 'Unknown error'}. Please try re-uploading your resume.`) as Error & { step?: string }
      err.step = 'Fetching latest base resume'
      throw err
    }

    if (!baseResume.parsed_json) {
      const err = new Error('Your base resume has not been processed yet. Please try re-uploading it to the dashboard.') as Error & { step?: string }
      err.step = 'Fetching latest base resume'
      throw err
    }
    
    // Step 3: Analyze Gap
    console.log('[ResumeTailor] Triggering Gap Analysis...')
    await chromeStorage.updateContext({ reasoning: 'Identifying skill gaps and opportunities...' })
    const gapReport = await withRetry(() => 
      supabase.functions.invoke('analyze-gap', {
        body: { 
          resume_json: baseResume.parsed_json, 
          jd_analysis: analysis, 
          tailored_resume_id: tailoredResumeId 
        }
      })
    , 'analyze-gap')

    // Pipeline stops here — user triggers tailoring from the popup
    await chromeStorage.updateContext({ 
      gapReport, 
      status: 'READY',
      reasoning: 'Analysis complete! Click "Optimize Resume Now" to tailor your resume.' 
    })

    console.log('[ResumeTailor] Pipeline complete — ready for tailoring.')

  } catch (error: unknown) {
    console.error('[ResumeTailor] Pipeline error:', error)
    const err = error as Error & { step?: string }
    Sentry.captureException(err, { extra: { failedAt: err.step || 'unknown', userId } })
    await chromeStorage.updateContext({ 
      status: 'PIPELINE_ERROR', 
      error: err.message || 'Unknown error',
      failedAt: err.step || 'unknown'
    })
  }
}

async function withRetry(fn: () => Promise<any>, stepName: string, retries = 3): Promise<any> {
  let lastError: Error & { step?: string } | undefined
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error } = await fn()
      if (error) throw error
      if (data && data.error) throw new Error(data.error)
      return data
    } catch (err: unknown) {
      const errorObj = err as any
      lastError = errorObj
      const isRateLimit = errorObj.message?.includes('429') || errorObj.status === 429 || (errorObj.context?.status === 429)
      
      if (i < retries) {
        const delay = isRateLimit ? 5000 * (i + 1) : 1000 * (i + 1)
        console.warn(`[ResumeTailor] ${stepName} attempt ${i + 1} failed (Rate Limit: ${isRateLimit}). Retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  if (lastError) lastError.step = stepName
  throw lastError
}

// OAuth Logic for Extension
async function handleOAuthLogin(): Promise<{ session?: Session; error?: string }> {
  const redirectUrl = chrome.identity.getRedirectURL('supabase-auth')
  const provider = 'google'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error) return { error: error.message }

  const authUrl = data.url!

  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          resolve({ error: chrome.runtime.lastError?.message || 'Login cancelled' })
          return
        }

        const url = new URL(callbackUrl)
        const hash = url.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) resolve({ error: error.message })
          else resolve({ session: data.session ?? undefined })
        } else {
          resolve({ error: 'Auth tokens not found in redirect URL' })
        }
      }
    )
  })
}

chrome.alarms.create('check-session', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check-session') {
    supabase.auth.getSession()
  }
})
