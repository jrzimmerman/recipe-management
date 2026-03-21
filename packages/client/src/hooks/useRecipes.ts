/**
 * Recipe data hooks powered by TanStack Query.
 *
 * Benefits over manual useState/useEffect:
 * - Automatic cache invalidation after mutations (no manual refresh() calls)
 * - Loading/error states managed by the library
 * - Stale-while-revalidate for instant back-navigation
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, getSession } from "../api/client";
import type { CreateRecipeInput, UpdateRecipeInput } from "@recipe-mgmt/shared";

// ─── Query Keys ────────────────────────────────────────────
// Centralized keys enable precise cache invalidation.
// Scoped by orgId so switching organizations invalidates correctly.

export const recipeKeys = {
  all: (orgId: string) => ["recipes", orgId] as const,
  list: (orgId: string) => [...recipeKeys.all(orgId), "list"] as const,
  search: (orgId: string, q: string) =>
    [...recipeKeys.all(orgId), "search", q] as const,
  detail: (orgId: string, id: string) =>
    [...recipeKeys.all(orgId), "detail", id] as const,
};

// ─── Queries ───────────────────────────────────────────────

/** List or search recipes depending on whether a search query is provided. */
export function useRecipes(searchQuery: string = "") {
  const orgId = getSession()?.orgId ?? "";
  const isSearching = searchQuery.trim().length > 0;

  return useQuery({
    queryKey: isSearching
      ? recipeKeys.search(orgId, searchQuery)
      : recipeKeys.list(orgId),
    queryFn: () =>
      isSearching
        ? api.recipes.search(searchQuery)
        : api.recipes.list(),
  });
}

/** Fetch a single recipe's full detail. */
export function useRecipe(id: string | null) {
  const orgId = getSession()?.orgId ?? "";

  return useQuery({
    queryKey: recipeKeys.detail(orgId, id ?? ""),
    queryFn: () => api.recipes.get(id!),
    enabled: !!id,
  });
}

// ─── Mutations ─────────────────────────────────────────────
// Each mutation invalidates the org-level recipe cache on success,
// so all mounted queries (list, search, detail) refetch automatically.

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const orgId = getSession()?.orgId ?? "";

  return useMutation({
    mutationFn: (input: CreateRecipeInput) => api.recipes.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all(orgId) });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  const orgId = getSession()?.orgId ?? "";

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) =>
      api.recipes.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all(orgId) });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  const orgId = getSession()?.orgId ?? "";

  return useMutation({
    mutationFn: (id: string) => api.recipes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all(orgId) });
    },
  });
}
