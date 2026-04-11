import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging, PortalType } from '@resumetailor/types'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

function detectPortal(): PortalType {
  const host = window.location.hostname
  if (host.includes('linkedin.com')) return 'linkedin'
  if (host.includes('naukri.com')) return 'naukri'
  if (host.includes('indeed.com')) return 'indeed'
  if (host.includes('wellfound.com')) return 'wellfound'
  return 'unknown'
}

const portal = detectPortal()
console.log(`[ResumeTailor] Portal detected: ${portal}`)

sendMessage('PORTAL_DETECTED', { portal })
