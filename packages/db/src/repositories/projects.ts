import { getDatabase } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectLine,
  ProjectLineCreate,
  ProjectWithLines,
} from '@umf-tts/shared';

interface ProjectRow {
  id: string;
  name: string;
  raw_text: string;
  input_type: string;
  status: string;
  total_lines: number;
  completed_lines: number;
  failed_lines: number;
  merged_file_path: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectLineRow {
  id: string;
  project_id: string;
  line_no: number;
  text: string;
  preset_id: number | null;
  status: string;
  error: string | null;
  clip_path: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    rawText: row.raw_text,
    inputType: row.input_type as 'text' | 'srt',
    status: row.status as Project['status'],
    totalLines: row.total_lines,
    completedLines: row.completed_lines,
    failedLines: row.failed_lines,
    mergedFilePath: row.merged_file_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProjectLine(row: ProjectLineRow): ProjectLine {
  return {
    id: row.id,
    projectId: row.project_id,
    lineNo: row.line_no,
    text: row.text,
    presetId: row.preset_id,
    status: row.status as ProjectLine['status'],
    error: row.error ?? undefined,
    clipPath: row.clip_path ?? undefined,
    duration: row.duration ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectsRepository = {
  list(): Project[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM projects ORDER BY created_at DESC')
      .all() as ProjectRow[];
    return rows.map(rowToProject);
  },

  getById(id: string): Project | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
    return row ? rowToProject(row) : null;
  },

  getWithLines(id: string): ProjectWithLines | null {
    const project = this.getById(id);
    if (!project) return null;

    const lines = this.getLines(id);
    return { ...project, lines };
  },

  create(data: ProjectCreate): Project {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO projects (id, name, raw_text, input_type)
       VALUES (?, ?, ?, ?)`
    ).run(id, data.name, data.rawText, data.inputType ?? 'text');

    return this.getById(id)!;
  },

  update(data: ProjectUpdate): Project | null {
    const db = getDatabase();
    const current = this.getById(data.id);
    if (!current) return null;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.rawText !== undefined) {
      updates.push('raw_text = ?');
      params.push(data.rawText);
    }
    if (data.inputType !== undefined) {
      updates.push('input_type = ?');
      params.push(data.inputType);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(data.id);
      const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...params);
    }

    return this.getById(data.id);
  },

  updateStatus(
    id: string,
    status: Project['status'],
    stats?: { totalLines?: number; completedLines?: number; failedLines?: number }
  ): Project | null {
    const db = getDatabase();
    const updates: string[] = ['status = ?'];
    const params: (string | number)[] = [status];

    if (stats?.totalLines !== undefined) {
      updates.push('total_lines = ?');
      params.push(stats.totalLines);
    }
    if (stats?.completedLines !== undefined) {
      updates.push('completed_lines = ?');
      params.push(stats.completedLines);
    }
    if (stats?.failedLines !== undefined) {
      updates.push('failed_lines = ?');
      params.push(stats.failedLines);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  setMergedFilePath(id: string, filePath: string): Project | null {
    const db = getDatabase();
    db.prepare(
      "UPDATE projects SET merged_file_path = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(filePath, id);
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Project Lines methods
  getLines(projectId: string): ProjectLine[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM project_lines WHERE project_id = ? ORDER BY line_no')
      .all(projectId) as ProjectLineRow[];
    return rows.map(rowToProjectLine);
  },

  getLine(id: string): ProjectLine | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM project_lines WHERE id = ?')
      .get(id) as ProjectLineRow | undefined;
    return row ? rowToProjectLine(row) : null;
  },

  createLine(data: ProjectLineCreate): ProjectLine {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO project_lines (id, project_id, line_no, text, preset_id, status, error, clip_path, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.projectId,
      data.lineNo,
      data.text,
      data.presetId,
      data.status ?? 'pending',
      data.error ?? null,
      data.clipPath ?? null,
      data.duration ?? null
    );

    return this.getLine(id)!;
  },

  createLines(lines: ProjectLineCreate[]): ProjectLine[] {
    const db = getDatabase();

    const stmt = db.prepare(
      `INSERT INTO project_lines (id, project_id, line_no, text, preset_id, status, error, clip_path, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const ids: string[] = [];

    db.transaction(() => {
      for (const line of lines) {
        const id = uuidv4();
        ids.push(id);
        stmt.run(
          id,
          line.projectId,
          line.lineNo,
          line.text,
          line.presetId,
          line.status ?? 'pending',
          line.error ?? null,
          line.clipPath ?? null,
          line.duration ?? null
        );
      }
    })();

    return ids.map((id) => this.getLine(id)!);
  },

  updateLine(
    id: string,
    data: Partial<Omit<ProjectLine, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ): ProjectLine | null {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.lineNo !== undefined) {
      updates.push('line_no = ?');
      params.push(data.lineNo);
    }
    if (data.text !== undefined) {
      updates.push('text = ?');
      params.push(data.text);
    }
    if (data.presetId !== undefined) {
      updates.push('preset_id = ?');
      params.push(data.presetId);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.error !== undefined) {
      updates.push('error = ?');
      params.push(data.error ?? null);
    }
    if (data.clipPath !== undefined) {
      updates.push('clip_path = ?');
      params.push(data.clipPath ?? null);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration ?? null);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(id);
      const sql = `UPDATE project_lines SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...params);
    }

    return this.getLine(id);
  },

  deleteLines(projectId: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM project_lines WHERE project_id = ?').run(projectId);
    return result.changes;
  },

  getLinesByStatus(projectId: string, status: ProjectLine['status']): ProjectLine[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM project_lines WHERE project_id = ? AND status = ? ORDER BY line_no')
      .all(projectId, status) as ProjectLineRow[];
    return rows.map(rowToProjectLine);
  },

  getProjectStats(projectId: string): { total: number; completed: number; failed: number; pending: number; processing: number } {
    const db = getDatabase();
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
        FROM project_lines WHERE project_id = ?`
      )
      .get(projectId) as {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        processing: number;
      };
    return stats;
  },
};
