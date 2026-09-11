import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_SQL } from "./schema";
import type { ColumnKind, TableSpec } from "./tables";

/* -------------------------------------------------------------------------- */
/*  Connection                                                                */
/* -------------------------------------------------------------------------- */

declare global {
  // Reused across hot reloads in development so we do not leak file handles.
  var __trackerDb: DatabaseSync | undefined;
}

function resolveDatabaseFile(): string {
  const configured = process.env.DATABASE_FILE?.trim();
  const file = configured && configured.length > 0 ? configured : "./data/tracker.db";
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file);
}

function openDatabase(): DatabaseSync {
  const file = resolveDatabaseFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA_SQL);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__trackerDb) {
    globalThis.__trackerDb = openDatabase();
  }
  return globalThis.__trackerDb;
}

/* -------------------------------------------------------------------------- */
/*  Value coercion                                                            */
/* -------------------------------------------------------------------------- */

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue | bigint | Uint8Array>;

function toSql(value: unknown, kind: ColumnKind): SqlValue {
  if (value === null || value === undefined) return null;
  switch (kind) {
    case "bool":
      return value ? 1 : 0;
    case "int": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    default:
      return typeof value === "string" ? value : String(value);
  }
}

function fromSql(value: unknown, kind: ColumnKind): string | number | boolean | null {
  if (value === null || value === undefined) return kind === "bool" ? false : null;
  switch (kind) {
    case "bool":
      return Number(value) !== 0;
    case "int":
      return Number(value);
    default:
      return String(value);
  }
}

/* -------------------------------------------------------------------------- */
/*  Generic mapping helpers                                                   */
/* -------------------------------------------------------------------------- */

/** Convert a SQL row into an entity using the table's column map. */
export function mapRow<T>(spec: TableSpec, row: Row): T {
  const out: Record<string, unknown> = {};
  for (const [field, [column, kind]] of Object.entries(spec.columns)) {
    out[field] = fromSql(row[column], kind);
  }
  return out as T;
}

export function selectAll<T>(spec: TableSpec, orderBy?: string): T[] {
  const suffix = orderBy ? ` ORDER BY ${orderBy}` : "";
  const rows = getDb().prepare(`SELECT * FROM ${spec.table}${suffix}`).all() as Row[];
  return rows.map((row) => mapRow<T>(spec, row));
}

export function selectById<T>(spec: TableSpec, id: string): T | null {
  const row = getDb()
    .prepare(`SELECT * FROM ${spec.table} WHERE ${spec.primaryKey[0]} = ?`)
    .get(id) as Row | undefined;
  return row ? mapRow<T>(spec, row) : null;
}

/** Insert a full entity. Unknown keys are ignored; missing keys become NULL. */
export function insert<T extends Record<string, unknown>>(spec: TableSpec, entity: T): void {
  const fields = Object.keys(spec.columns);
  const columns = fields.map((f) => spec.columns[f][0]);
  const values = fields.map((f) => toSql(entity[f], spec.columns[f][1]));
  const placeholders = columns.map(() => "?").join(", ");
  getDb()
    .prepare(`INSERT INTO ${spec.table} (${columns.join(", ")}) VALUES (${placeholders})`)
    .run(...values);
}

/**
 * Apply a partial update. Returns false when the patch contains no known
 * columns, so callers can distinguish "nothing to do" from "row missing".
 */
export function update(spec: TableSpec, id: string, patch: Record<string, unknown>): boolean {
  const entries = Object.entries(patch).filter(
    ([field]) => field in spec.columns && !spec.primaryKey.includes(spec.columns[field][0]),
  );
  if (entries.length === 0) return false;

  const assignments = entries.map(([field]) => `${spec.columns[field][0]} = ?`);
  const values = entries.map(([field, value]) => toSql(value, spec.columns[field][1]));
  getDb()
    .prepare(`UPDATE ${spec.table} SET ${assignments.join(", ")} WHERE ${spec.primaryKey[0]} = ?`)
    .run(...values, id);
  return true;
}

export function remove(spec: TableSpec, id: string): void {
  getDb().prepare(`DELETE FROM ${spec.table} WHERE ${spec.primaryKey[0]} = ?`).run(id);
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export function getMeta(key: string): string | null {
  const row = getDb().prepare(`SELECT value FROM app_meta WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row ? String(row.value) : null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, new Date().toISOString());
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
