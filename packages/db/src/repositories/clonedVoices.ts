import { getDatabase } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export interface ClonedVoice {
  id: string;
  voiceId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ClonedVoiceRow {
  id: string;
  voice_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

function rowToClonedVoice(row: ClonedVoiceRow): ClonedVoice {
  return {
    id: row.id,
    voiceId: row.voice_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

export const clonedVoicesRepository = {
  list(): ClonedVoice[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM cloned_voices ORDER BY created_at DESC')
      .all() as ClonedVoiceRow[];
    return rows.map(rowToClonedVoice);
  },

  getById(id: string): ClonedVoice | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM cloned_voices WHERE id = ?')
      .get(id) as ClonedVoiceRow | undefined;
    return row ? rowToClonedVoice(row) : null;
  },

  getByVoiceId(voiceId: string): ClonedVoice | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM cloned_voices WHERE voice_id = ?')
      .get(voiceId) as ClonedVoiceRow | undefined;
    return row ? rowToClonedVoice(row) : null;
  },

  create(data: { voiceId: string; name: string; description?: string | null }): ClonedVoice {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO cloned_voices (id, voice_id, name, description)
       VALUES (?, ?, ?, ?)`
    ).run(id, data.voiceId, data.name, data.description ?? null);

    return this.getById(id)!;
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM cloned_voices WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteByVoiceId(voiceId: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM cloned_voices WHERE voice_id = ?').run(voiceId);
    return result.changes > 0;
  },
};
