import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { WebSocketResponse, StreamingOptions } from '@umf-tts/shared';

const WS_BASE_URL = 'wss://api.elevenlabs.io/v1';

export interface WebSocketStreamEvents {
  audio: (chunk: Buffer) => void;
  alignment: (data: WebSocketResponse['alignment']) => void;
  error: (error: Error) => void;
  close: () => void;
  open: () => void;
}

export class ElevenLabsWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private options: StreamingOptions;
  private isClosing = false;
  private audioChunks: Buffer[] = [];

  constructor(apiKey: string, options: StreamingOptions) {
    super();
    this.apiKey = apiKey;
    this.options = options;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { voiceId, modelId, optimizeStreamingLatency } = this.options;

      const url = `${WS_BASE_URL}/text-to-speech/${voiceId}/stream-input?model_id=${modelId}&optimize_streaming_latency=${optimizeStreamingLatency ?? 0}`;

      this.ws = new WebSocket(url, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      this.ws.on('open', () => {
        // Send initial configuration
        this.sendConfig();
        this.emit('open');
        resolve();
      });

      this.ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketResponse;

          if (message.audio) {
            const audioBuffer = Buffer.from(message.audio, 'base64');
            this.audioChunks.push(audioBuffer);
            this.emit('audio', audioBuffer);
          }

          if (message.alignment || message.normalizedAlignment) {
            this.emit('alignment', message.alignment ?? message.normalizedAlignment);
          }

          if (message.isFinal) {
            this.emit('close');
          }
        } catch (error) {
          this.emit('error', error as Error);
        }
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        if (!this.isClosing) {
          this.emit('close');
        }
      });
    });
  }

  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const { text, stability, similarityBoost, style, useSpeakerBoost } = this.options;

    // Send initial message with voice settings
    const initMessage = {
      text: ' ', // Start with a space to initialize
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
      generation_config: {
        chunk_length_schedule: [120, 160, 250, 290],
      },
    };

    this.ws.send(JSON.stringify(initMessage));
  }

  sendText(text: string, flush = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message: Record<string, unknown> = {
      text,
      try_trigger_generation: true,
    };

    if (flush) {
      message.flush = true;
    }

    this.ws.send(JSON.stringify(message));
  }

  flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    // Send empty string with flush to signal end of input
    this.ws.send(
      JSON.stringify({
        text: '',
        flush: true,
      })
    );
  }

  close(): void {
    this.isClosing = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getAudioBuffer(): Buffer {
    return Buffer.concat(this.audioChunks);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export async function createWebSocketStream(
  apiKey: string,
  options: StreamingOptions
): Promise<ElevenLabsWebSocket> {
  const ws = new ElevenLabsWebSocket(apiKey, options);
  await ws.connect();
  return ws;
}

// Simplified streaming function for one-shot text
export async function streamTextViaWebSocket(
  apiKey: string,
  options: StreamingOptions,
  onChunk: (chunk: Buffer) => void,
  onError?: (error: Error) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new ElevenLabsWebSocket(apiKey, options);
    const chunks: Buffer[] = [];

    ws.on('audio', (chunk) => {
      chunks.push(chunk);
      onChunk(chunk);
    });

    ws.on('error', (error) => {
      if (onError) onError(error);
      reject(error);
    });

    ws.on('close', () => {
      resolve(Buffer.concat(chunks));
    });

    ws.connect()
      .then(() => {
        // Send the full text
        ws.sendText(options.text);
        // Signal end of input
        ws.flush();
      })
      .catch(reject);
  });
}
