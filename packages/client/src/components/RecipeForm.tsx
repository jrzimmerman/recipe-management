import { useState } from "react";
import { MeasurementUnit, YieldUnit } from "@recipe-mgmt/shared";
import type { CreateRecipeInput, IngredientInput, InstructionInput } from "@recipe-mgmt/shared";

interface RecipeFormProps {
  initial?: Partial<CreateRecipeInput>;
  onSubmit: (data: CreateRecipeInput) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const MEASUREMENT_UNITS = Object.values(MeasurementUnit);
const YIELD_UNITS = Object.values(YieldUnit);

function emptyIngredient(): IngredientInput {
  return { name: "", quantity: 0, unit: "g" };
}

function emptyInstruction(stepNumber: number): InstructionInput {
  return { stepNumber, description: "" };
}

export function RecipeForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Create Recipe",
}: RecipeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [yieldAmount, setYieldAmount] = useState(initial?.yieldAmount ?? 400);
  const [yieldUnit, setYieldUnit] = useState(initial?.yieldUnit ?? "g");
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    initial?.ingredients ?? [emptyIngredient()]
  );
  const [instructions, setInstructions] = useState<InstructionInput[]>(
    initial?.instructions ?? [emptyInstruction(1)]
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client-side checks
    const validIngredients = ingredients.filter((i) => i.name.trim() && i.quantity > 0);
    const validInstructions = instructions.filter((i) => i.description.trim());

    if (!name.trim()) {
      setError("Recipe name is required");
      return;
    }
    if (validIngredients.length === 0) {
      setError("At least one ingredient is required");
      return;
    }
    if (validInstructions.length === 0) {
      setError("At least one instruction is required");
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      yieldAmount,
      yieldUnit,
      ingredients: validIngredients,
      instructions: validInstructions.map((inst, i) => ({
        ...inst,
        stepNumber: i + 1,
      })),
    });
  };

  const addIngredient = () =>
    setIngredients([...ingredients, emptyIngredient()]);

  const removeIngredient = (index: number) =>
    setIngredients(ingredients.filter((_, i) => i !== index));

  const updateIngredient = (index: number, field: string, value: string | number) =>
    setIngredients(
      ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    );

  const addInstruction = () =>
    setInstructions([
      ...instructions,
      emptyInstruction(instructions.length + 1),
    ]);

  const removeInstruction = (index: number) =>
    setInstructions(instructions.filter((_, i) => i !== index));

  const updateInstruction = (index: number, field: string, value: string | number) =>
    setInstructions(
      instructions.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      )
    );

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="recipe-name">Recipe Name</label>
        <input
          id="recipe-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Teriyaki Chicken Bowl"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="recipe-desc">Description</label>
        <textarea
          id="recipe-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the recipe"
          rows={2}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="yield-amount">Yield</label>
          <input
            id="yield-amount"
            type="number"
            value={yieldAmount}
            onChange={(e) => setYieldAmount(parseFloat(e.target.value) || 0)}
            min={0.01}
            step="any"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="yield-unit">Unit</label>
          <select
            id="yield-unit"
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value)}
          >
            {YIELD_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Ingredients</h3>
        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-row">
            <input
              type="text"
              placeholder="Ingredient name"
              value={ing.name}
              onChange={(e) => updateIngredient(i, "name", e.target.value)}
            />
            <input
              type="number"
              placeholder="Qty"
              value={ing.quantity || ""}
              onChange={(e) =>
                updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)
              }
              min={0.01}
              step="any"
              className="qty-input"
            />
            <select
              value={ing.unit}
              onChange={(e) => updateIngredient(i, "unit", e.target.value)}
            >
              {MEASUREMENT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removeIngredient(i)}
              disabled={ingredients.length <= 1}
            >
              X
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredient}>
          + Add Ingredient
        </button>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Instructions</h3>
        {instructions.map((inst, i) => (
          <div key={i} className="instruction-row">
            <span className="step-number">{i + 1}.</span>
            <textarea
              placeholder="Describe this step..."
              value={inst.description}
              onChange={(e) => updateInstruction(i, "description", e.target.value)}
              rows={2}
            />
            <input
              type="number"
              placeholder="Secs"
              value={inst.durationSeconds ?? ""}
              onChange={(e) =>
                updateInstruction(
                  i,
                  "durationSeconds",
                  e.target.value ? parseInt(e.target.value) : 0
                )
              }
              min={0}
              className="duration-input"
              title="Duration in seconds (optional)"
            />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removeInstruction(i)}
              disabled={instructions.length <= 1}
            >
              X
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={addInstruction}
        >
          + Add Step
        </button>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
