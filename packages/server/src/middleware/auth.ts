/**
 * Skeletonized authentication middleware.
 *
 * In production this would:
 * 1. Validate a JWT from the Authorization header
 * 2. Extract org_id and user ID from the token claims
 * 3. Reject requests with invalid/expired tokens
 *
 * For this skeleton, we accept mock header-based auth:
 * - X-Org-ID: the organization ID
 * - X-User-ID: the user ID
 * - X-User-Role: admin | member | viewer
 *
 * This lets us test organization isolation without implementing full auth.
 */

import { createMiddleware } from "hono/factory";
import type { AuthContext } from "@recipe-mgmt/shared";

export type AuthEnv = {
  Variables: {
    auth: AuthContext;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const orgId = c.req.header("X-Org-ID");
  const userId = c.req.header("X-User-ID");
  const role = c.req.header("X-User-Role") as AuthContext["role"] | undefined;

  if (!orgId || !userId) {
    return c.json(
      { error: "Authentication required", message: "Missing organization or user credentials" },
      401
    );
  }

  if (role && !["admin", "member", "viewer"].includes(role)) {
    return c.json(
      { error: "Invalid role", message: "Role must be admin, member, or viewer" },
      400
    );
  }

  c.set("auth", {
    orgId,
    userId,
    role: role ?? "viewer",
  });

  await next();
});
