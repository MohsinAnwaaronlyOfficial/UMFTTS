import { getDatabase } from '../database.js';
import type { VoicePreset, VoicePresetCreate, VoicePresetUpdate } from '@umf-tts/shared';

interface PresetRow {
  id: number;
  preset_id: number;
  name: string;
  voice_id: string;
  model_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: number;
  created_at: string;
  updated_at: string;
}

function rowToPreset(row: PresetRow): VoicePreset {
  return {
    id: row.id,
    presetId: row.preset_id,
    name: row.name,
    voiceId: row.voice_id,
    modelId: row.model_id,
    stability: row.stability,
    similarityBoost: row.similarity_boost,
    style: row.style,
    useSpeakerBoost: row.use_speaker_boost === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const presetsRepository = {
  list(): VoicePreset[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM voice_presets ORDER BY preset_id').all() as PresetRow[];
    return rows.map(rowToPreset);
  },

  getById(id: number): VoicePreset | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM voice_presets WHERE id = ?').get(id) as PresetRow | undefined;
    return row ? rowToPreset(row) : null;
  },

  getByPresetId(presetId: number): VoicePreset | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM voice_presets WHERE preset_id = ?').get(presetId) as PresetRow | undefined;
    return row ? rowToPreset(row) : null;
  },

  create(data: VoicePresetCreate): VoicePreset {
    const db = getDatabase();

    const result = db
      .prepare(
        `INSERT INTO voice_presets (preset_id, name, voice_id, model_id, stability, similarity_boost, style, use_speaker_boost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.presetId,
        data.name,
        data.voiceId,
        data.modelId ?? 'eleven_multilingual_v2',
        data.stability ?? 0.5,
        data.similarityBoost ?? 0.75,
        data.style ?? 0,
        data.useSpeakerBoost ?? true ? 1 : 0
      );

    return this.getById(result.lastInsertRowid as number)!;
  },

  update(data: VoicePresetUpdate): VoicePreset | null {
    const db = getDatabase();
    const current = this.getById(data.id);
    if (!current) return null;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.presetId !== undefined) {
      updates.push('preset_id = ?');
      params.push(data.presetId);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.voiceId !== undefined) {
      updates.push('voice_id = ?');
      params.push(data.voiceId);
    }
    if (data.modelId !== undefined) {
      updates.push('model_id = ?');
      params.push(data.modelId);
    }
    if (data.stability !== undefined) {
      updates.push('stability = ?');
      params.push(data.stability);
    }
    if (data.similarityBoost !== undefined) {
      updates.push('similarity_boost = ?');
      params.push(data.similarityBoost);
    }
    if (data.style !== undefined) {
      updates.push('style = ?');
      params.push(data.style);
    }
    if (data.useSpeakerBoost !== undefined) {
      updates.push('use_speaker_boost = ?');
      params.push(data.useSpeakerBoost ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(data.id);
      const sql = `UPDATE voice_presets SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...params);
    }

    return this.getById(data.id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM voice_presets WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteByPresetId(presetId: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM voice_presets WHERE preset_id = ?').run(presetId);
    return result.changes > 0;
  },
};
