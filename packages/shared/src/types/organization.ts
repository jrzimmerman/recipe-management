/**
 * Multi-tenancy types.
 *
 * An "Organization" represents a business customer (restaurant) in our
 * multi-tenant architecture. Each organization has isolated data — competing
 * restaurants cannot see each other's recipes, users, or settings.
 */

export interface Organization {
  id: string;
  /** URL-friendly slug, unique across the system */
  name: string;
  /** Human-readable name shown in UI */
  displayName: string;
  /** Extensible JSON metadata (plan tier, feature flags, branding, etc.) */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Soft delete tombstone — null means active */
  deletedAt: string | null;
}

/** Generic RBAC roles. Domain-specific permissions are derived in the service layer. */
export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: string;
  /** Organization this user belongs to */
  orgId: string;
  email: string;
  name: string;
  /** Profile image URL */
  picture: string | null;
  role: UserRole;
  /** Extensible JSON metadata (preferences, external IDs, etc.) */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Auth context resolved from the (skeletonized) auth middleware.
 * Every request handler receives this — it's the organization boundary.
 */
export interface AuthContext {
  userId: string;
  /** Organization ID — scopes all data access */
  orgId: string;
  role: UserRole;
}
