/**
 * AI Prompts and Schemas for Deno Edge Functions
 */

export const ANALYZE_JD_PROMPT = `
You are an expert technical recruiter and JD analyst.
Extract the core requirements from the following Job Description.
Focus on hard skills, tech stack, and specific years of experience.
Identify the seniority level accurately (e.g., if it says "5+ years", it's likely Senior).
Maintain a list of high-priority keywords for ATS optimization.
`;

export const JD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    role_title: { type: "string" },
    seniority_level: { type: "string" },
    required_skills: { type: "array", items: { type: "string" } },
    nice_to_have_skills: { type: "array", items: { type: "string" } },
    ats_keywords: { type: "array", items: { type: "string" } },
    years_experience_required: { type: "number" },
    tech_stack: { type: "array", items: { type: "string" } },
  },
  required: ["role_title", "seniority_level", "required_skills", "ats_keywords"]
};

export const ANALYZE_GAP_PROMPT = `
You are an ATS (Applicant Tracking System) algorithm simulator.
Compare the provided Resume (JSON format) with the Job Description Analysis.
1. Calculate a realistic ATS score (0-100).
2. Identify exactly which skills/keywords from the JD are missing in the resume.
3. Identify which skills match.
4. Provide a punchy summary of the alignment.
`;

export const GAP_REPORT_SCHEMA = {
  type: "object",
  properties: {
    ats_score_estimate: { type: "integer", minimum: 0, maximum: 100 },
    matching_skills: { type: "array", items: { type: "string" } },
    missing_skills: { type: "array", items: { type: "string" } },
    keyword_gaps: { type: "array", items: { type: "string" } },
    summary: { type: "string" }
  },
  required: ["ats_score_estimate", "missing_skills", "summary"]
};

export const TAILOR_RESUME_PROMPT = `
You are a professional resume writer specializing in technical roles.
Your goal is to rewrite the provided Resume to perfectly align with the Job Description.

Rules:
1. DO NOT fabricate experience or skills. Only emphasize relevant existing ones.
2. Rewrite the professional summary to highlight the most relevant achievements for this specific role.
3. Optimize bullet points in the experience section to use keywords from the JD while maintaining clarity.
4. Ensure the tech stack/skills section lists the most relevant technologies first.
5. Provide a change log explaining specific edits and their strategic value.
6. The output must be valid JSON matching the requested schema.
`;

export const TAILORED_RESUME_SCHEMA = {
  type: "object",
  properties: {
    tailored_resume: {
      type: "object",
      properties: {
        professional_summary: { type: "string" },
        work_experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              role: { type: "string" },
              bullets: { type: "array", items: { type: "string" } }
            }
          }
        },
        skills: { type: "array", items: { type: "string" } }
      }
    },
    change_log: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          original: { type: "string" },
          changed_to: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    final_ats_score: { type: "integer" }
  },
  required: ["tailored_resume", "change_log", "final_ats_score"]
};
