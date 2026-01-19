import { ipcMain, BrowserWindow, app } from 'electron';
import path from 'path';
import { IPC_CHANNELS, BatchStartRequestSchema } from '@umf-tts/shared';
import { settingsRepository, projectsRepository, presetsRepository } from '@umf-tts/db';
import { textToSpeechToFile } from '@umf-tts/elevenlabs';
import { log } from '../logger.js';
import type { IpcResult, ProjectLine, BatchProgress } from '@umf-tts/shared';

interface BatchJob {
  projectId: string;
  cancelled: boolean;
  processing: Set<string>;
}

const activeJobs = new Map<string, BatchJob>();

function getApiKey(): string {
  const apiKey = settingsRepository.getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  return apiKey;
}

async function processLine(
  apiKey: string,
  line: ProjectLine,
  projectId: string,
  window: BrowserWindow
): Promise<void> {
  const settings = settingsRepository.get();
  const preset = line.presetId ? presetsRepository.getByPresetId(line.presetId) : null;

  // Determine voice settings
  const voiceId = preset?.voiceId ?? settings.defaultVoiceId;
  const modelId = preset?.modelId ?? settings.defaultModelId;
  const stability = preset?.stability ?? settings.defaultVoiceSettings.stability;
  const similarityBoost = preset?.similarityBoost ?? settings.defaultVoiceSettings.similarityBoost;
  const style = preset?.style ?? settings.defaultVoiceSettings.style;
  const useSpeakerBoost = preset?.useSpeakerBoost ?? settings.defaultVoiceSettings.useSpeakerBoost;

  if (!voiceId) {
    throw new Error('No voice selected. Set a default voice in Settings or configure the preset.');
  }

  // Generate output path
  const clipsDir = path.join(app.getPath('userData'), 'clips', projectId);
  const outputPath = path.join(clipsDir, `line-${line.lineNo.toString().padStart(4, '0')}.mp3`);

  // Generate TTS
  const result = await textToSpeechToFile(apiKey, {
    voiceId,
    modelId,
    text: line.text,
    stability,
    similarityBoost,
    style,
    useSpeakerBoost,
    outputPath,
  });

  // Update line in database
  projectsRepository.updateLine(line.id, {
    status: 'done',
    clipPath: result.filePath,
    duration: result.duration,
    error: undefined,
  });

  // Send update to renderer
  window.webContents.send(IPC_CHANNELS.BATCH_LINE_UPDATE, {
    projectId,
    lineId: line.id,
    status: 'done',
    clipPath: result.filePath,
    duration: result.duration,
  });
}

function sendProgress(window: BrowserWindow, projectId: string): void {
  const stats = projectsRepository.getProjectStats(projectId);
  const progress: BatchProgress = {
    projectId,
    total: stats.total,
    completed: stats.completed,
    failed: stats.failed,
    processing: stats.processing,
    pending: stats.pending,
  };
  window.webContents.send(IPC_CHANNELS.BATCH_PROGRESS, progress);
}

export function setupBatchHandlers(): void {
  // Start batch processing
  ipcMain.handle(
    IPC_CHANNELS.BATCH_START,
    async (event, data: unknown): Promise<IpcResult<boolean>> => {
      try {
        const { projectId, concurrency } = BatchStartRequestSchema.parse(data);
        const apiKey = getApiKey();

        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return { success: false, error: 'Window not found' };
        }

        // Check if job already running
        if (activeJobs.has(projectId)) {
          return { success: false, error: 'Job already running for this project' };
        }

        // Get pending lines
        const pendingLines = projectsRepository.getLinesByStatus(projectId, 'pending');
        if (pendingLines.length === 0) {
          return { success: false, error: 'No pending lines to process' };
        }

        // Create job
        const job: BatchJob = {
          projectId,
          cancelled: false,
          processing: new Set(),
        };
        activeJobs.set(projectId, job);

        // Update project status
        projectsRepository.updateStatus(projectId, 'processing');

        // Process lines with concurrency
        (async () => {
          const queue = [...pendingLines];
          const activePromises: Promise<void>[] = [];

          const processNext = async (): Promise<void> => {
            while (queue.length > 0 && !job.cancelled) {
              const line = queue.shift();
              if (!line) break;

              if (job.cancelled) break;

              job.processing.add(line.id);

              // Mark as processing
              projectsRepository.updateLine(line.id, { status: 'processing' });
              window.webContents.send(IPC_CHANNELS.BATCH_LINE_UPDATE, {
                projectId,
                lineId: line.id,
                status: 'processing',
              });
              sendProgress(window, projectId);

              try {
                await processLine(apiKey, line, projectId, window);
              } catch (error) {
                log.error(`Failed to process line ${line.id}:`, error);
                projectsRepository.updateLine(line.id, {
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
                window.webContents.send(IPC_CHANNELS.BATCH_LINE_UPDATE, {
                  projectId,
                  lineId: line.id,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }

              job.processing.delete(line.id);
              sendProgress(window, projectId);
            }
          };

          // Start concurrent workers
          for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
            activePromises.push(processNext());
          }

          await Promise.all(activePromises);

          // Update final status
          const stats = projectsRepository.getProjectStats(projectId);
          const finalStatus = job.cancelled
            ? 'failed'
            : stats.failed > 0
              ? 'failed'
              : 'completed';

          projectsRepository.updateStatus(projectId, finalStatus, {
            completedLines: stats.completed,
            failedLines: stats.failed,
          });

          // Send completion
          window.webContents.send(IPC_CHANNELS.BATCH_COMPLETE, {
            projectId,
            status: finalStatus,
            stats,
          });

          activeJobs.delete(projectId);
        })();

        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to start batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start batch',
        };
      }
    }
  );

  // Cancel batch processing
  ipcMain.handle(
    IPC_CHANNELS.BATCH_CANCEL,
    async (_, projectId: string): Promise<IpcResult<boolean>> => {
      try {
        const job = activeJobs.get(projectId);
        if (job) {
          job.cancelled = true;
          // Reset processing lines to pending
          for (const lineId of job.processing) {
            projectsRepository.updateLine(lineId, { status: 'pending' });
          }
        }
        return { success: true, data: true };
      } catch (error) {
        log.error('Failed to cancel batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel batch',
        };
      }
    }
  );

  // Retry failed items
  ipcMain.handle(
    IPC_CHANNELS.BATCH_RETRY_FAILED,
    async (_, projectId: string): Promise<IpcResult<number>> => {
      try {
        const failedLines = projectsRepository.getLinesByStatus(projectId, 'failed');

        for (const line of failedLines) {
          projectsRepository.updateLine(line.id, {
            status: 'pending',
            error: undefined,
          });
        }

        return { success: true, data: failedLines.length };
      } catch (error) {
        log.error('Failed to retry failed items:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retry failed items',
        };
      }
    }
  );
}
