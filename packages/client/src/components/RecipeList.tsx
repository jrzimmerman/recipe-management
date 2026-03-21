import type { RecipeSummary } from "@recipe-mgmt/shared";
import { RecipeCard } from "./RecipeCard";

interface RecipeListProps {
  recipes: RecipeSummary[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRetry?: () => void;
}

export function RecipeList({
  recipes,
  loading,
  error,
  onSelect,
  onRetry,
}: RecipeListProps) {
  if (loading) {
    return <div className="loading">Loading recipes...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Error: {error}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <p>No recipes found.</p>
        <p>Create your first recipe to get started.</p>
      </div>
    );
  }

  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
