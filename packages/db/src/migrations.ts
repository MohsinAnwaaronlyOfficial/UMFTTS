import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Settings table (singleton)
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          api_key TEXT,
          default_output_format TEXT DEFAULT 'mp3',
          default_model_id TEXT DEFAULT 'eleven_multilingual_v2',
          default_voice_id TEXT,
          default_delay_ms INTEGER DEFAULT 500,
          default_concurrency INTEGER DEFAULT 3,
          default_stability REAL DEFAULT 0.5,
          default_similarity_boost REAL DEFAULT 0.75,
          default_style REAL DEFAULT 0,
          default_use_speaker_boost INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Insert default settings
        INSERT OR IGNORE INTO settings (id) VALUES (1);
      `);

      // Voice presets table
      db.exec(`
        CREATE TABLE IF NOT EXISTS voice_presets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          preset_id INTEGER NOT NULL UNIQUE CHECK (preset_id >= 1 AND preset_id <= 10),
          name TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          model_id TEXT DEFAULT 'eleven_multilingual_v2',
          stability REAL DEFAULT 0.5,
          similarity_boost REAL DEFAULT 0.75,
          style REAL DEFAULT 0,
          use_speaker_boost INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_voice_presets_preset_id ON voice_presets(preset_id);
      `);

      // Projects table
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          raw_text TEXT NOT NULL,
          input_type TEXT DEFAULT 'text',
          status TEXT DEFAULT 'draft',
          total_lines INTEGER DEFAULT 0,
          completed_lines INTEGER DEFAULT 0,
          failed_lines INTEGER DEFAULT 0,
          merged_file_path TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
      `);

      // Project lines table
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_lines (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          line_no INTEGER NOT NULL,
          text TEXT NOT NULL,
          preset_id INTEGER,
          status TEXT DEFAULT 'pending',
          error TEXT,
          clip_path TEXT,
          duration REAL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(project_id, line_no)
        );

        CREATE INDEX IF NOT EXISTS idx_project_lines_project_id ON project_lines(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_lines_status ON project_lines(status);
      `);

      // Exports table (for tracking merged audio files)
      db.exec(`
        CREATE TABLE IF NOT EXISTS exports (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          file_path TEXT NOT NULL,
          duration REAL,
          file_size INTEGER,
          line_count INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);
        CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at);
      `);

      // Cloned voices tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS cloned_voices (
          id TEXT PRIMARY KEY,
          voice_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // Migrations tracking table
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT DEFAULT (datetime('now'))
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = db
    .prepare('SELECT version FROM migrations ORDER BY version')
    .all() as { version: number }[];
  const appliedSet = new Set(appliedVersions.map((m) => m.version));

  for (const migration of migrations) {
    if (!appliedSet.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        );
      })();

      console.log(`Migration ${migration.version} completed`);
    }
  }
}
