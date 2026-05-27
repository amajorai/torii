import Database from "@tauri-apps/plugin-sql";
import { logger } from "@/lib/logger";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

// Bump this whenever you add a new migration below.
const TARGET_SCHEMA_VERSION = 2;

type MigrationFn = (database: Database) => Promise<void>;

/**
 * SQLite throws on `ALTER TABLE ... ADD COLUMN` when the column already exists.
 * That's intolerable for our bootstrap path: a user on a pre-tracker install
 * may already have any subset of columns/tables but report
 * `user_version = 0`. Every migration step needs to be safely re-runnable.
 *
 * `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` already are.
 * For ADD COLUMN, swallow the specific "duplicate column name" error and
 * rethrow anything else.
 */
export async function safeAddColumn(
  database: Database,
  sql: string
): Promise<void> {
  try {
    await database.execute(sql);
  } catch (err) {
    const msg = String(err).toLowerCase();
    if (msg.includes("duplicate column name")) return;
    throw err;
  }
}

const migrations: Record<number, MigrationFn> = {
  1: async (database) => {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  },
  2: async (database) => {
    // Notes - the primary demo entity for the boilerplate
    await database.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        archivedAt INTEGER,
        archiveFolderId TEXT
      )
    `);
    await database.execute(
      "CREATE INDEX IF NOT EXISTS notes_archivedAt ON notes(archivedAt)"
    );

    // Trash table - stores deleted notes (auto-purged after 30 days)
    await database.execute(`
      CREATE TABLE IF NOT EXISTS trash (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        deletedAt INTEGER NOT NULL,
        originalCreatedAt INTEGER NOT NULL,
        originalUpdatedAt INTEGER NOT NULL
      )
    `);
    await database.execute(
      "CREATE INDEX IF NOT EXISTS trash_deletedAt ON trash(deletedAt)"
    );

    // Archive folders for organizing archived notes
    await database.execute(`
      CREATE TABLE IF NOT EXISTS archive_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        color TEXT
      )
    `);
  },
};

async function runMigrations(database: Database): Promise<void> {
  const rows = await database.select<[{ user_version: number }]>(
    "PRAGMA user_version"
  );
  const current = rows[0]?.user_version ?? 0;

  if (current >= TARGET_SCHEMA_VERSION) return;

  logger.info(
    { from: current, to: TARGET_SCHEMA_VERSION },
    "[DB] Running migrations"
  );

  // Run migrations in a transaction so a partial failure rolls back cleanly.
  // Every migration is idempotent (CREATE IF NOT EXISTS, safeAddColumn) so
  // running them all from current+1 is safe even on a pre-tracker install
  // that already has some tables/columns.
  await database.execute("BEGIN TRANSACTION");
  try {
    for (let v = current + 1; v <= TARGET_SCHEMA_VERSION; v++) {
      const fn = migrations[v];
      if (fn) {
        logger.info({ version: v }, "[DB] Applying migration");
        await fn(database);
      }
      await database.execute(`PRAGMA user_version = ${v}`);
    }
    await database.execute("COMMIT");
  } catch (err) {
    await database.execute("ROLLBACK");
    logger.error({ err }, "[DB] Migration failed, rolled back");
    throw err;
  }
}

async function initDb(): Promise<Database> {
  logger.info("[DB] Initializing shared database...");
  const database = await Database.load("sqlite:app.db");
  logger.info("[DB] Database connection established");

  try {
    await database.execute("PRAGMA journal_mode=WAL;");
    await database.execute("PRAGMA synchronous=NORMAL;");
    await runMigrations(database);
  } catch (err) {
    // Close the handle so we don't leak it, and clear the cached promise so a
    // subsequent getDb() call gets a fresh attempt rather than re-awaiting a
    // permanently-rejected promise.
    try {
      await database.close();
    } catch {
      // ignore close errors during cleanup
    }
    dbInitPromise = null;
    throw err;
  }

  logger.info("[DB] Ready");
  return database;
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (!dbInitPromise) dbInitPromise = initDb();
  db = await dbInitPromise;
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    dbInitPromise = null;
  }
}

/** Returns the SQLite `PRAGMA user_version` — the current schema version. */
export async function getSqliteSchemaVersion(): Promise<number> {
  const database = await getDb();
  const rows = await database.select<[{ user_version: number }]>(
    "PRAGMA user_version"
  );
  return rows[0]?.user_version ?? 0;
}
