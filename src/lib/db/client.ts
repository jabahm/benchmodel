import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import * as schema from './schema';

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:')) return url.slice('file:'.length);
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    return `${homedir()}/.benchmodel/data.db`;
  }
  return './data.db';
}

const dbPath = resolveDbPath();
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Idempotent schema bootstrap: applies the baseline migration if tables are missing.
function ensureSchema(): void {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='providers'")
    .get();
  if (row) return;
  const migrationPath = resolve(process.cwd(), 'drizzle', '0000_init.sql');
  if (!existsSync(migrationPath)) return;
  const sqlText = readFileSync(migrationPath, 'utf8');
  const statements = sqlText
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  const tx = sqlite.transaction(() => {
    for (const stmt of statements) sqlite.exec(stmt);
  });
  tx();
}

ensureSchema();

function ensureColumn(table: string, column: string, definition: string): void {
  try {
    const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (cols.some((c) => c.name === column)) return;
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // table missing or column conflict, ignore
  }
}

ensureColumn('prompts', 'default_provider_id', 'text');
ensureColumn('prompts', 'default_model', 'text');

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
