import { z } from "zod";
import { EnvironmentEnum } from "./common.js";

export const CreateProjectSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(2, "Project name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  environment: EnvironmentEnum.default("staging")
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  environment: EnvironmentEnum.optional()
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
