import { z } from 'zod';

export const LineStatusSchema = z.enum(['pending', 'processing', 'done', 'failed']);
export type LineStatus = z.infer<typeof LineStatusSchema>;

export const ParsedLineSchema = z.object({
  id: z.string().uuid(),
  lineNo: z.number().int().positive(),
  text: z.string().min(1),
  presetId: z.number().int().min(1).max(10).nullable(),
  status: LineStatusSchema.default('pending'),
  error: z.string().nullable().optional(),
  clipPath: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
});
export type ParsedLine = z.infer<typeof ParsedLineSchema>;

export const ParseInputSchema = z.object({
  content: z.string(),
  type: z.enum(['text', 'srt']),
});
export type ParseInput = z.infer<typeof ParseInputSchema>;

export const ParseResultSchema = z.object({
  lines: z.array(ParsedLineSchema),
  totalLines: z.number().int().nonnegative(),
  validLines: z.number().int().nonnegative(),
  skippedLines: z.number().int().nonnegative(),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

export const SrtEntrySchema = z.object({
  index: z.number().int().positive(),
  startTime: z.string(),
  endTime: z.string(),
  text: z.string(),
});
export type SrtEntry = z.infer<typeof SrtEntrySchema>;
