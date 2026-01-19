import { getDatabase } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import type { LibraryExport } from '@umf-tts/shared';

interface ExportRow {
  id: string;
  project_id: string | null;
  file_path: string;
  duration: number | null;
  file_size: number | null;
  line_count: number | null;
  created_at: string;
  project_name?: string | null;
}

function rowToExport(row: ExportRow): LibraryExport {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name ?? null,
    filePath: row.file_path,
    duration: row.duration,
    fileSize: row.file_size ?? 0,
    lineCount: row.line_count,
    createdAt: row.created_at,
  };
}

export const exportsRepository = {
  list(): LibraryExport[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT e.*, p.name as project_name
         FROM exports e
         LEFT JOIN projects p ON e.project_id = p.id
         ORDER BY e.created_at DESC`
      )
      .all() as ExportRow[];
    return rows.map(rowToExport);
  },

  getById(id: string): LibraryExport | null {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT e.*, p.name as project_name
         FROM exports e
         LEFT JOIN projects p ON e.project_id = p.id
         WHERE e.id = ?`
      )
      .get(id) as ExportRow | undefined;
    return row ? rowToExport(row) : null;
  },

  getByProjectId(projectId: string): LibraryExport[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT e.*, p.name as project_name
         FROM exports e
         LEFT JOIN projects p ON e.project_id = p.id
         WHERE e.project_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(projectId) as ExportRow[];
    return rows.map(rowToExport);
  },

  create(data: {
    projectId?: string | null;
    filePath: string;
    duration?: number | null;
    fileSize?: number | null;
    lineCount?: number | null;
  }): LibraryExport {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO exports (id, project_id, file_path, duration, file_size, line_count)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.projectId ?? null,
      data.filePath,
      data.duration ?? null,
      data.fileSize ?? null,
      data.lineCount ?? null
    );

    return this.getById(id)!;
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM exports WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteByProjectId(projectId: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM exports WHERE project_id = ?').run(projectId);
    return result.changes;
  },
};
