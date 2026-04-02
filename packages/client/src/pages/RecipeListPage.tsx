import { SearchBar } from "../components/SearchBar";
import { RecipeList } from "../components/RecipeList";
import type { RecipeSummary, UserRole } from "@recipe-mgmt/shared";

interface RecipeListPageProps {
  recipes: RecipeSummary[];
  loading: boolean;
  error: string | null;
  searchInput: string;
  role: UserRole;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onCreate: () => void;
}

export function RecipeListPage({
  recipes,
  loading,
  error,
  searchInput,
  role,
  onSearchChange,
  onSelect,
  onRetry,
  onCreate,
}: RecipeListPageProps) {
  const canCreate = role === "admin" || role === "member";

  return (
    <>
      <div className="toolbar">
        <SearchBar value={searchInput} onChange={onSearchChange} />
        {canCreate && (
          <button className="btn btn-primary" onClick={onCreate}>
            + New Recipe
          </button>
        )}
      </div>
      <RecipeList
        recipes={recipes}
        loading={loading}
        error={error}
        onSelect={onSelect}
        onRetry={onRetry}
      />
    </>
  );
}
