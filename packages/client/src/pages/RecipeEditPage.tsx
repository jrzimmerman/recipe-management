import { RecipeForm } from "../components/RecipeForm";
import type {
  RecipeDetail,
  CreateRecipeInput,
  UpdateRecipeInput,
  Ingredient,
  Instruction,
} from "@recipe-mgmt/shared";

interface RecipeEditPageProps {
  recipe: RecipeDetail;
  onSubmit: (data: CreateRecipeInput | UpdateRecipeInput) => void;
  onCancel: () => void;
}

export function RecipeEditPage({
  recipe,
  onSubmit,
  onCancel,
}: RecipeEditPageProps) {
  return (
    <div className="form-page">
      <h1>Edit: {recipe.name}</h1>
      <RecipeForm
        initial={{
          name: recipe.name,
          description: recipe.description,
          yieldAmount: recipe.yieldAmount,
          yieldUnit: recipe.yieldUnit,
          ingredients: recipe.ingredients.map((ing: Ingredient) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            sortOrder: ing.sortOrder,
            notes: ing.notes,
          })),
          instructions: recipe.instructions.map((inst: Instruction) => ({
            stepNumber: inst.stepNumber,
            description: inst.description,
            durationSeconds: inst.durationSeconds,
          })),
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Save Changes"
      />
    </div>
  );
}
