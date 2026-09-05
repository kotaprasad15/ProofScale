import { z } from "zod";
import { InputSanitizer } from "../security/inputSanitizer.js";

export const CreateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(60)
    .transform(val => InputSanitizer.sanitizeString(val)),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  displayName: z.string().min(1).max(60).transform(val => InputSanitizer.sanitizeString(val)).optional(),
  initialProjectName: z.string().min(2).max(60).transform(val => InputSanitizer.sanitizeString(val)).optional()
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(2)
    .max(60)
    .transform(val => InputSanitizer.sanitizeString(val))
});

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const AddOrganizationMemberSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member", "tester"]).default("member")
});
export type AddOrganizationMemberInput = z.infer<typeof AddOrganizationMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "admin", "member", "tester"])
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
