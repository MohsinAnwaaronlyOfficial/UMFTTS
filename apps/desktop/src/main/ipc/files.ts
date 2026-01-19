import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS, FileSelectOptionsSchema } from '@umf-tts/shared';
import { log } from '../logger.js';
import type { IpcResult, FileSelectOptions } from '@umf-tts/shared';

export function setupFileHandlers(): void {
  // Select file(s)
  ipcMain.handle(
    IPC_CHANNELS.FILE_SELECT,
    async (_, options: unknown): Promise<IpcResult<string[]>> => {
      try {
        const parsed = FileSelectOptionsSchema.parse(options);

        const properties: ('openFile' | 'openDirectory' | 'multiSelections')[] = [];

        if (parsed.directory) {
          properties.push('openDirectory');
        } else {
          properties.push('openFile');
        }

        if (parsed.multiple) {
          properties.push('multiSelections');
        }

        const result = await dialog.showOpenDialog({
          title: parsed.title ?? 'Select File',
          properties,
          filters: parsed.filters,
        });

        if (result.canceled) {
          return { success: true, data: [] };
        }

        return { success: true, data: result.filePaths };
      } catch (error) {
        log.error('Failed to select file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to select file',
        };
      }
    }
  );

  // Read file content
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ,
    async (_, filePath: string): Promise<IpcResult<string>> => {
      try {
        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'File not found' };
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, data: content };
      } catch (error) {
        log.error('Failed to read file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read file',
        };
      }
    }
  );

  // Save file dialog
  ipcMain.handle(
    IPC_CHANNELS.FILE_SAVE_DIALOG,
    async (
      _,
      options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }
    ): Promise<IpcResult<string | null>> => {
      try {
        const result = await dialog.showSaveDialog({
          title: options.title ?? 'Save File',
          defaultPath: options.defaultPath,
          filters: options.filters,
        });

        if (result.canceled || !result.filePath) {
          return { success: true, data: null };
        }

        return { success: true, data: result.filePath };
      } catch (error) {
        log.error('Failed to show save dialog:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to show save dialog',
        };
      }
    }
  );

  // Copy file to destination
  ipcMain.handle(
    IPC_CHANNELS.FILE_COPY_TO,
    async (
      _,
      { sourcePath, destPath }: { sourcePath: string; destPath: string }
    ): Promise<IpcResult<string>> => {
      try {
        if (!fs.existsSync(sourcePath)) {
          return { success: false, error: 'Source file not found' };
        }

        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        return { success: true, data: destPath };
      } catch (error) {
        log.error('Failed to copy file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to copy file',
        };
      }
    }
  );
}
