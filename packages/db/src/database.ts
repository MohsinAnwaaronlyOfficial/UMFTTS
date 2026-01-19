import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function initDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export { Database };
