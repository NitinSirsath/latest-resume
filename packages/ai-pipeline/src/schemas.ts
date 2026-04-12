/**
 * Gemini Response Schemas for Structured JSON Output
 * These are used with responseMimeType: "application/json" and responseSchema
 */

export const JD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    role_title: { type: "string", description: "The official job title" },
    seniority_level: { type: "string", enum: ["Intern", "Junior", "Mid", "Senior", "Lead", "Staff", "Management"] },
    required_skills: { type: "array", items: { type: "string" }, description: "Core skills explicitly required" },
    nice_to_have_skills: { type: "array", items: { type: "string" }, description: "Preferred or optional skills" },
    ats_keywords: { type: "array", items: { type: "string" }, description: "Specific industry keywords for ATS optimization" },
    years_experience_required: { type: "number", description: "Minimum years of experience requested" },
    tech_stack: { type: "array", items: { type: "string" }, description: "Specific technologies, frameworks, or languages" },
    company_culture: { type: "string", description: "Key values or cultural pointers from the JD" }
  },
  required: ["role_title", "seniority_level", "required_skills", "ats_keywords"]
};

export const GAP_REPORT_SCHEMA = {
  type: "object",
  properties: {
    ats_score_estimate: { type: "integer", minimum: 0, maximum: 100 },
    matching_skills: { type: "array", items: { type: "string" } },
    missing_skills: { type: "array", items: { type: "string" } },
    keyword_gaps: { type: "array", items: { type: "string" } },
    recommended_focus_areas: { type: "array", items: { type: "string" } },
    summary: { type: "string", description: "A brief overview of how well the resume fits the JD" }
  },
  required: ["ats_score_estimate", "missing_skills", "summary"]
};

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
