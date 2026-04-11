import { Session } from '@supabase/supabase-js'

export type PortalType = 'linkedin' | 'naukri' | 'indeed' | 'wellfound' | 'unknown'

export interface ExtensionMessaging {
  GET_SESSION: () => Session | null
  LOGIN: () => { session?: Session; error?: string }
  LOGOUT: () => void
  REFRESH_TOKEN: () => void
  PORTAL_DETECTED: (payload: { portal: PortalType }) => void
}
