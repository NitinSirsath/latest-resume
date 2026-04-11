export interface User {
  id: string
  email: string
}

export interface Resume {
  id: string
  userId: string
  content: string
}

export interface JDAnalysis {
  id: string
  jobDescription: string
  analysis: Record<string, any>
}

export interface TailoredResume {
  id: string
  originalResumeId: string
  analysisId: string
  tailoredContent: string
}

export interface GapReport {
  id: string
  analysisId: string
  gaps: string[]
}
