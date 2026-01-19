import { z } from 'zod';
import { AppSettingsSchema, AppSettingsUpdateSchema } from './settings.js';
import { VoicePresetSchema, VoicePresetCreateSchema, VoicePresetUpdateSchema } from './presets.js';
import { ProjectSchema, ProjectCreateSchema, ProjectUpdateSchema, ProjectLineSchema } from './projects.js';
import { ParseInputSchema } from './parser.js';
import { TTSRequestSchema, VoiceCloneRequestSchema, StreamingOptionsSchema } from './elevenlabs.js';

// IPC Channel Names
export const IPC_CHANNELS = {
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_TEST_API_KEY: 'settings:testApiKey',

  // Voice Presets
  PRESETS_LIST: 'presets:list',
  PRESETS_GET: 'presets:get',
  PRESETS_CREATE: 'presets:create',
  PRESETS_UPDATE: 'presets:update',
  PRESETS_DELETE: 'presets:delete',

  // Projects
  PROJECTS_LIST: 'projects:list',
  PROJECTS_GET: 'projects:get',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_GET_LINES: 'projects:getLines',
  PROJECTS_UPDATE_LINE: 'projects:updateLine',

  // Parser
  PARSER_PARSE: 'parser:parse',

  // ElevenLabs
  ELEVENLABS_LIST_VOICES: 'elevenlabs:listVoices',
  ELEVENLABS_LIST_MODELS: 'elevenlabs:listModels',
  ELEVENLABS_TTS: 'elevenlabs:tts',
  ELEVENLABS_TTS_STREAM_START: 'elevenlabs:ttsStreamStart',
  ELEVENLABS_TTS_STREAM_STOP: 'elevenlabs:ttsStreamStop',
  ELEVENLABS_TTS_STREAM_CHUNK: 'elevenlabs:ttsStreamChunk',
  ELEVENLABS_WEBSOCKET_START: 'elevenlabs:wsStart',
  ELEVENLABS_WEBSOCKET_SEND: 'elevenlabs:wsSend',
  ELEVENLABS_WEBSOCKET_STOP: 'elevenlabs:wsStop',
  ELEVENLABS_WEBSOCKET_CHUNK: 'elevenlabs:wsChunk',
  ELEVENLABS_VOICE_CLONE: 'elevenlabs:voiceClone',
  ELEVENLABS_VOICE_DELETE: 'elevenlabs:voiceDelete',

  // Batch Processing
  BATCH_START: 'batch:start',
  BATCH_CANCEL: 'batch:cancel',
  BATCH_RETRY_FAILED: 'batch:retryFailed',
  BATCH_PROGRESS: 'batch:progress',
  BATCH_LINE_UPDATE: 'batch:lineUpdate',
  BATCH_COMPLETE: 'batch:complete',
  BATCH_ERROR: 'batch:error',

  // Audio
  AUDIO_MERGE: 'audio:merge',
  AUDIO_PLAY: 'audio:play',
  AUDIO_GET_DURATION: 'audio:getDuration',

  // Library
  LIBRARY_LIST_CLIPS: 'library:listClips',
  LIBRARY_LIST_EXPORTS: 'library:listExports',
  LIBRARY_DELETE_CLIP: 'library:deleteClip',
  LIBRARY_DELETE_EXPORT: 'library:deleteExport',
  LIBRARY_OPEN_FOLDER: 'library:openFolder',

  // File Operations
  FILE_SELECT: 'file:select',
  FILE_READ: 'file:read',
  FILE_SAVE_DIALOG: 'file:saveDialog',
  FILE_COPY_TO: 'file:copyTo',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// IPC Request/Response types
export const IpcResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      code: z.string().optional(),
    }),
  ]);

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Batch Processing
export const BatchStartRequestSchema = z.object({
  projectId: z.string().uuid(),
  concurrency: z.number().int().min(1).max(10).default(3),
});
export type BatchStartRequest = z.infer<typeof BatchStartRequestSchema>;

export const BatchProgressSchema = z.object({
  projectId: z.string().uuid(),
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  processing: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});
export type BatchProgress = z.infer<typeof BatchProgressSchema>;

export const BatchLineUpdateSchema = z.object({
  projectId: z.string().uuid(),
  lineId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'done', 'failed']),
  error: z.string().nullable().optional(),
  clipPath: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
});
export type BatchLineUpdate = z.infer<typeof BatchLineUpdateSchema>;

// Audio Merge
export const AudioMergeRequestSchema = z.object({
  projectId: z.string().uuid(),
  delayMs: z.number().min(0).max(5000).default(500),
  outputFormat: z.enum(['mp3', 'wav', 'ogg']).default('mp3'),
});
export type AudioMergeRequest = z.infer<typeof AudioMergeRequestSchema>;

export const AudioMergeResultSchema = z.object({
  outputPath: z.string(),
  duration: z.number(),
  fileSize: z.number(),
});
export type AudioMergeResult = z.infer<typeof AudioMergeResultSchema>;

// File Selection
export const FileSelectOptionsSchema = z.object({
  title: z.string().optional(),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      })
    )
    .optional(),
  multiple: z.boolean().default(false),
  directory: z.boolean().default(false),
});
export type FileSelectOptions = z.infer<typeof FileSelectOptionsSchema>;

// Library
export const LibraryClipSchema = z.object({
  id: z.string(),
  projectId: z.string().uuid().nullable(),
  projectName: z.string().nullable(),
  lineNo: z.number().int().nullable(),
  text: z.string(),
  filePath: z.string(),
  duration: z.number().nullable(),
  fileSize: z.number(),
  createdAt: z.string().datetime(),
});
export type LibraryClip = z.infer<typeof LibraryClipSchema>;

export const LibraryExportSchema = z.object({
  id: z.string(),
  projectId: z.string().uuid().nullable(),
  projectName: z.string().nullable(),
  filePath: z.string(),
  duration: z.number().nullable(),
  fileSize: z.number(),
  lineCount: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type LibraryExport = z.infer<typeof LibraryExportSchema>;
