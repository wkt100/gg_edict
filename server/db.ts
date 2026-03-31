import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'edict_state.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      status TEXT,
      originalPrompt TEXT,
      metadata TEXT,
      vetoCount INTEGER DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      ministry TEXT,
      description TEXT,
      status TEXT,
      result TEXT,
      createdAt INTEGER,
      updatedAt INTEGER,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      agent TEXT,
      action TEXT,
      content TEXT,
      timestamp INTEGER,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );
  `);

  return db;
}
