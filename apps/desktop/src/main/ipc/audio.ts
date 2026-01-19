import { ipcMain, app, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS, AudioMergeRequestSchema } from '@umf-tts/shared';
import { projectsRepository, exportsRepository, settingsRepository } from '@umf-tts/db';
import { mergeAudioClips, getAudioDuration } from '@umf-tts/audio';
import { log } from '../logger.js';
import type { IpcResult, AudioMergeResult, LibraryClip, LibraryExport } from '@umf-tts/shared';

export function setupAudioHandlers(): void {
  // Merge audio clips
  ipcMain.handle(
    IPC_CHANNELS.AUDIO_MERGE,
    async (_, data: unknown): Promise<IpcResult<AudioMergeResult>> => {
      try {
        const { projectId, delayMs, outputFormat } = AudioMergeRequestSchema.parse(data);

        // Get project lines that have clips
        const lines = projectsRepository.getLines(projectId);
        const completedLines = lines
          .filter((l) => l.status === 'done' && l.clipPath)
          .sort((a, b) => a.lineNo - b.lineNo);

        if (completedLines.length === 0) {
          return { success: false, error: 'No completed clips to merge' };
        }

        const clipPaths = completedLines.map((l) => l.clipPath!);

        // Generate output path
        const project = projectsRepository.getById(projectId);
        const exportDir = path.join(app.getPath('userData'), 'exports');
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = (project?.name ?? 'export').replace(/[^a-zA-Z0-9-_]/g, '_');
        const outputPath = path.join(exportDir, `${safeName}-${timestamp}.${outputFormat}`);

        // Merge clips
        const result = await mergeAudioClips({
          clipPaths,
          outputPath,
          delayMs,
          outputFormat,
        });

        // Save export record
        exportsRepository.create({
          projectId,
          filePath: result.outputPath,
          duration: result.duration,
          fileSize: result.fileSize,
          lineCount: completedLines.length,
        });

        // Update project with merged file path
        projectsRepository.setMergedFilePath(projectId, result.outputPath);

        return { success: true, data: result };
      } catch (error) {
        log.error('Failed to merge audio:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to merge audio',
        };
      }
    }
  );

  // Get audio duration
  ipcMain.handle(
    IPC_CHANNELS.AUDIO_GET_DURATION,
    async (_, filePath: string): Promise<IpcResult<number>> => {
      try {
        const duration = await getAudioDuration(filePath);
        return { success: true, data: duration };
      } catch (error) {
        log.error('Failed to get audio duration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get audio duration',
        };
      }
    }
  );

  // List clips in library
  ipcMain.handle(IPC_CHANNELS.LIBRARY_LIST_CLIPS, async (): Promise<IpcResult<LibraryClip[]>> => {
    try {
      const clipsDir = path.join(app.getPath('userData'), 'clips');
      const clips: LibraryClip[] = [];

      if (!fs.existsSync(clipsDir)) {
        return { success: true, data: [] };
      }

      // Get all projects and their lines with clips
      const projects = projectsRepository.list();

      for (const project of projects) {
        const lines = projectsRepository.getLines(project.id);
        for (const line of lines) {
          if (line.clipPath && fs.existsSync(line.clipPath)) {
            const stats = fs.statSync(line.clipPath);
            clips.push({
              id: line.id,
              projectId: project.id,
              projectName: project.name,
              lineNo: line.lineNo,
              text: line.text,
              filePath: line.clipPath,
              duration: line.duration ?? null,
              fileSize: stats.size,
              createdAt: line.createdAt ?? stats.mtime.toISOString(),
            });
          }
        }
      }

      // Sort by creation date, newest first
      clips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { success: true, data: clips };
    } catch (error) {
      log.error('Failed to list clips:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list clips',
      };
    }
  });

  // List exports in library
  ipcMain.handle(IPC_CHANNELS.LIBRARY_LIST_EXPORTS, async (): Promise<IpcResult<LibraryExport[]>> => {
    try {
      const exports = exportsRepository.list();

      // Filter out exports where file no longer exists
      const validExports = exports.filter((e) => fs.existsSync(e.filePath));

      return { success: true, data: validExports };
    } catch (error) {
      log.error('Failed to list exports:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list exports',
      };
    }
  });

  // Delete clip
  ipcMain.handle(
    IPC_CHANNELS.LIBRARY_DELETE_CLIP,
    async (_, clipId: string): Promise<IpcResult<boolean>> => {
      try {
        const line = projectsRepository.getLine(clipId);
        if (line?.clipPath && fs.existsSync(line.clipPath)) {
          fs.unlinkSync(line.clipPath);
        }

        // Update line to remove clip reference
        projectsRepository.updateLine(clipId, {
          clipPath: undefined,
          status: 'pending',
        });

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to delete clip:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete clip',
        };
      }
    }
  );

  // Delete export
  ipcMain.handle(
    IPC_CHANNELS.LIBRARY_DELETE_EXPORT,
    async (_, exportId: string): Promise<IpcResult<boolean>> => {
      try {
        const exportRecord = exportsRepository.getById(exportId);
        if (exportRecord && fs.existsSync(exportRecord.filePath)) {
          fs.unlinkSync(exportRecord.filePath);
        }

        exportsRepository.delete(exportId);

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to delete export:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete export',
        };
      }
    }
  );

  // Open folder containing file
  ipcMain.handle(
    IPC_CHANNELS.LIBRARY_OPEN_FOLDER,
    async (_, filePath: string): Promise<IpcResult<boolean>> => {
      try {
        if (fs.existsSync(filePath)) {
          shell.showItemInFolder(filePath);
          return { success: true, data: true };
        }
        return { success: false, error: 'File not found' };
      } catch (error) {
        log.error('Failed to open folder:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to open folder',
        };
      }
    }
  );
}
