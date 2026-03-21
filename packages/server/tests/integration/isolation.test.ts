import { describe, test, expect, beforeEach } from "bun:test";
import {
  createTestContext,
  seedOrg,
  authHeaders,
  validRecipeInput,
  type TestContext,
} from "../helpers";

/**
 * Organization isolation tests.
 * These verify that competing restaurants cannot see, modify,
 * or delete each other's recipes. Critical for multi-tenancy.
 */
describe("Organization Isolation", () => {
  let ctx: TestContext;
  let orgA: { orgId: string; userId: string };
  let orgB: { orgId: string; userId: string };
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;

  beforeEach(async () => {
    ctx = createTestContext();
    orgA = seedOrg(ctx.db, "Bowl and Soul");
    orgB = seedOrg(ctx.db, "Green Machine");
    headersA = authHeaders(orgA.orgId, orgA.userId);
    headersB = authHeaders(orgB.orgId, orgB.userId);

    // Each organization creates a recipe
    await ctx.app.request("/api/recipes", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify(validRecipeInput({ name: "Secret Bowl A" })),
    });

    await ctx.app.request("/api/recipes", {
      method: "POST",
      headers: headersB,
      body: JSON.stringify(validRecipeInput({ name: "Secret Bowl B" })),
    });
  });

  test("org A cannot list org B recipes", async () => {
    const res = await ctx.app.request("/api/recipes", { headers: headersA });
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Secret Bowl A");
    // Must NOT contain org B's recipe
    const names = body.data.map((r: { name: string }) => r.name);
    expect(names).not.toContain("Secret Bowl B");
  });

  test("org B cannot list org A recipes", async () => {
    const res = await ctx.app.request("/api/recipes", { headers: headersB });
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Secret Bowl B");
  });

  test("org A cannot read org B recipe by ID", async () => {
    // Get org B's recipe ID
    const listRes = await ctx.app.request("/api/recipes", {
      headers: headersB,
    });
    const { data } = await listRes.json();
    const recipeBId = data[0].id;

    // Org A tries to access it — should get 404 (not 403, to avoid leaking existence)
    const res = await ctx.app.request(`/api/recipes/${recipeBId}`, {
      headers: headersA,
    });

    expect(res.status).toBe(404);
  });

  test("org A cannot update org B recipe", async () => {
    const listRes = await ctx.app.request("/api/recipes", {
      headers: headersB,
    });
    const { data } = await listRes.json();
    const recipeBId = data[0].id;

    const res = await ctx.app.request(`/api/recipes/${recipeBId}`, {
      method: "PUT",
      headers: headersA,
      body: JSON.stringify({ name: "Hijacked!" }),
    });

    expect(res.status).toBe(404);

    // Verify org B's recipe is unchanged
    const verifyRes = await ctx.app.request(`/api/recipes/${recipeBId}`, {
      headers: headersB,
    });
    const verifyBody = await verifyRes.json();
    expect(verifyBody.data.name).toBe("Secret Bowl B");
  });

  test("org A cannot delete org B recipe", async () => {
    const listRes = await ctx.app.request("/api/recipes", {
      headers: headersB,
    });
    const { data } = await listRes.json();
    const recipeBId = data[0].id;

    const res = await ctx.app.request(`/api/recipes/${recipeBId}`, {
      method: "DELETE",
      headers: headersA,
    });

    expect(res.status).toBe(404);

    // Verify org B's recipe still exists
    const verifyRes = await ctx.app.request(`/api/recipes/${recipeBId}`, {
      headers: headersB,
    });
    expect(verifyRes.status).toBe(200);
  });

  test("org A search does not return org B recipes", async () => {
    const res = await ctx.app.request("/api/recipes/search?q=Secret", {
      headers: headersA,
    });
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Secret Bowl A");
  });

  test("same recipe name allowed across different organizations", async () => {
    // Org B creates a recipe with the same name as org A
    const res = await ctx.app.request("/api/recipes", {
      method: "POST",
      headers: headersB,
      body: JSON.stringify(validRecipeInput({ name: "Secret Bowl A" })),
    });

    // Should succeed — name uniqueness is per-organization, not global
    expect(res.status).toBe(201);
  });
});
