import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS, TTSRequestSchema, VoiceCloneRequestSchema, StreamingOptionsSchema } from '@umf-tts/shared';
import { settingsRepository } from '@umf-tts/db';
import {
  listVoices,
  listModels,
  textToSpeechToFile,
  textToSpeechStream,
  voiceCloneCreate,
  voiceDelete,
  ElevenLabsWebSocket,
} from '@umf-tts/elevenlabs';
import { log } from '../logger.js';
import type { IpcResult, ElevenLabsVoice, ElevenLabsModel } from '@umf-tts/shared';

// Store active streaming sessions
const activeStreams = new Map<string, AbortController>();
const activeWebSockets = new Map<string, ElevenLabsWebSocket>();

function getApiKey(): string {
  const apiKey = settingsRepository.getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your ElevenLabs API key in Settings.');
  }
  return apiKey;
}

export function setupElevenLabsHandlers(): void {
  // List voices
  ipcMain.handle(IPC_CHANNELS.ELEVENLABS_LIST_VOICES, async (): Promise<IpcResult<ElevenLabsVoice[]>> => {
    try {
      const apiKey = getApiKey();
      const voices = await listVoices(apiKey);
      return { success: true, data: voices };
    } catch (error) {
      log.error('Failed to list voices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list voices',
      };
    }
  });

  // List models
  ipcMain.handle(IPC_CHANNELS.ELEVENLABS_LIST_MODELS, async (): Promise<IpcResult<ElevenLabsModel[]>> => {
    try {
      const apiKey = getApiKey();
      const models = await listModels(apiKey);
      return { success: true, data: models };
    } catch (error) {
      log.error('Failed to list models:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list models',
      };
    }
  });

  // TTS to file
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_TTS,
    async (_, data: unknown): Promise<IpcResult<{ filePath: string; duration: number | null }>> => {
      try {
        const apiKey = getApiKey();
        const request = TTSRequestSchema.parse(data);
        const result = await textToSpeechToFile(apiKey, request);
        return { success: true, data: result };
      } catch (error) {
        log.error('Failed to generate TTS:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate TTS',
        };
      }
    }
  );

  // Start HTTP streaming
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_TTS_STREAM_START,
    async (event, { sessionId, options }: { sessionId: string; options: unknown }): Promise<IpcResult<boolean>> => {
      try {
        const apiKey = getApiKey();
        const parsed = StreamingOptionsSchema.parse(options);

        // Cancel existing session if any
        if (activeStreams.has(sessionId)) {
          activeStreams.get(sessionId)?.abort();
          activeStreams.delete(sessionId);
        }

        const abortController = new AbortController();
        activeStreams.set(sessionId, abortController);

        // Start streaming in background
        (async () => {
          try {
            const stream = textToSpeechStream(apiKey, parsed);

            for await (const chunk of stream) {
              if (abortController.signal.aborted) break;

              // Send chunk to renderer
              const window = BrowserWindow.fromWebContents(event.sender);
              if (window && !window.isDestroyed()) {
                window.webContents.send(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_CHUNK, {
                  sessionId,
                  chunk: chunk.toString('base64'),
                });
              }
            }

            // Send completion signal
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window && !window.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_CHUNK, {
                sessionId,
                done: true,
              });
            }
          } catch (error) {
            if (!abortController.signal.aborted) {
              log.error('Streaming error:', error);
              const window = BrowserWindow.fromWebContents(event.sender);
              if (window && !window.isDestroyed()) {
                window.webContents.send(IPC_CHANNELS.ELEVENLABS_TTS_STREAM_CHUNK, {
                  sessionId,
                  error: error instanceof Error ? error.message : 'Streaming failed',
                });
              }
            }
          } finally {
            activeStreams.delete(sessionId);
          }
        })();

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to start streaming:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start streaming',
        };
      }
    }
  );

  // Stop HTTP streaming
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_TTS_STREAM_STOP,
    async (_, sessionId: string): Promise<IpcResult<boolean>> => {
      try {
        const controller = activeStreams.get(sessionId);
        if (controller) {
          controller.abort();
          activeStreams.delete(sessionId);
        }
        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to stop streaming:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop streaming',
        };
      }
    }
  );

  // Start WebSocket streaming
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_WEBSOCKET_START,
    async (event, { sessionId, options }: { sessionId: string; options: unknown }): Promise<IpcResult<boolean>> => {
      try {
        const apiKey = getApiKey();
        const parsed = StreamingOptionsSchema.parse(options);

        // Close existing session if any
        if (activeWebSockets.has(sessionId)) {
          activeWebSockets.get(sessionId)?.close();
          activeWebSockets.delete(sessionId);
        }

        const ws = new ElevenLabsWebSocket(apiKey, parsed);

        ws.on('audio', (chunk) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, {
              sessionId,
              chunk: chunk.toString('base64'),
            });
          }
        });

        ws.on('alignment', (alignment) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, {
              sessionId,
              alignment,
            });
          }
        });

        ws.on('error', (error) => {
          log.error('WebSocket error:', error);
          const window = BrowserWindow.fromWebContents(event.sender);
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, {
              sessionId,
              error: error.message,
            });
          }
        });

        ws.on('close', () => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.ELEVENLABS_WEBSOCKET_CHUNK, {
              sessionId,
              done: true,
            });
          }
          activeWebSockets.delete(sessionId);
        });

        await ws.connect();
        activeWebSockets.set(sessionId, ws);

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to start WebSocket:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start WebSocket',
        };
      }
    }
  );

  // Send text via WebSocket
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_WEBSOCKET_SEND,
    async (_, { sessionId, text, flush }: { sessionId: string; text: string; flush?: boolean }): Promise<IpcResult<boolean>> => {
      try {
        const ws = activeWebSockets.get(sessionId);
        if (!ws) {
          return { success: false, error: 'WebSocket session not found' };
        }

        if (flush) {
          ws.flush();
        } else {
          ws.sendText(text);
        }

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to send WebSocket message:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
        };
      }
    }
  );

  // Stop WebSocket streaming
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_WEBSOCKET_STOP,
    async (_, sessionId: string): Promise<IpcResult<boolean>> => {
      try {
        const ws = activeWebSockets.get(sessionId);
        if (ws) {
          ws.close();
          activeWebSockets.delete(sessionId);
        }
        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to stop WebSocket:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop WebSocket',
        };
      }
    }
  );

  // Voice clone
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_VOICE_CLONE,
    async (_, data: unknown): Promise<IpcResult<string>> => {
      try {
        const apiKey = getApiKey();
        const request = VoiceCloneRequestSchema.parse(data);
        const voiceId = await voiceCloneCreate(apiKey, request);
        return { success: true, data: voiceId };
      } catch (error) {
        log.error('Failed to clone voice:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clone voice',
        };
      }
    }
  );

  // Delete voice
  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_VOICE_DELETE,
    async (_, voiceId: string): Promise<IpcResult<boolean>> => {
      try {
        const apiKey = getApiKey();
        const success = await voiceDelete(apiKey, voiceId);
        return { success: true, data: success };
      } catch (error) {
        log.error('Failed to delete voice:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete voice',
        };
      }
    }
  );
}
