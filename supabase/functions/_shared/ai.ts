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
2. Modify the minimum number of words necessary. Only modify what is needed to align with the JD.
3. Maximum {max_words} words — original is {original_words} words. Do not exceed this limit.
4. Preserve the candidate's original tone and style.
5. Return only the changed text, nothing else.
6. For every change, provide a reason in max 15 words and assign an impact (high, medium, or low).
7. The output must be valid JSON matching the requested schema.
`;

export const TAILORED_RESUME_SCHEMA = {
  type: "object",
  properties: {
    final_ats_score: { type: "integer" },
    tailored_sections: {
      type: "object",
      properties: {
        summary: {
          type: "object",
          properties: {
            revised: { type: "string" },
            original: { type: "string" },
            keywords_added: { type: "array", items: { type: "string" } },
            word_count_delta: { type: "integer" },
            reason: { type: "string" }
          }
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              bullets_changed: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    original: { type: "string" },
                    revised: { type: "string" },
                    reason: { type: "string" }
                  }
                }
              }
            }
          }
        },
        skills_added: { type: "array", items: { type: "string" } },
        skills_removed: { type: "array", items: { type: "string" } }
      }
    },
    change_log: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          change_type: { type: "string", enum: ["modified", "added", "removed"] },
          original: { type: "string" },
          changed_to: { type: "string" },
          reason: { type: "string" },
          impact: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    }
  },
  required: ["final_ats_score", "tailored_sections", "change_log"]
};
