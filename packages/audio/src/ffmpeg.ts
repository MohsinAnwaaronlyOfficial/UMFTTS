import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface MergeOptions {
  clipPaths: string[];
  outputPath: string;
  delayMs?: number;
  outputFormat?: 'mp3' | 'wav' | 'ogg';
}

export interface MergeResult {
  outputPath: string;
  duration: number;
  fileSize: number;
}

export interface AudioInfo {
  duration: number;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

// Check if FFmpeg is available
export async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

// Get audio file duration using FFprobe
export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration;
      if (typeof duration === 'number') {
        resolve(duration);
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    });
  });
}

// Get full audio info
export function getAudioInfo(filePath: string): Promise<AudioInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const format = metadata.format;
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

      resolve({
        duration: format.duration ?? 0,
        format: format.format_name ?? 'unknown',
        bitrate: format.bit_rate ? parseInt(String(format.bit_rate), 10) : undefined,
        sampleRate: audioStream?.sample_rate
          ? parseInt(String(audioStream.sample_rate), 10)
          : undefined,
        channels: audioStream?.channels,
      });
    });
  });
}

// Generate silence audio file
export function generateSilence(durationMs: number, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const durationSec = durationMs / 1000;

    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputFormat('lavfi')
      .duration(durationSec)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

// Merge multiple audio clips with optional silence between them
export async function mergeAudioClips(options: MergeOptions): Promise<MergeResult> {
  const { clipPaths, outputPath, delayMs = 0, outputFormat = 'mp3' } = options;

  // Validate input files exist
  for (const clipPath of clipPaths) {
    if (!fs.existsSync(clipPath)) {
      throw new Error(`Audio file not found: ${clipPath}`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // If only one clip and no delay, just copy it
  if (clipPaths.length === 1 && delayMs === 0) {
    fs.copyFileSync(clipPaths[0]!, outputPath);
    const duration = await getAudioDuration(outputPath);
    const stats = fs.statSync(outputPath);
    return {
      outputPath,
      duration,
      fileSize: stats.size,
    };
  }

  // Create a temporary directory for intermediate files
  const tempDir = path.join(path.dirname(outputPath), '.temp-merge-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // If we need silence between clips
    if (delayMs > 0) {
      // Generate silence file
      const silencePath = path.join(tempDir, 'silence.mp3');
      await generateSilence(delayMs, silencePath);

      // Create file list for concat
      const fileListPath = path.join(tempDir, 'filelist.txt');
      const fileListContent: string[] = [];

      for (let i = 0; i < clipPaths.length; i++) {
        // Escape single quotes in paths for FFmpeg
        const escapedPath = clipPaths[i]!.replace(/'/g, "'\\''");
        fileListContent.push(`file '${escapedPath}'`);

        // Add silence after each clip except the last
        if (i < clipPaths.length - 1) {
          const escapedSilence = silencePath.replace(/'/g, "'\\''");
          fileListContent.push(`file '${escapedSilence}'`);
        }
      }

      fs.writeFileSync(fileListPath, fileListContent.join('\n'));

      // Merge using concat demuxer
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(fileListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    } else {
      // No silence, just concatenate
      const fileListPath = path.join(tempDir, 'filelist.txt');
      const fileListContent = clipPaths.map((p) => {
        const escapedPath = p.replace(/'/g, "'\\''");
        return `file '${escapedPath}'`;
      });

      fs.writeFileSync(fileListPath, fileListContent.join('\n'));

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(fileListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    }

    // Get final file info
    const duration = await getAudioDuration(outputPath);
    const stats = fs.statSync(outputPath);

    return {
      outputPath,
      duration,
      fileSize: stats.size,
    };
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Convert audio to different format
export function convertAudio(
  inputPath: string,
  outputPath: string,
  options?: {
    format?: 'mp3' | 'wav' | 'ogg';
    bitrate?: string;
    sampleRate?: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    if (options?.bitrate) {
      command = command.audioBitrate(options.bitrate);
    }

    if (options?.sampleRate) {
      command = command.audioFrequency(options.sampleRate);
    }

    command
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

// Set FFmpeg path if needed (for bundled FFmpeg)
export function setFfmpegPath(ffmpegPath: string, ffprobePath?: string): void {
  ffmpeg.setFfmpegPath(ffmpegPath);
  if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
  }
}
