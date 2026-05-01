import { Session } from '@supabase/supabase-js'

export type PortalType = 'linkedin' | 'naukri' | 'indeed' | 'wellfound' | 'unknown'

export interface JDPayload {
  jobTitle: string
  company: string
  description: string
  requirements: string[]
  sourceUrl: string
}

export interface ExtensionMessaging {
  GET_SESSION: () => Session | null
  LOGIN: () => { session?: Session; error?: string }
  LOGOUT: () => void
  REFRESH_TOKEN: () => void
  PORTAL_DETECTED: (payload: { portal: PortalType }) => void
  JD_SCRAPED: (payload: JDPayload) => void
  MANUAL_DETECT: () => { success: boolean; error?: string }
  START_ANALYSIS: () => void
}
