import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'
import { supabase } from '../lib/supabase'
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
})

onMessage('REFRESH_TOKEN', async () => {
  await supabase.auth.getSession()
})

onMessage('PORTAL_DETECTED', ({ data: { portal } }) => {
  console.log(`Portal detected: ${portal}`)
})

onMessage('JD_SCRAPED', (payload) => {
  console.log('Background received JD:', payload)
})

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
