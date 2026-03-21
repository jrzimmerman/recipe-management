/**
 * Test helpers — creates an isolated app + DB per test suite.
 * Each test gets a fresh in-memory SQLite database.
 */

import { Database } from "bun:sqlite";
import { createApp } from "../src/app";
import { initializeSchema } from "../src/db/schema";

export interface TestContext {
  app: ReturnType<typeof createApp>;
  db: Database;
}

/** Create a fresh test app with an in-memory database */
export function createTestContext(): TestContext {
  const db = new Database(":memory:");
  initializeSchema(db);
  const app = createApp({ db, silent: true });
  return { app, db };
}

/** Seed an organization + user into the test database. Returns the IDs. */
export function seedOrg(
  db: Database,
  orgName: string
): { orgId: string; userId: string } {
  const orgId = `org-${orgName.toLowerCase().replace(/\s+/g, "-")}`;
  const userId = `user-${orgName.toLowerCase().replace(/\s+/g, "-")}`;

  db.prepare(
    `INSERT INTO organizations (id, name, display_name) VALUES (?1, ?2, ?3)`
  ).run(orgId, orgName.toLowerCase().replace(/\s+/g, "-"), orgName);

  db.prepare(
    `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
  ).run(userId, orgId, `admin@${orgId}.com`, `Admin ${orgName}`, "admin");

  return { orgId, userId };
}

/** Auth headers for a given organization/user */
export function authHeaders(orgId: string, userId: string) {
  return {
    "X-Org-ID": orgId,
    "X-User-ID": userId,
    "Content-Type": "application/json",
  };
}

/** A valid recipe creation payload for testing */
export function validRecipeInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Bowl",
    description: "A test recipe",
    yieldAmount: 400,
    yieldUnit: "g",
    ingredients: [
      { name: "Rice", quantity: 200, unit: "g" },
      { name: "Chicken", quantity: 150, unit: "g" },
      { name: "Sauce", quantity: 30, unit: "mL" },
    ],
    instructions: [
      { stepNumber: 1, description: "Cook rice", durationSeconds: 60 },
      { stepNumber: 2, description: "Grill chicken", durationSeconds: 120 },
      { stepNumber: 3, description: "Assemble bowl" },
    ],
    ...overrides,
  };
}
