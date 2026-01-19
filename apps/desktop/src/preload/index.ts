import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@umf-tts/shared';

type IpcListener = (event: Electron.IpcRendererEvent, ...args: unknown[]) => void;

const api = {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data),
  testApiKey: (apiKey: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_API_KEY, apiKey),

  // Voice Presets
  listPresets: () => ipcRenderer.invoke(IPC_CHANNELS.PRESETS_LIST),
  getPreset: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRESETS_GET, id),
  createPreset: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PRESETS_CREATE, data),
  updatePreset: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PRESETS_UPDATE, data),
  deletePreset: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRESETS_DELETE, id),

  // Projects
  listProjects: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST),
  getProject: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET, id),
  createProject: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_CREATE, data),
  updateProject: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UPDATE, data),
  deleteProject: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_DELETE, id),
  getProjectLines: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_LINES, projectId),
  updateProjectLine: (lineId: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UPDATE_LINE, { lineId, data }),

  // Parser
  parseContent: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PARSER_PARSE, data),

  // ElevenLabs
  listVoices: () => ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_LIST_VOICES),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_LIST_MODELS),
  generateTTS: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS, data),

  // HTTP Streaming
  startTTSStream: (sessionId: string, options: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_START, { sessionId, options }),
  stopTTSStream: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_STOP, sessionId),
  onTTSStreamChunk: (callback: IpcListener) => {
    ipcRenderer.on(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_CHUNK, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_CHUNK, callback);
  },

  // WebSocket Streaming
  startWebSocket: (sessionId: string, options: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_START, { sessionId, options }),
  sendWebSocketText: (sessionId: string, text: string, flush?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_SEND, { sessionId, text, flush }),
  stopWebSocket: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_STOP, sessionId),
  onWebSocketChunk: (callback: IpcListener) => {
    ipcRenderer.on(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, callback);
  },

  // Voice Cloning
  cloneVoice: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_VOICE_CLONE, data),
  deleteVoice: (voiceId: string) => ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_VOICE_DELETE, voiceId),

  // Batch Processing
  startBatch: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.BATCH_START, data),
  cancelBatch: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.BATCH_CANCEL, projectId),
  retryFailedBatch: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.BATCH_RETRY_FAILED, projectId),
  onBatchProgress: (callback: IpcListener) => {
    ipcRenderer.on(IPC_CHANNELS.BATCH_PROGRESS, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BATCH_PROGRESS, callback);
  },
  onBatchLineUpdate: (callback: IpcListener) => {
    ipcRenderer.on(IPC_CHANNELS.BATCH_LINE_UPDATE, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BATCH_LINE_UPDATE, callback);
  },
  onBatchComplete: (callback: IpcListener) => {
    ipcRenderer.on(IPC_CHANNELS.BATCH_COMPLETE, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BATCH_COMPLETE, callback);
  },

  // Audio
  mergeAudio: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_MERGE, data),
  getAudioDuration: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_GET_DURATION, filePath),

  // Library
  listClips: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_LIST_CLIPS),
  listExports: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_LIST_EXPORTS),
  deleteClip: (clipId: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_DELETE_CLIP, clipId),
  deleteExport: (exportId: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_DELETE_EXPORT, exportId),
  openFolder: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_OPEN_FOLDER, filePath),

  // File Operations
  selectFile: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT, options),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
  saveFileDialog: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_DIALOG, options),
  copyFileTo: (sourcePath: string, destPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY_TO, { sourcePath, destPath }),
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
