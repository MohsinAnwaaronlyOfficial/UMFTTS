import { getDatabase } from '../database.js';
import type { AppSettings, AppSettingsUpdate } from '@umf-tts/shared';

interface SettingsRow {
  id: number;
  api_key: string | null;
  default_output_format: string;
  default_model_id: string;
  default_voice_id: string | null;
  default_delay_ms: number;
  default_concurrency: number;
  default_stability: number;
  default_similarity_boost: number;
  default_style: number;
  default_use_speaker_boost: number;
  created_at: string;
  updated_at: string;
}

function rowToSettings(row: SettingsRow): AppSettings {
  return {
    id: 1,
    apiKey: row.api_key ?? undefined,
    defaultOutputFormat: row.default_output_format as 'mp3' | 'wav' | 'ogg',
    defaultModelId: row.default_model_id,
    defaultVoiceId: row.default_voice_id ?? undefined,
    defaultDelayMs: row.default_delay_ms,
    defaultConcurrency: row.default_concurrency,
    defaultVoiceSettings: {
      stability: row.default_stability,
      similarityBoost: row.default_similarity_boost,
      style: row.default_style,
      useSpeakerBoost: row.default_use_speaker_boost === 1,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const settingsRepository = {
  get(): AppSettings {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow;
    return rowToSettings(row);
  },

  update(data: AppSettingsUpdate): AppSettings {
    const db = getDatabase();
    const current = this.get();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.apiKey !== undefined) {
      updates.push('api_key = ?');
      params.push(data.apiKey ?? null);
    }

    if (data.defaultOutputFormat !== undefined) {
      updates.push('default_output_format = ?');
      params.push(data.defaultOutputFormat);
    }

    if (data.defaultModelId !== undefined) {
      updates.push('default_model_id = ?');
      params.push(data.defaultModelId);
    }

    if (data.defaultVoiceId !== undefined) {
      updates.push('default_voice_id = ?');
      params.push(data.defaultVoiceId ?? null);
    }

    if (data.defaultDelayMs !== undefined) {
      updates.push('default_delay_ms = ?');
      params.push(data.defaultDelayMs);
    }

    if (data.defaultConcurrency !== undefined) {
      updates.push('default_concurrency = ?');
      params.push(data.defaultConcurrency);
    }

    if (data.defaultVoiceSettings !== undefined) {
      const vs = data.defaultVoiceSettings;
      if (vs.stability !== undefined) {
        updates.push('default_stability = ?');
        params.push(vs.stability);
      }
      if (vs.similarityBoost !== undefined) {
        updates.push('default_similarity_boost = ?');
        params.push(vs.similarityBoost);
      }
      if (vs.style !== undefined) {
        updates.push('default_style = ?');
        params.push(vs.style);
      }
      if (vs.useSpeakerBoost !== undefined) {
        updates.push('default_use_speaker_boost = ?');
        params.push(vs.useSpeakerBoost ? 1 : 0);
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      const sql = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
      db.prepare(sql).run(...params);
    }

    return this.get();
  },

  getApiKey(): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT api_key FROM settings WHERE id = 1').get() as { api_key: string | null };
    return row?.api_key ?? null;
  },

  setApiKey(apiKey: string | null): void {
    const db = getDatabase();
    db.prepare("UPDATE settings SET api_key = ?, updated_at = datetime('now') WHERE id = 1").run(apiKey);
  },
};
