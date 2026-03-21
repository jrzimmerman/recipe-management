import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoginScreen } from "./components/LoginScreen";
import { Layout } from "./components/Layout";
import { SearchBar } from "./components/SearchBar";
import { RecipeList } from "./components/RecipeList";
import { RecipeDetail } from "./components/RecipeDetail";
import { RecipeForm } from "./components/RecipeForm";
import { ConfirmModal } from "./components/ConfirmModal";
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
  Ingredient,
  Instruction,
} from "@recipe-mgmt/shared";

type View = "list" | "detail" | "create" | "edit";

function App() {
  // ─── All hooks must be called unconditionally ────────
  const [session, setSessionState] = useState<Session | null>(getSession);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();

  // Queries — debouncedSearch drives the API call automatically
  const recipesQuery = useRecipes(debouncedSearch);
  const recipeQuery = useRecipe(
    view === "detail" || view === "edit" ? selectedId : null
  );

  // Mutations
  const createMutation = useCreateRecipe();
  const updateMutation = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();

  // ─── Handlers ────────────────────────────────────────

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

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setView("detail");
  }, []);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedId(null);
    setSearchInput("");
  }, []);

  const handleHome = useCallback(() => {
    setView("list");
    setSelectedId(null);
    setSearchInput("");
  }, []);

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

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedId(null);
        setView("list");
      },
      onError: (err: Error) => {
        setShowDeleteModal(false);
        alert(err.message);
      },
    });
  }, [deleteMutation, selectedId]);

  // ─── Gate: no session → login screen ─────────────────
  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ─── RBAC ────────────────────────────────────────────
  const canCreate = session.role === "admin" || session.role === "member";

  // ─── Render ──────────────────────────────────────────
  return (
    <Layout session={session} onHome={handleHome} onSignOut={handleSignOut}>
      {view === "list" && (
        <>
          <div className="toolbar">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
            />
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => setView("create")}
              >
                + New Recipe
              </button>
            )}
          </div>
          <RecipeList
            recipes={recipesQuery.data ?? []}
            loading={recipesQuery.isLoading}
            error={recipesQuery.error?.message ?? null}
            onSelect={handleSelect}
            onRetry={() => recipesQuery.refetch()}
          />
        </>
      )}

      {view === "detail" && recipeQuery.isLoading && (
        <div className="loading">Loading recipe...</div>
      )}

      {view === "detail" && recipeQuery.isError && (
        <div className="error-message">
          <p>Failed to load recipe: {recipeQuery.error.message}</p>
          <button className="btn btn-secondary" onClick={handleBack}>
            Back to recipes
          </button>
        </div>
      )}

      {view === "detail" && !recipeQuery.isLoading && recipeQuery.data && (
        <RecipeDetail
          recipe={recipeQuery.data}
          role={session.role}
          onBack={handleBack}
          onEdit={() => setView("edit")}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {view === "create" && (
        <div className="form-page">
          <h1>New Recipe</h1>
          <RecipeForm onSubmit={handleCreate} onCancel={handleBack} />
        </div>
      )}

      {view === "edit" && recipeQuery.data && (
        <div className="form-page">
          <h1>Edit: {recipeQuery.data.name}</h1>
          <RecipeForm
            initial={{
              name: recipeQuery.data.name,
              description: recipeQuery.data.description,
              yieldAmount: recipeQuery.data.yieldAmount,
              yieldUnit: recipeQuery.data.yieldUnit,
              ingredients: recipeQuery.data.ingredients.map(
                (ing: Ingredient) => ({
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  sortOrder: ing.sortOrder,
                  notes: ing.notes,
                })
              ),
              instructions: recipeQuery.data.instructions.map(
                (inst: Instruction) => ({
                  stepNumber: inst.stepNumber,
                  description: inst.description,
                  durationSeconds: inst.durationSeconds,
                })
              ),
            }}
            onSubmit={handleUpdate}
            onCancel={() => setView("detail")}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {showDeleteModal && recipeQuery.data && (
        <ConfirmModal
          title="Delete Recipe?"
          description={`Are you sure you want to delete "${recipeQuery.data.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </Layout>
  );
}

export default App;
