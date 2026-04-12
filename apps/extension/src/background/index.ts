import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
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
    await chromeStorage.setContext({ activeJD: payload })
    return
  }

  try {
    // 2. Initial state in storage
    await chromeStorage.setContext({ activeJD: payload })

    // 3. Step 1: Analyze JD
    console.log('[ResumeTailor] Triggering JD Analysis...');
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-jd', {
      body: { jd_text: payload.description, user_id: session.user.id }
    });

    if (analysisError) throw analysisError;
    const { analysis, id: tailoredResumeId } = analysisData;
    
    await chromeStorage.updateContext({ analysis });

    // 4. Step 2: Fetch Base Resume
    console.log('[ResumeTailor] Fetching latest base resume...');
    const { data: resumes, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (resumeError) throw resumeError;
    
    if (resumes && resumes.length > 0) {
      const baseResume = resumes[0];
      
      // 5. Step 3: Analyze Gap
      console.log('[ResumeTailor] Triggering Gap Analysis...');
      const { data: gapReport, error: gapError } = await supabase.functions.invoke('analyze-gap', {
        body: { 
          resume_json: baseResume.parsed_json, 
          jd_analysis: analysis, 
          tailored_resume_id: tailoredResumeId 
        }
      });

      if (gapError) throw gapError;
      await chromeStorage.updateContext({ gapReport });
    } else {
      console.log('[ResumeTailor] No base resume found in vault.');
    }

  } catch (error) {
    console.error('[ResumeTailor] Pipeline error:', error);
  }
})

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
