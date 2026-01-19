import { ipcMain } from 'electron';
import { IPC_CHANNELS, VoicePresetCreateSchema, VoicePresetUpdateSchema } from '@umf-tts/shared';
import { presetsRepository } from '@umf-tts/db';
import { log } from '../logger.js';
import type { IpcResult, VoicePreset } from '@umf-tts/shared';

export function setupPresetsHandlers(): void {
  // List all presets
  ipcMain.handle(IPC_CHANNELS.PRESETS_LIST, async (): Promise<IpcResult<VoicePreset[]>> => {
    try {
      const presets = presetsRepository.list();
      return { success: true, data: presets };
    } catch (error) {
      log.error('Failed to list presets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list presets',
      };
    }
  });

  // Get preset by ID
  ipcMain.handle(
    IPC_CHANNELS.PRESETS_GET,
    async (_, id: number): Promise<IpcResult<VoicePreset | null>> => {
      try {
        const preset = presetsRepository.getById(id);
        return { success: true, data: preset };
      } catch (error) {
        log.error('Failed to get preset:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get preset',
        };
      }
    }
  );

  // Create preset
  ipcMain.handle(
    IPC_CHANNELS.PRESETS_CREATE,
    async (_, data: unknown): Promise<IpcResult<VoicePreset>> => {
      try {
        const parsed = VoicePresetCreateSchema.parse(data);

        // Check if preset ID already exists
        const existing = presetsRepository.getByPresetId(parsed.presetId);
        if (existing) {
          return {
            success: false,
            error: `Preset #${parsed.presetId} already exists. Delete it first or use a different number.`,
          };
        }

        const preset = presetsRepository.create(parsed);
        return { success: true, data: preset };
      } catch (error) {
        log.error('Failed to create preset:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create preset',
        };
      }
    }
  );

  // Update preset
  ipcMain.handle(
    IPC_CHANNELS.PRESETS_UPDATE,
    async (_, data: unknown): Promise<IpcResult<VoicePreset | null>> => {
      try {
        const parsed = VoicePresetUpdateSchema.parse(data);
        const preset = presetsRepository.update(parsed);
        return { success: true, data: preset };
      } catch (error) {
        log.error('Failed to update preset:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update preset',
        };
      }
    }
  );

  // Delete preset
  ipcMain.handle(IPC_CHANNELS.PRESETS_DELETE, async (_, id: number): Promise<IpcResult<boolean>> => {
    try {
      const success = presetsRepository.delete(id);
      return { success: true, data: success };
    } catch (error) {
      log.error('Failed to delete preset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete preset',
      };
    }
  });
}
