import { RecipeForm } from "../components/RecipeForm";
import type { CreateRecipeInput } from "@recipe-mgmt/shared";

interface RecipeCreatePageProps {
  onSubmit: (data: CreateRecipeInput) => void;
  onCancel: () => void;
}

export function RecipeCreatePage({ onSubmit, onCancel }: RecipeCreatePageProps) {
  return (
    <div className="form-page">
      <h1>New Recipe</h1>
      <RecipeForm onSubmit={onSubmit} onCancel={onCancel} />
    </div>
  );
}
