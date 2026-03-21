/**
 * Server entrypoint.
 * Starts the Hono app on Bun's built-in HTTP server.
 */

import { getDb } from "./db/connection";
import { createApp } from "./app";
import { seed } from "./db/seed";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const DB_PATH = process.env.DB_PATH ?? "recipe-management.db";

const IS_PROD = process.env.NODE_ENV === "production";
// STATIC_DIR is relative to CWD.
const STATIC_DIR = IS_PROD
  ? process.env.STATIC_DIR ?? "packages/client/dist"
  : undefined;

const db = getDb(DB_PATH);

// Seed demo data if the database is empty
seed(db);

const app = createApp({ db, staticDir: STATIC_DIR });

console.log(`Recipe Management API listening on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
