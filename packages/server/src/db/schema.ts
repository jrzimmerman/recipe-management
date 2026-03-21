/**
 * SQLite schema initialization.
 * Uses bun:sqlite directly — no ORM overhead.
 *
 * Design decisions:
 * - "organizations" — industry-standard multi-tenancy terminology
 * - org_id on every org-scoped table for row-level isolation
 * - Composite indexes on (org_id, ...) for scoped queries
 * - Partial indexes with WHERE deleted_at IS NULL for soft-delete queries
 * - CASCADE deletes on recipe children (ingredients, instructions)
 * - TEXT for IDs (UUIDs) — simple, no integer collision across organizations
 * - WAL mode for concurrent read performance
 * - Consistent meta fields: all tables get id, created_at, updated_at
 * - Top-level entities get deleted_at (soft delete) and metadata (validated JSON)
 * - JSON metadata validated via CHECK (json_valid(metadata))
 */

import { Database } from "bun:sqlite";

const SCHEMA_SQL = `
  -- Enable WAL mode for better concurrent read performance
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS organizations (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    metadata     TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at   TEXT DEFAULT NULL,
    CHECK (json_valid(metadata))
  );

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    picture     TEXT,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    metadata    TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at  TEXT DEFAULT NULL,
    UNIQUE(org_id, email),
    CHECK (json_valid(metadata))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id           TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    yield_amount REAL NOT NULL CHECK (yield_amount > 0),
    yield_unit   TEXT NOT NULL CHECK (yield_unit IN ('g', 'kg', 'mL', 'L', 'servings', 'pieces')),
    created_by   TEXT NOT NULL REFERENCES users(id),
    metadata     TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at   TEXT DEFAULT NULL,
    UNIQUE(org_id, name),
    CHECK (json_valid(metadata))
  );

  CREATE INDEX IF NOT EXISTS idx_recipes_org
    ON recipes(org_id) WHERE deleted_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_recipes_org_name
    ON recipes(org_id, name) WHERE deleted_at IS NULL;

  CREATE TABLE IF NOT EXISTS ingredients (
    id          TEXT PRIMARY KEY,
    recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    quantity    REAL NOT NULL CHECK (quantity > 0),
    unit        TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'mL', 'L', 'each')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ingredients_recipe
    ON ingredients(recipe_id);

  CREATE TABLE IF NOT EXISTS instructions (
    id               TEXT PRIMARY KEY,
    recipe_id        TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number      INTEGER NOT NULL CHECK (step_number > 0),
    description      TEXT NOT NULL,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_instructions_recipe
    ON instructions(recipe_id);
`;

export function initializeSchema(db: Database): void {
  db.exec(SCHEMA_SQL);
}
