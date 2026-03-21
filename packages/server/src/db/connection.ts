/**
 * Database connection management.
 * Single SQLite file — appropriate for <10K requests/day and <1K recipes.
 */

import { Database } from "bun:sqlite";
import { initializeSchema } from "./schema";

let db: Database | null = null;

export function getDb(dbPath: string = "recipe-management.db"): Database {
  if (!db) {
    db = new Database(dbPath, { create: true });
    initializeSchema(db);
  }
  return db;
}

/**
 * Create an in-memory database for testing.
 * Each test gets a fresh, isolated database.
 */
export function createTestDb(): Database {
  const testDb = new Database(":memory:");
  initializeSchema(testDb);
  return testDb;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
