import type { RecipeSummary } from "@recipe-mgmt/shared";

interface RecipeCardProps {
  recipe: RecipeSummary;
  onSelect: (id: string) => void;
}

/**
 * Recipe card — display only, no destructive actions.
 * Delete is intentionally in the detail view to prevent accidental
 * taps in a kitchen environment.
 */
export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  return (
    <div
      className="recipe-card"
      onClick={() => onSelect(recipe.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(recipe.id); }}
      role="button"
      tabIndex={0}
    >
      <div className="recipe-card-header">
        <h2 className="recipe-card-title">{recipe.name}</h2>
        <span className="recipe-card-yield">
          {recipe.yieldAmount} {recipe.yieldUnit}
        </span>
      </div>
      {recipe.description && (
        <p className="recipe-card-desc">{recipe.description}</p>
      )}
      <div className="recipe-card-meta">
        <span>{recipe.ingredientCount} ingredients</span>
        <span>{recipe.stepCount} steps</span>
      </div>
    </div>
  );
}
