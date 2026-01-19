import { z } from 'zod';
import { ParsedLineSchema } from './parser.js';

export const ProjectStatusSchema = z.enum(['draft', 'processing', 'completed', 'failed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  rawText: z.string(),
  inputType: z.enum(['text', 'srt']),
  status: ProjectStatusSchema.default('draft'),
  totalLines: z.number().int().nonnegative().default(0),
  completedLines: z.number().int().nonnegative().default(0),
  failedLines: z.number().int().nonnegative().default(0),
  mergedFilePath: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  rawText: z.string(),
  inputType: z.enum(['text', 'srt']).default('text'),
});
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = ProjectCreateSchema.partial().extend({
  id: z.string().uuid(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export const ProjectLineSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  lineNo: z.number().int().positive(),
  text: z.string().min(1),
  presetId: z.number().int().min(1).max(10).nullable(),
  status: z.enum(['pending', 'processing', 'done', 'failed']).default('pending'),
  error: z.string().nullable().optional(),
  clipPath: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ProjectLine = z.infer<typeof ProjectLineSchema>;

export const ProjectLineCreateSchema = ProjectLineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ProjectLineCreate = z.infer<typeof ProjectLineCreateSchema>;

export const ProjectWithLinesSchema = ProjectSchema.extend({
  lines: z.array(ProjectLineSchema),
});
export type ProjectWithLines = z.infer<typeof ProjectWithLinesSchema>;
