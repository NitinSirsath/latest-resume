import { Session } from '@supabase/supabase-js'

export interface AutofillData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export type PortalType = 'linkedin' | 'naukri' | 'indeed' | 'wellfound' | 'greenhouse' | 'lever' | 'workday' | 'unknown'

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
  START_TAILOR: () => void
  START_AUTOFILL: (data: AutofillData) => { success: boolean; error?: string }
}
