import type { RecipeDetail as RecipeDetailType, UserRole } from "@recipe-mgmt/shared";

interface RecipeDetailProps {
  recipe: RecipeDetailType;
  role: UserRole;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Full recipe detail view — designed for kitchen readability.
 * Large text, clear sections, precise measurements.
 * Delete and Edit buttons are RBAC-gated.
 */
export function RecipeDetail({
  recipe,
  role,
  onBack,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  const canEdit = role === "admin" || role === "member";
  const canDelete = role === "admin";

  return (
    <div className="recipe-detail">
      <div className="recipe-detail-header">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <div className="recipe-detail-actions">
          {canEdit && (
            <button className="btn btn-primary" onClick={onEdit}>
              Edit
            </button>
          )}
          {canDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      <h1 className="recipe-detail-title">{recipe.name}</h1>
      {recipe.description && (
        <p className="recipe-detail-desc">{recipe.description}</p>
      )}

      <div className="recipe-detail-yield">
        Yield: <strong>{recipe.yieldAmount} {recipe.yieldUnit}</strong>
      </div>

      <div className="recipe-detail-body">
        <section className="recipe-section">
          <h2>Ingredients</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="ingredient-item">
                <span className="ingredient-qty">
                  {ing.quantity} {ing.unit}
                </span>
                <span className="ingredient-name">{ing.name}</span>
                {ing.notes && (
                  <span className="ingredient-notes">({ing.notes})</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="recipe-section">
          <h2>Instructions</h2>
          <ol className="instruction-list">
            {recipe.instructions.map((inst) => (
              <li key={inst.id} className="instruction-item">
                <span className="instruction-text">{inst.description}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
