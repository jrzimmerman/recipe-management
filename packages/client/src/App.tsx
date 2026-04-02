import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/Layout";
import { RecipeListPage } from "./pages/RecipeListPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { RecipeCreatePage } from "./pages/RecipeCreatePage";
import { RecipeEditPage } from "./pages/RecipeEditPage";
import {
  useRecipes,
  useRecipe,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from "./hooks/useRecipes";
import { useDebounce } from "./hooks/useDebounce";
import {
  getSession,
  setSession,
  clearSession,
} from "./api/client";
import type { Session } from "./api/client";
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeDetail as RecipeDetailType,
} from "@recipe-mgmt/shared";

type View = "list" | "detail" | "create" | "edit";

function App() {
  // ─── State (all hooks called unconditionally) ────────
  const [session, setSessionState] = useState<Session | null>(getSession);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const queryClient = useQueryClient();

  // ─── Queries & Mutations ─────────────────────────────
  const recipesQuery = useRecipes(debouncedSearch);
  const recipeQuery = useRecipe(
    view === "detail" || view === "edit" ? selectedId : null
  );
  const createMutation = useCreateRecipe();
  const updateMutation = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();

  // ─── Navigation ──────────────────────────────────────
  const handleLogin = useCallback((s: Session) => {
    setSession(s);
    setSessionState(s);
  }, []);

  const handleSignOut = useCallback(() => {
    clearSession();
    setSessionState(null);
    queryClient.clear();
    setView("list");
    setSelectedId(null);
    setSearchInput("");
  }, [queryClient]);

  const handleHome = useCallback(() => {
    setView("list");
    setSelectedId(null);
    setSearchInput("");
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setView("detail");
  }, []);

  // ─── CRUD Handlers ──────────────────────────────────
  const handleCreate = useCallback(
    (data: CreateRecipeInput) => {
      createMutation.mutate(data, {
        onSuccess: (created: RecipeDetailType) => {
          setSelectedId(created.id);
          setView("detail");
        },
        onError: (err: Error) => alert(err.message),
      });
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    (data: CreateRecipeInput | UpdateRecipeInput) => {
      if (!selectedId) return;
      updateMutation.mutate(
        { id: selectedId, input: data },
        {
          onSuccess: () => setView("detail"),
          onError: (err: Error) => alert(err.message),
        }
      );
    },
    [updateMutation, selectedId]
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => {
        setSelectedId(null);
        setView("list");
      },
      onError: (err: Error) => alert(err.message),
    });
  }, [deleteMutation, selectedId]);

  // ─── Auth Gate ───────────────────────────────────────
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ─── Page Router ─────────────────────────────────────
  return (
    <Layout session={session} onHome={handleHome} onSignOut={handleSignOut}>
      {view === "list" && (
        <RecipeListPage
          recipes={recipesQuery.data ?? []}
          loading={recipesQuery.isLoading}
          error={recipesQuery.error?.message ?? null}
          searchInput={searchInput}
          role={session.role}
          onSearchChange={setSearchInput}
          onSelect={handleSelect}
          onRetry={() => recipesQuery.refetch()}
          onCreate={() => setView("create")}
        />
      )}

      {view === "detail" && (
        <RecipeDetailPage
          recipe={recipeQuery.data}
          loading={recipeQuery.isLoading}
          error={recipeQuery.error?.message ?? null}
          role={session.role}
          onBack={handleHome}
          onEdit={() => setView("edit")}
          onDelete={handleDelete}
        />
      )}

      {view === "create" && (
        <RecipeCreatePage
          onSubmit={handleCreate}
          onCancel={handleHome}
        />
      )}

      {view === "edit" && recipeQuery.data && (
        <RecipeEditPage
          recipe={recipeQuery.data}
          onSubmit={handleUpdate}
          onCancel={() => setView("detail")}
        />
      )}
    </Layout>
  );
}

export default App;
