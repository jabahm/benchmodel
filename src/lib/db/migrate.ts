import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:')) return url.slice('file:'.length);
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    return `${homedir()}/.benchmodel/data.db`;
  }
  return './data.db';
}

export function runMigrations(): void {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  const migrationsFolder = resolve(process.cwd(), 'drizzle');
  migrate(db, { migrationsFolder });
  sqlite.close();
}

if (require.main === module) {
  runMigrations();
  // eslint-disable-next-line no-console
  console.log('migrations complete');
}
