import { ipcMain } from 'electron';
import { IPC_CHANNELS, AppSettingsUpdateSchema } from '@umf-tts/shared';
import { settingsRepository } from '@umf-tts/db';
import { testApiKey } from '@umf-tts/elevenlabs';
import { log } from '../logger.js';
import type { IpcResult, AppSettings } from '@umf-tts/shared';

export function setupSettingsHandlers(): void {
  // Get settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<IpcResult<AppSettings>> => {
    try {
      const settings = settingsRepository.get();
      // Don't expose the full API key to renderer - just indicate if it exists
      return {
        success: true,
        data: {
          ...settings,
          apiKey: settings.apiKey ? '••••••••' : undefined,
        },
      };
    } catch (error) {
      log.error('Failed to get settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
      };
    }
  });

  // Update settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_, data: unknown): Promise<IpcResult<AppSettings>> => {
      try {
        const parsed = AppSettingsUpdateSchema.parse(data);
        const updated = settingsRepository.update(parsed);
        return {
          success: true,
          data: {
            ...updated,
            apiKey: updated.apiKey ? '••••••••' : undefined,
          },
        };
      } catch (error) {
        log.error('Failed to update settings:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update settings',
        };
      }
    }
  );

  // Test API key
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_TEST_API_KEY,
    async (_, apiKey: string): Promise<IpcResult<boolean>> => {
      try {
        if (!apiKey || typeof apiKey !== 'string') {
          return { success: false, error: 'API key is required' };
        }

        const isValid = await testApiKey(apiKey);

        if (isValid) {
          // Save the API key if valid
          settingsRepository.setApiKey(apiKey);
        }

        return { success: true, data: isValid };
      } catch (error) {
        log.error('Failed to test API key:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to test API key',
        };
      }
    }
  );
}
