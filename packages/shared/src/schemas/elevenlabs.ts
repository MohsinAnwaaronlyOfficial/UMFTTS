import { z } from 'zod';

export const ElevenLabsVoiceSchema = z.object({
  voice_id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  description: z.string().nullable().optional(),
  labels: z.record(z.string()).optional(),
  preview_url: z.string().nullable().optional(),
  available_for_tiers: z.array(z.string()).optional(),
  settings: z
    .object({
      stability: z.number().optional(),
      similarity_boost: z.number().optional(),
      style: z.number().optional(),
      use_speaker_boost: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});
export type ElevenLabsVoice = z.infer<typeof ElevenLabsVoiceSchema>;

export const ElevenLabsVoicesResponseSchema = z.object({
  voices: z.array(ElevenLabsVoiceSchema),
});
export type ElevenLabsVoicesResponse = z.infer<typeof ElevenLabsVoicesResponseSchema>;

export const ElevenLabsModelSchema = z.object({
  model_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  can_be_finetuned: z.boolean().optional(),
  can_do_text_to_speech: z.boolean().optional(),
  can_do_voice_conversion: z.boolean().optional(),
  can_use_style: z.boolean().optional(),
  can_use_speaker_boost: z.boolean().optional(),
  serves_pro_voices: z.boolean().optional(),
  token_cost_factor: z.number().optional(),
  languages: z
    .array(
      z.object({
        language_id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
});
export type ElevenLabsModel = z.infer<typeof ElevenLabsModelSchema>;

export const ElevenLabsModelsResponseSchema = z.array(ElevenLabsModelSchema);
export type ElevenLabsModelsResponse = z.infer<typeof ElevenLabsModelsResponseSchema>;

export const TTSRequestSchema = z.object({
  voiceId: z.string().min(1),
  modelId: z.string().min(1).default('eleven_multilingual_v2'),
  text: z.string().min(1).max(5000),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  useSpeakerBoost: z.boolean().default(true),
  outputPath: z.string().optional(),
});
export type TTSRequest = z.infer<typeof TTSRequestSchema>;

export const VoiceCloneRequestSchema = z.object({
  name: z.string().min(1).max(100),
  filePaths: z.array(z.string()).min(1).max(25),
  description: z.string().max(500).optional(),
  labels: z.record(z.string()).optional(),
});
export type VoiceCloneRequest = z.infer<typeof VoiceCloneRequestSchema>;

export const VoiceCloneResponseSchema = z.object({
  voice_id: z.string(),
});
export type VoiceCloneResponse = z.infer<typeof VoiceCloneResponseSchema>;

export const ElevenLabsErrorSchema = z.object({
  detail: z
    .object({
      status: z.string().optional(),
      message: z.string().optional(),
    })
    .or(z.string())
    .optional(),
});
export type ElevenLabsError = z.infer<typeof ElevenLabsErrorSchema>;

export const StreamingOptionsSchema = z.object({
  voiceId: z.string().min(1),
  modelId: z.string().min(1).default('eleven_multilingual_v2'),
  text: z.string().min(1),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  useSpeakerBoost: z.boolean().default(true),
  optimizeStreamingLatency: z.number().min(0).max(4).default(0),
});
export type StreamingOptions = z.infer<typeof StreamingOptionsSchema>;

export const WebSocketMessageSchema = z.object({
  text: z.string(),
  voice_settings: z
    .object({
      stability: z.number(),
      similarity_boost: z.number(),
      style: z.number().optional(),
      use_speaker_boost: z.boolean().optional(),
    })
    .optional(),
  generation_config: z
    .object({
      chunk_length_schedule: z.array(z.number()).optional(),
    })
    .optional(),
  xi_api_key: z.string().optional(),
  try_trigger_generation: z.boolean().optional(),
  flush: z.boolean().optional(),
});
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

export const WebSocketResponseSchema = z.object({
  audio: z.string().nullable().optional(),
  isFinal: z.boolean().optional(),
  normalizedAlignment: z
    .object({
      char_start_times_ms: z.array(z.number()).optional(),
      chars_durations_ms: z.array(z.number()).optional(),
      chars: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  alignment: z
    .object({
      char_start_times_ms: z.array(z.number()).optional(),
      chars_durations_ms: z.array(z.number()).optional(),
      chars: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
});
export type WebSocketResponse = z.infer<typeof WebSocketResponseSchema>;
