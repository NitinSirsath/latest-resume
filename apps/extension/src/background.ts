import { supabase } from './lib/supabase'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'LOGIN') {
    handleOAuthLogin().then(sendResponse)
    return true
  }
  if (message.type === 'GET_SESSION') {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sendResponse(session)
    })
    return true
  }
  if (message.type === 'LOGOUT') {
    supabase.auth.signOut().then(() => sendResponse({ ok: true }))
    return true
  }
})

async function handleOAuthLogin() {
  const redirectUrl = chrome.identity.getRedirectURL('supabase-auth')
  const provider = 'google' // Or whichever default
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error) return { error: error.message }

  const authUrl = data.url

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
          else resolve({ session: data.session })
        } else {
          resolve({ error: 'Auth tokens not found in redirect URL' })
        }
      }
    )
  })
}

// Ensure token refresh (heartbeat/alarm)
// Supabase client handles refresh if initialized. 
// Adding an alarm to wake up the service worker and check session.
chrome.alarms.create('check-session', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check-session') {
    supabase.auth.getSession()
  }
})
