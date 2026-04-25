import { z } from 'zod';

export const jobDescriptionSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  description: z.string().min(10, "Job description is too short"),
  requirements: z.array(z.string()),
  sourceUrl: z.string().url("Invalid source URL"),
});

export type JobDescription = z.infer<typeof jobDescriptionSchema>;
