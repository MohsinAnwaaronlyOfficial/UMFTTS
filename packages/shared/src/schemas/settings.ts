import { z } from 'zod';

export const OutputFormatSchema = z.enum(['mp3', 'wav', 'ogg']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  useSpeakerBoost: z.boolean().default(true),
});
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;

export const AppSettingsSchema = z.object({
  id: z.literal(1).default(1),
  apiKey: z.string().optional(),
  defaultOutputFormat: OutputFormatSchema.default('mp3'),
  defaultModelId: z.string().default('eleven_multilingual_v2'),
  defaultVoiceId: z.string().optional(),
  defaultDelayMs: z.number().min(0).max(5000).default(500),
  defaultConcurrency: z.number().min(1).max(10).default(3),
  defaultVoiceSettings: VoiceSettingsSchema.default({
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
  }),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const AppSettingsUpdateSchema = AppSettingsSchema.partial().omit({ id: true, createdAt: true });
export type AppSettingsUpdate = z.infer<typeof AppSettingsUpdateSchema>;
