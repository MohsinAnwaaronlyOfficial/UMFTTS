import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

export function setupLogger(): void {
  // Configure log file location
  const logPath = path.join(app.getPath('userData'), 'logs');
  log.transports.file.resolvePathFn = () => path.join(logPath, 'main.log');

  // Log format
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

  // Max log file size (5MB)
  log.transports.file.maxSize = 5 * 1024 * 1024;

  // Log level
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';

  log.info('Logger initialized');
  log.info('App version:', app.getVersion());
  log.info('User data path:', app.getPath('userData'));
}

export { log };
