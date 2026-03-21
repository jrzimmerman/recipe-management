import type { MeasurementUnit, YieldUnit } from "./units";

/**
 * Core recipe domain types.
 * Designed for a robotics kitchen: every measurement is precise and typed.
 */

export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  /** Numeric quantity — no freeform strings */
  quantity: number;
  /** Strict unit enum — grams, mL, each, etc. */
  unit: MeasurementUnit;
  /** Display order within the recipe */
  sortOrder: number;
  /** Optional preparation notes (e.g., "diced", "room temperature") */
  notes: string | null;
}

export interface Instruction {
  id: string;
  recipeId: string;
  /** 1-indexed step number */
  stepNumber: number;
  /** Human-readable instruction text */
  description: string;
  /** Optional duration in seconds — stored for future order timing support */
  durationSeconds: number | null;
}

export interface Recipe {
  id: string;
  /** Organization this recipe belongs to */
  orgId: string;
  name: string;
  description: string;
  /** How much the recipe produces */
  yieldAmount: number;
  yieldUnit: YieldUnit;
  createdBy: string;
  /** Extensible JSON metadata (tags, allergens, robot parameters, etc.) */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Soft delete tombstone — null means active */
  deletedAt: string | null;
}

/** Full recipe with nested relations — what the API returns for detail views */
export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[];
  instructions: Instruction[];
}

/** Summary for list/card views */
export interface RecipeSummary {
  id: string;
  name: string;
  description: string;
  yieldAmount: number;
  yieldUnit: YieldUnit;
  ingredientCount: number;
  stepCount: number;
  updatedAt: string;
}
