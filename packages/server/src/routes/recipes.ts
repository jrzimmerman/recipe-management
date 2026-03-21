/**
 * Recipe API routes.
 * All routes are organization-scoped via the auth middleware.
 * Validation happens at the route level via Zod schemas.
 */

import { Hono } from "hono";
import {
  CreateRecipeSchema,
  UpdateRecipeSchema,
  SearchQuerySchema,
  ListQuerySchema,
} from "@recipe-mgmt/shared";
import { RecipeService } from "../services/recipe";
import type { AuthEnv } from "../middleware/auth";

export function createRecipeRoutes(service: RecipeService) {
  const recipes = new Hono<AuthEnv>();

  /** GET /api/recipes — list recipes for this organization */
  recipes.get("/", (c) => {
    const auth = c.get("auth");
    const parsed = ListQuerySchema.safeParse({
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    });

    if (!parsed.success) {
      return c.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        400
      );
    }

    const result = service.listRecipes(
      auth.orgId,
      parsed.data.limit,
      parsed.data.offset
    );

    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400);
    }
    return c.json({ data: result.data });
  });

  /** GET /api/recipes/search?q=... — search recipes */
  recipes.get("/search", (c) => {
    const auth = c.get("auth");
    const parsed = SearchQuerySchema.safeParse({
      q: c.req.query("q"),
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    });

    if (!parsed.success) {
      return c.json(
        { error: "Invalid search parameters", details: parsed.error.flatten() },
        400
      );
    }

    const result = service.searchRecipes(
      auth.orgId,
      parsed.data.q,
      parsed.data.limit,
      parsed.data.offset
    );

    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400);
    }
    return c.json({ data: result.data });
  });

  /** GET /api/recipes/:id — get recipe detail */
  recipes.get("/:id", (c) => {
    const auth = c.get("auth");
    const recipeId = c.req.param("id");

    const result = service.getRecipe(auth.orgId, recipeId);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 404);
    }
    return c.json({ data: result.data });
  });

  /** POST /api/recipes — create a new recipe */
  recipes.post("/", async (c) => {
    const auth = c.get("auth");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = CreateRecipeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        400
      );
    }

    const result = service.createRecipe(
      auth.orgId,
      auth.userId,
      parsed.data
    );

    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 409);
    }
    return c.json({ data: result.data }, 201);
  });

  /** PUT /api/recipes/:id — update a recipe */
  recipes.put("/:id", async (c) => {
    const auth = c.get("auth");
    const recipeId = c.req.param("id");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = UpdateRecipeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        400
      );
    }

    const result = service.updateRecipe(auth.orgId, recipeId, parsed.data);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 404);
    }
    return c.json({ data: result.data });
  });

  /** DELETE /api/recipes/:id — delete a recipe */
  recipes.delete("/:id", (c) => {
    const auth = c.get("auth");
    const recipeId = c.req.param("id");

    const result = service.deleteRecipe(auth.orgId, recipeId);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 404);
    }
    return c.json({ data: result.data });
  });

  return recipes;
}
