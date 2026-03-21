/**
 * App factory — creates a configured Hono app.
 * Separated from index.ts so tests can create apps with test databases.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { Database } from "bun:sqlite";
import { RecipeRepository } from "./db/repository";
import { RecipeService } from "./services/recipe";
import { authMiddleware } from "./middleware/auth";
import type { AuthEnv } from "./middleware/auth";
import { health } from "./routes/health";
import { createRecipeRoutes } from "./routes/recipes";

export interface AppOptions {
  db: Database;
  /** Disable request logging (useful in tests) */
  silent?: boolean;
  /** Serve static client build (production only) */
  staticDir?: string;
}

export function createApp(options: AppOptions) {
  const app = new Hono<AuthEnv>();

  // Global middleware
  if (!options.silent) {
    app.use("*", logger());
  }
  app.use(
    "*",
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["http://localhost:5173", "http://localhost:3000"],
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
      allowHeaders: [
        "Content-Type",
        "X-Org-ID",
        "X-User-ID",
        "X-User-Role",
      ],
    })
  );

  // Health check — no auth required
  app.route("/api/health", health);

  // All recipe routes require auth
  const repo = new RecipeRepository(options.db);
  const service = new RecipeService(repo);

  const authed = new Hono<AuthEnv>();
  authed.use("*", authMiddleware);
  authed.route("/recipes", createRecipeRoutes(service));

  app.route("/api", authed);

  // In production, serve the built client as static files
  if (options.staticDir) {
    app.use("/*", serveStatic({ root: options.staticDir }));
    // SPA fallback: serve index.html for non-API routes
    app.get("*", serveStatic({ root: options.staticDir, path: "index.html" }));
  }

  // Global error handler
  app.onError((err, c) => {
    console.error("Unhandled error:", err);
    return c.json(
      { error: "Internal server error" },
      500
    );
  });

  // 404 fallback
  app.notFound((c) => {
    return c.json({ error: "Not found" }, 404);
  });

  return app;
}
