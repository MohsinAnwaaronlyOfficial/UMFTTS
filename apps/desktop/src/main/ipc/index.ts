import { setupSettingsHandlers } from './settings.js';
import { setupPresetsHandlers } from './presets.js';
import { setupProjectsHandlers } from './projects.js';
import { setupElevenLabsHandlers } from './elevenlabs.js';
import { setupBatchHandlers } from './batch.js';
import { setupAudioHandlers } from './audio.js';
import { setupFileHandlers } from './files.js';
import { log } from '../logger.js';

export function setupIpcHandlers(): void {
  log.info('Setting up IPC handlers...');

  setupSettingsHandlers();
  setupPresetsHandlers();
  setupProjectsHandlers();
  setupElevenLabsHandlers();
  setupBatchHandlers();
  setupAudioHandlers();
  setupFileHandlers();

  log.info('IPC handlers initialized');
}
