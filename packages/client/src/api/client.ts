/**
 * Typed API client for the recipe management server.
 * Thin wrapper around fetch — organization-aware via session headers.
 */

import type {
  RecipeDetail,
  RecipeSummary,
  CreateRecipeInput,
  UpdateRecipeInput,
  UserRole,
} from "@recipe-mgmt/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface ApiResponse<T> {
  data: T;
}

interface ApiError {
  error: string;
  details?: unknown;
}

// ─── Session Management ────────────────────────────────────

export interface Session {
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  role: UserRole;
}

const STORAGE_KEY = "recipe-mgmt-session";

export function getSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function setSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── API Client ────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const session = getSession();
  if (!session) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    "X-Org-ID": session.orgId,
    "X-User-ID": session.userId,
    "X-User-Role": session.role,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({
      error: `HTTP ${res.status}`,
    }));
    throw new Error(body.error);
  }

  const body: ApiResponse<T> = await res.json();
  return body.data;
}

export const api = {
  recipes: {
    list(limit = 50, offset = 0): Promise<RecipeSummary[]> {
      return request(`/recipes?limit=${limit}&offset=${offset}`);
    },

    get(id: string): Promise<RecipeDetail> {
      return request(`/recipes/${id}`);
    },

    search(query: string, limit = 50): Promise<RecipeSummary[]> {
      return request(
        `/recipes/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
    },

    create(input: CreateRecipeInput): Promise<RecipeDetail> {
      return request("/recipes", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    update(id: string, input: UpdateRecipeInput): Promise<RecipeDetail> {
      return request(`/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },

    delete(id: string): Promise<{ deleted: true }> {
      return request(`/recipes/${id}`, { method: "DELETE" });
    },
  },
};
