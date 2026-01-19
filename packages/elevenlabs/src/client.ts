import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import {
  ElevenLabsVoice,
  ElevenLabsVoicesResponseSchema,
  ElevenLabsModel,
  ElevenLabsModelsResponseSchema,
  TTSRequest,
  VoiceCloneRequest,
} from '@umf-tts/shared';

const BASE_URL = 'https://api.elevenlabs.io/v1';

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

async function handleResponse<T>(response: Response, parseJson = true): Promise<T> {
  if (!response.ok) {
    let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail.message) {
          errorMessage = errorData.detail.message;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ElevenLabsError(errorMessage, response.status);
  }

  if (parseJson) {
    return response.json() as Promise<T>;
  }
  return response as unknown as T;
}

export async function listVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const response = await fetch(`${BASE_URL}/voices`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  const data = await handleResponse<{ voices: ElevenLabsVoice[] }>(response);
  const parsed = ElevenLabsVoicesResponseSchema.parse(data);
  return parsed.voices;
}

export async function listModels(apiKey: string): Promise<ElevenLabsModel[]> {
  const response = await fetch(`${BASE_URL}/models`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  const data = await handleResponse<ElevenLabsModel[]>(response);
  const parsed = ElevenLabsModelsResponseSchema.parse(data);
  return parsed;
}

export async function textToSpeechToFile(
  apiKey: string,
  request: TTSRequest
): Promise<{ filePath: string; duration: number | null }> {
  const { voiceId, modelId, text, stability, similarityBoost, style, useSpeakerBoost, outputPath } =
    request;

  if (!outputPath) {
    throw new ElevenLabsError('Output path is required');
  }

  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = `TTS failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
      } else if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ElevenLabsError(errorMessage, response.status);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get audio buffer
  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

  // Try to estimate duration from file size (rough estimate for MP3)
  // Average MP3 bitrate ~ 128kbps = 16KB/s
  const fileSizeBytes = audioBuffer.byteLength;
  const estimatedDuration = fileSizeBytes / 16000;

  return {
    filePath: outputPath,
    duration: estimatedDuration,
  };
}

export async function* textToSpeechStream(
  apiKey: string,
  request: Omit<TTSRequest, 'outputPath'>
): AsyncGenerator<Buffer, void, unknown> {
  const { voiceId, modelId, text, stability, similarityBoost, style, useSpeakerBoost } = request;

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}/stream?optimize_streaming_latency=2`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = `Streaming TTS failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ElevenLabsError(errorMessage, response.status);
  }

  if (!response.body) {
    throw new ElevenLabsError('No response body for streaming');
  }

  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield Buffer.from(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function voiceCloneCreate(
  apiKey: string,
  request: VoiceCloneRequest
): Promise<string> {
  const { name, filePaths, description, labels } = request;

  const formData = new FormData();
  formData.append('name', name);

  if (description) {
    formData.append('description', description);
  }

  if (labels) {
    formData.append('labels', JSON.stringify(labels));
  }

  // Append all audio files
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new ElevenLabsError(`File not found: ${filePath}`);
    }
    const fileName = path.basename(filePath);
    formData.append('files', fs.createReadStream(filePath), fileName);
  }

  const response = await fetch(`${BASE_URL}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      ...formData.getHeaders(),
    },
    body: formData as unknown as BodyInit,
  });

  if (!response.ok) {
    let errorMessage = `Voice clone failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
      } else if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new ElevenLabsError(errorMessage, response.status);
  }

  const data = (await response.json()) as { voice_id: string };
  return data.voice_id;
}

export async function voiceDelete(apiKey: string, voiceId: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    throw new ElevenLabsError(`Failed to delete voice: ${response.status}`, response.status);
  }

  return true;
}

export async function getVoice(apiKey: string, voiceId: string): Promise<ElevenLabsVoice | null> {
  const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new ElevenLabsError(`Failed to get voice: ${response.status}`, response.status);
  }

  const data = await response.json();
  return data as ElevenLabsVoice;
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await listVoices(apiKey);
    return true;
  } catch (error) {
    if (error instanceof ElevenLabsError && error.statusCode === 401) {
      return false;
    }
    throw error;
  }
}
