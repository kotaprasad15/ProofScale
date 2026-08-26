import { z } from "zod";
import { EnvironmentEnum } from "./common.js";

export const CreateTargetSchema = z.object({
  projectId: z.string(),
  baseUrl: z.string().url("Must be a valid HTTP/HTTPS URL"),
  healthUrl: z.string().url("Must be a valid HTTP/HTTPS URL").optional(),
  environment: EnvironmentEnum.default("staging"),
  authorizationAcknowledged: z.boolean().refine(val => val === true, {
    message: "You must acknowledge authorization to test this target URL."
  })
});
export type CreateTargetInput = z.infer<typeof CreateTargetSchema>;

export const UpdateTargetSchema = z.object({
  id: z.string(),
  baseUrl: z.string().url().optional(),
  healthUrl: z.string().url().optional(),
  environment: EnvironmentEnum.optional()
});
export type UpdateTargetInput = z.infer<typeof UpdateTargetSchema>;
