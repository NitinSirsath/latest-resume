import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging, JDPayload } from '@resumetailor/types'
import { jobDescriptionSchema } from '@resumetailor/ai-pipeline'
import { supabase } from '../lib/supabase'
import { chromeStorage } from '../lib/chrome-storage'
import { Session } from '@supabase/supabase-js'

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
  
  // 1. Check Auth
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.log('[ResumeTailor] No session, skipping analysis')
    await chromeStorage.setContext({ activeJD: payload, status: 'IDLE' })
    return
  }

  // 2. Validate JD (Task 3)
  const validation = jobDescriptionSchema.safeParse(payload)
  if (!validation.success) {
    console.error('[ResumeTailor] JD Validation failed:', validation.error.format())
    await chromeStorage.setContext({ 
      activeJD: payload, 
      status: 'VALIDATION_ERROR', 
      error: validation.error.errors[0].message 
    })
    return
  }

  // 3. Trigger Pipeline (Task 4)
  runPipeline(payload, session.user.id)
})

async function runPipeline(payload: JDPayload, userId: string) {
  try {
    await chromeStorage.setContext({ activeJD: payload, status: 'LOADING' })

    // Step 1: Analyze JD
    console.log('[ResumeTailor] Triggering JD Analysis...')
    const analysisData = await withRetry(() => 
      supabase.functions.invoke('analyze-jd', {
        body: { jd_text: payload.description, user_id: userId }
      })
    , 'analyze-jd')

    const { analysis, id: tailoredResumeId } = analysisData
    await chromeStorage.updateContext({ analysis })

    // Step 2: Fetch Base Resume
    console.log('[ResumeTailor] Fetching latest base resume...')
    const { data: resumes, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (resumeError) throw resumeError
    
    if (resumes && resumes.length > 0) {
      const baseResume = resumes[0]
      if (!baseResume.parsed_json) {
        throw new Error('Your base resume has not been processed yet. Please wait a moment or re-upload it.')
      }
      
      // Step 3: Analyze Gap
      console.log('[ResumeTailor] Triggering Gap Analysis...')
      const gapReport = await withRetry(() => 
        supabase.functions.invoke('analyze-gap', {
          body: { 
            resume_json: baseResume.parsed_json, 
            jd_analysis: analysis, 
            tailored_resume_id: tailoredResumeId 
          }
        })
      , 'analyze-gap')

      await chromeStorage.updateContext({ gapReport, status: 'COMPLETE' })
    } else {
      console.log('[ResumeTailor] No base resume found in vault.')
      throw new Error('No resume found in your vault. Please upload a resume to the dashboard first!')
    }

  } catch (error: any) {
    console.error('[ResumeTailor] Pipeline error:', error)
    await chromeStorage.updateContext({ 
      status: 'PIPELINE_ERROR', 
      error: error.message || 'Unknown error',
      failedAt: error.step || 'unknown'
    })
  }
}

async function withRetry(fn: () => Promise<any>, stepName: string, retries = 3): Promise<any> {
  let lastError: any
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error } = await fn()
      if (error) throw error
      return data
    } catch (err: any) {
      lastError = err
      const isRateLimit = err.message?.includes('429') || err.status === 429 || (err.context?.status === 429)
      
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
