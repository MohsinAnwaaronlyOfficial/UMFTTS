import { z } from 'zod';
import { VoiceSettingsSchema } from './settings.js';

export const VoicePresetSchema = z.object({
  id: z.number().int().positive().optional(),
  presetId: z.number().int().min(1).max(10),
  name: z.string().min(1).max(100),
  voiceId: z.string().min(1),
  modelId: z.string().min(1).default('eleven_multilingual_v2'),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  useSpeakerBoost: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type VoicePreset = z.infer<typeof VoicePresetSchema>;

export const VoicePresetCreateSchema = VoicePresetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type VoicePresetCreate = z.infer<typeof VoicePresetCreateSchema>;

export const VoicePresetUpdateSchema = VoicePresetCreateSchema.partial().extend({
  id: z.number().int().positive(),
});
export type VoicePresetUpdate = z.infer<typeof VoicePresetUpdateSchema>;
