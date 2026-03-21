import { describe, test, expect, beforeEach } from "bun:test";
import {
  createTestContext,
  seedOrg,
  authHeaders,
  validRecipeInput,
  type TestContext,
} from "../helpers";

describe("Recipe API", () => {
  let ctx: TestContext;
  let orgId: string;
  let userId: string;
  let headers: Record<string, string>;

  beforeEach(() => {
    ctx = createTestContext();
    const org = seedOrg(ctx.db, "Test Kitchen");
    orgId = org.orgId;
    userId = org.userId;
    headers = authHeaders(orgId, userId);
  });

  // ─── Authentication ────────────────────────────────────────

  describe("authentication", () => {
    test("returns 401 without auth headers", async () => {
      const res = await ctx.app.request("/api/recipes");
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Authentication required");
    });

    test("returns 401 with missing org ID", async () => {
      const res = await ctx.app.request("/api/recipes", {
        headers: { "X-User-ID": userId },
      });
      expect(res.status).toBe(401);
    });

    test("returns 401 with missing user ID", async () => {
      const res = await ctx.app.request("/api/recipes", {
        headers: { "X-Org-ID": orgId },
      });
      expect(res.status).toBe(401);
    });

    test("health endpoint does not require auth", async () => {
      const res = await ctx.app.request("/api/health");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    });
  });

  // ─── CREATE ────────────────────────────────────────────────

  describe("POST /api/recipes", () => {
    test("creates a recipe with valid input", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.name).toBe("Test Bowl");
      expect(body.data.ingredients).toHaveLength(3);
      expect(body.data.instructions).toHaveLength(3);
      expect(body.data.orgId).toBe(orgId);
      expect(body.data.yieldAmount).toBe(400);
      expect(body.data.yieldUnit).toBe("g");
    });

    test("rejects recipe with no ingredients", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ ingredients: [] })),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    test("rejects recipe with no instructions", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ instructions: [] })),
      });

      expect(res.status).toBe(400);
    });

    test("rejects recipe with empty name", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ name: "" })),
      });

      expect(res.status).toBe(400);
    });

    test("rejects recipe with invalid measurement unit", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(
          validRecipeInput({
            ingredients: [
              { name: "Salt", quantity: 1, unit: "pinch" }, // Not allowed
            ],
          })
        ),
      });

      expect(res.status).toBe(400);
    });

    test("rejects recipe with negative quantity", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(
          validRecipeInput({
            ingredients: [{ name: "Rice", quantity: -100, unit: "g" }],
          })
        ),
      });

      expect(res.status).toBe(400);
    });

    test("rejects recipe with zero yield", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ yieldAmount: 0 })),
      });

      expect(res.status).toBe(400);
    });

    test("rejects duplicate recipe name within same organization", async () => {
      // Create first recipe
      await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });

      // Attempt duplicate
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("already exists");
    });

    test("rejects invalid JSON body", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "not json",
      });

      expect(res.status).toBe(400);
    });

    test("preserves ingredient sort order", async () => {
      const res = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });

      const body = await res.json();
      expect(body.data.ingredients[0].name).toBe("Rice");
      expect(body.data.ingredients[1].name).toBe("Chicken");
      expect(body.data.ingredients[2].name).toBe("Sauce");
      expect(body.data.ingredients[0].sortOrder).toBe(0);
      expect(body.data.ingredients[1].sortOrder).toBe(1);
      expect(body.data.ingredients[2].sortOrder).toBe(2);
    });
  });

  // ─── READ ──────────────────────────────────────────────────

  describe("GET /api/recipes", () => {
    test("returns empty list for new organization", async () => {
      const res = await ctx.app.request("/api/recipes", { headers });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
    });

    test("returns recipe summaries with counts", async () => {
      await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });

      const res = await ctx.app.request("/api/recipes", { headers });
      const body = await res.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].ingredientCount).toBe(3);
      expect(body.data[0].stepCount).toBe(3);
      // Summary should NOT include full ingredients/instructions
      expect(body.data[0].ingredients).toBeUndefined();
    });
  });

  describe("GET /api/recipes/:id", () => {
    test("returns full recipe detail", async () => {
      const createRes = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });
      const { data: created } = await createRes.json();

      const res = await ctx.app.request(`/api/recipes/${created.id}`, {
        headers,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(created.id);
      expect(body.data.ingredients).toHaveLength(3);
      expect(body.data.instructions).toHaveLength(3);
      expect(body.data.ingredients[0].unit).toBe("g");
      expect(body.data.ingredients[2].unit).toBe("mL");
    });

    test("returns 404 for non-existent recipe", async () => {
      const res = await ctx.app.request("/api/recipes/does-not-exist", {
        headers,
      });

      expect(res.status).toBe(404);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────

  describe("PUT /api/recipes/:id", () => {
    test("updates recipe name", async () => {
      const createRes = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });
      const { data: created } = await createRes.json();

      const res = await ctx.app.request(`/api/recipes/${created.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Bowl" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Bowl");
      // Other fields should be preserved
      expect(body.data.ingredients).toHaveLength(3);
    });

    test("replaces ingredients when provided", async () => {
      const createRes = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });
      const { data: created } = await createRes.json();

      const res = await ctx.app.request(`/api/recipes/${created.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ingredients: [{ name: "Quinoa", quantity: 250, unit: "g" }],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.ingredients).toHaveLength(1);
      expect(body.data.ingredients[0].name).toBe("Quinoa");
    });

    test("returns 404 for non-existent recipe", async () => {
      const res = await ctx.app.request("/api/recipes/does-not-exist", {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Nope" }),
      });

      expect(res.status).toBe(404);
    });

    test("rejects duplicate name on update", async () => {
      // Create two recipes
      await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ name: "Bowl A" })),
      });
      const createRes = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ name: "Bowl B" })),
      });
      const { data: bowlB } = await createRes.json();

      // Try to rename Bowl B to Bowl A
      const res = await ctx.app.request(`/api/recipes/${bowlB.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Bowl A" }),
      });

      expect(res.status).toBe(409);
    });
  });

  // ─── DELETE (soft delete) ──────────────────────────────────

  describe("DELETE /api/recipes/:id", () => {
    test("soft-deletes a recipe", async () => {
      const createRes = await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput()),
      });
      const { data: created } = await createRes.json();

      const res = await ctx.app.request(`/api/recipes/${created.id}`, {
        method: "DELETE",
        headers,
      });

      expect(res.status).toBe(200);

      // Verify it's no longer visible
      const getRes = await ctx.app.request(`/api/recipes/${created.id}`, {
        headers,
      });
      expect(getRes.status).toBe(404);
    });

    test("returns 404 for non-existent recipe", async () => {
      const res = await ctx.app.request("/api/recipes/does-not-exist", {
        method: "DELETE",
        headers,
      });

      expect(res.status).toBe(404);
    });
  });

  // ─── SEARCH ────────────────────────────────────────────────

  describe("GET /api/recipes/search", () => {
    beforeEach(async () => {
      await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ name: "Teriyaki Bowl" })),
      });
      await ctx.app.request("/api/recipes", {
        method: "POST",
        headers,
        body: JSON.stringify(validRecipeInput({ name: "Mediterranean Bowl" })),
      });
    });

    test("searches by recipe name", async () => {
      const res = await ctx.app.request("/api/recipes/search?q=Teriyaki", {
        headers,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Teriyaki Bowl");
    });

    test("searches by ingredient name", async () => {
      const res = await ctx.app.request("/api/recipes/search?q=Chicken", {
        headers,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      // Both recipes have chicken ingredient from validRecipeInput
      expect(body.data.length).toBeGreaterThan(0);
    });

    test("returns empty for no match", async () => {
      const res = await ctx.app.request("/api/recipes/search?q=Sushi", {
        headers,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });

    test("rejects empty search query", async () => {
      const res = await ctx.app.request("/api/recipes/search?q=", { headers });
      expect(res.status).toBe(400);
    });

    test("rejects missing search query", async () => {
      const res = await ctx.app.request("/api/recipes/search", { headers });
      expect(res.status).toBe(400);
    });
  });
});
