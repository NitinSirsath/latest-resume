export interface User {
  id: string
  email: string
}

export interface Resume {
  id: string
  userId: string
  content: string
  parsed_json?: Record<string, unknown>
  created_at: string
}

export interface JDAnalysis {
  id: string
  role_title: string
  seniority_level: string
  required_skills: string[]
  nice_to_have_skills?: string[]
  ats_keywords: string[]
  years_experience_required?: number
  tech_stack: string[]
}

export interface GapReport {
  ats_score_estimate: number
  matching_skills: string[]
  missing_skills: string[]
  keyword_gaps?: string[]
  summary: string
}

export interface TailoredResume {
  id: string
  user_id: string
  job_title: string
  company: string
  jd_raw: string
  jd_analysis: JDAnalysis
  ats_score: number
  diff_json: Record<string, unknown>
  created_at: string
}

export * from './extension'
