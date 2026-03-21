/**
 * Organization-scoped repository layer.
 * Every query enforces org_id — this is the data isolation boundary.
 * No ORM: thin typed functions over bun:sqlite prepared statements.
 *
 * All read queries include WHERE deleted_at IS NULL for soft-delete support.
 * Timestamps use sqliteNow() for consistency with SQLite's datetime('now') format.
 */

import { Database } from "bun:sqlite";
import type {
  RecipeDetail,
  RecipeSummary,
  Ingredient,
  Instruction,
} from "@recipe-mgmt/shared";
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
} from "@recipe-mgmt/shared";

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Produces timestamps consistent with SQLite's datetime('now') format.
 * JS toISOString() produces "2026-03-21T13:18:05.000Z" but SQLite produces
 * "2026-03-21 13:18:05". This helper ensures consistency for sorting/comparison.
 */
function sqliteNow(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

// ─── Row types (what SQLite returns) ───────────────────────────────

interface RecipeRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  yield_amount: number;
  yield_unit: string;
  created_by: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RecipeSummaryRow extends RecipeRow {
  ingredient_count: number;
  step_count: number;
}

interface IngredientRow {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number;
  unit: string;
  sort_order: number;
  notes: string | null;
}

interface InstructionRow {
  id: string;
  recipe_id: string;
  step_number: number;
  description: string;
  duration_seconds: number | null;
}

// ─── Mappers ───────────────────────────────────────────────────────

function mapRecipeSummary(row: RecipeSummaryRow): RecipeSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    yieldAmount: row.yield_amount,
    yieldUnit: row.yield_unit as RecipeSummary["yieldUnit"],
    ingredientCount: row.ingredient_count,
    stepCount: row.step_count,
    updatedAt: row.updated_at,
  };
}

function mapIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit as Ingredient["unit"],
    sortOrder: row.sort_order,
    notes: row.notes,
  };
}

function mapInstruction(row: InstructionRow): Instruction {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    stepNumber: row.step_number,
    description: row.description,
    durationSeconds: row.duration_seconds,
  };
}

// ─── Repository ────────────────────────────────────────────────────

export class RecipeRepository {
  constructor(private db: Database) {}

  /**
   * Check if a user exists within an organization.
   * Used to validate created_by FK before inserting recipes.
   */
  userExists(orgId: string, userId: string): boolean {
    const stmt = this.db.prepare<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM users WHERE id = ?1 AND org_id = ?2 AND deleted_at IS NULL`
    );
    const result = stmt.get(userId, orgId);
    return (result?.count ?? 0) > 0;
  }

  /**
   * List recipe summaries for an organization, paginated.
   */
  listRecipes(
    orgId: string,
    limit: number = 50,
    offset: number = 0
  ): RecipeSummary[] {
    const stmt = this.db.prepare<RecipeSummaryRow, [string, number, number]>(`
      SELECT
        r.*,
        (SELECT COUNT(*) FROM ingredients i WHERE i.recipe_id = r.id) AS ingredient_count,
        (SELECT COUNT(*) FROM instructions ins WHERE ins.recipe_id = r.id) AS step_count
      FROM recipes r
      WHERE r.org_id = ?1 AND r.deleted_at IS NULL
      ORDER BY r.updated_at DESC
      LIMIT ?2 OFFSET ?3
    `);
    const rows = stmt.all(orgId, limit, offset);
    return rows.map(mapRecipeSummary);
  }

  /**
   * Get full recipe detail by ID, scoped to organization.
   * Returns null if not found, belongs to different org, or is soft-deleted.
   */
  getRecipeById(orgId: string, recipeId: string): RecipeDetail | null {
    const recipeStmt = this.db.prepare<RecipeRow, [string, string]>(`
      SELECT * FROM recipes WHERE id = ?1 AND org_id = ?2 AND deleted_at IS NULL
    `);
    const recipe = recipeStmt.get(recipeId, orgId);
    if (!recipe) return null;

    const ingredientStmt = this.db.prepare<IngredientRow, [string]>(`
      SELECT * FROM ingredients WHERE recipe_id = ?1 ORDER BY sort_order ASC
    `);
    const ingredients = ingredientStmt.all(recipeId).map(mapIngredient);

    const instructionStmt = this.db.prepare<InstructionRow, [string]>(`
      SELECT * FROM instructions WHERE recipe_id = ?1 ORDER BY step_number ASC
    `);
    const instructions = instructionStmt.all(recipeId).map(mapInstruction);

    return {
      id: recipe.id,
      orgId: recipe.org_id,
      name: recipe.name,
      description: recipe.description,
      yieldAmount: recipe.yield_amount,
      yieldUnit: recipe.yield_unit as RecipeDetail["yieldUnit"],
      createdBy: recipe.created_by,
      metadata: JSON.parse(recipe.metadata),
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      deletedAt: recipe.deleted_at,
      ingredients,
      instructions,
    };
  }

  /**
   * Search recipes by name or ingredient name within an organization.
   * Uses LIKE for simplicity — sufficient for <1K recipes.
   */
  searchRecipes(
    orgId: string,
    query: string,
    limit: number = 50,
    offset: number = 0
  ): RecipeSummary[] {
    const pattern = `%${query}%`;
    const stmt = this.db.prepare<
      RecipeSummaryRow,
      [string, string, string, number, number]
    >(`
      SELECT DISTINCT
        r.*,
        (SELECT COUNT(*) FROM ingredients i WHERE i.recipe_id = r.id) AS ingredient_count,
        (SELECT COUNT(*) FROM instructions ins WHERE ins.recipe_id = r.id) AS step_count
      FROM recipes r
      LEFT JOIN ingredients ig ON ig.recipe_id = r.id
      WHERE r.org_id = ?1 AND r.deleted_at IS NULL
        AND (r.name LIKE ?2 OR ig.name LIKE ?3)
      ORDER BY r.updated_at DESC
      LIMIT ?4 OFFSET ?5
    `);
    const rows = stmt.all(orgId, pattern, pattern, limit, offset);
    return rows.map(mapRecipeSummary);
  }

  /**
   * Check if a recipe name already exists for this organization.
   * Only checks active (non-deleted) recipes.
   */
  recipeNameExists(
    orgId: string,
    name: string,
    excludeId?: string
  ): boolean {
    if (excludeId) {
      const stmt = this.db.prepare<{ count: number }, [string, string, string]>(
        `SELECT COUNT(*) as count FROM recipes WHERE org_id = ?1 AND name = ?2 AND id != ?3 AND deleted_at IS NULL`
      );
      const result = stmt.get(orgId, name, excludeId);
      return (result?.count ?? 0) > 0;
    }
    const stmt = this.db.prepare<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM recipes WHERE org_id = ?1 AND name = ?2 AND deleted_at IS NULL`
    );
    const result = stmt.get(orgId, name);
    return (result?.count ?? 0) > 0;
  }

  /**
   * Create a recipe with ingredients and instructions in a transaction.
   */
  createRecipe(
    orgId: string,
    userId: string,
    input: CreateRecipeInput
  ): RecipeDetail {
    const recipeId = crypto.randomUUID();
    const now = sqliteNow();

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO recipes (id, org_id, name, description, yield_amount, yield_unit, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
        )
        .run(
          recipeId,
          orgId,
          input.name,
          input.description,
          input.yieldAmount,
          input.yieldUnit,
          userId,
          now,
          now
        );

      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];
        this.db
          .prepare(
            `INSERT INTO ingredients (id, recipe_id, name, quantity, unit, sort_order, notes, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
          )
          .run(
            crypto.randomUUID(),
            recipeId,
            ing.name,
            ing.quantity,
            ing.unit,
            ing.sortOrder ?? i,
            ing.notes ?? null,
            now,
            now
          );
      }

      for (const inst of input.instructions) {
        this.db
          .prepare(
            `INSERT INTO instructions (id, recipe_id, step_number, description, duration_seconds, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
          )
          .run(
            crypto.randomUUID(),
            recipeId,
            inst.stepNumber,
            inst.description,
            inst.durationSeconds ?? null,
            now,
            now
          );
      }
    });

    tx();

    return this.getRecipeById(orgId, recipeId)!;
  }

  /**
   * Update a recipe. Replaces ingredients/instructions if provided.
   * Uses a transaction for atomicity.
   * Uses !== undefined checks (not falsy) to correctly handle empty strings and zero values.
   */
  updateRecipe(
    orgId: string,
    recipeId: string,
    input: UpdateRecipeInput
  ): RecipeDetail | null {
    // Verify ownership first
    const existing = this.getRecipeById(orgId, recipeId);
    if (!existing) return null;

    const now = sqliteNow();

    const tx = this.db.transaction(() => {
      // Update recipe fields if any top-level field is provided
      if (
        input.name !== undefined ||
        input.description !== undefined ||
        input.yieldAmount !== undefined ||
        input.yieldUnit !== undefined
      ) {
        this.db
          .prepare(
            `UPDATE recipes SET
            name = COALESCE(?1, name),
            description = COALESCE(?2, description),
            yield_amount = COALESCE(?3, yield_amount),
            yield_unit = COALESCE(?4, yield_unit),
            updated_at = ?5
          WHERE id = ?6 AND org_id = ?7 AND deleted_at IS NULL`
          )
          .run(
            input.name ?? null,
            input.description ?? null,
            input.yieldAmount ?? null,
            input.yieldUnit ?? null,
            now,
            recipeId,
            orgId
          );
      }

      // Replace ingredients if provided
      if (input.ingredients) {
        this.db
          .prepare(`DELETE FROM ingredients WHERE recipe_id = ?1`)
          .run(recipeId);

        for (let i = 0; i < input.ingredients.length; i++) {
          const ing = input.ingredients[i];
          this.db
            .prepare(
              `INSERT INTO ingredients (id, recipe_id, name, quantity, unit, sort_order, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
            )
            .run(
              crypto.randomUUID(),
              recipeId,
              ing.name,
              ing.quantity,
              ing.unit,
              ing.sortOrder ?? i,
              ing.notes ?? null,
              now,
              now
            );
        }
      }

      // Replace instructions if provided
      if (input.instructions) {
        this.db
          .prepare(`DELETE FROM instructions WHERE recipe_id = ?1`)
          .run(recipeId);

        for (const inst of input.instructions) {
          this.db
            .prepare(
              `INSERT INTO instructions (id, recipe_id, step_number, description, duration_seconds, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
            )
            .run(
              crypto.randomUUID(),
              recipeId,
              inst.stepNumber,
              inst.description,
              inst.durationSeconds ?? null,
              now,
              now
            );
        }
      }

      // Touch updated_at even if only children changed
      this.db
        .prepare(
          `UPDATE recipes SET updated_at = ?1 WHERE id = ?2 AND org_id = ?3 AND deleted_at IS NULL`
        )
        .run(now, recipeId, orgId);
    });

    tx();

    return this.getRecipeById(orgId, recipeId)!;
  }

  /**
   * Soft-delete a recipe. Sets deleted_at timestamp.
   * Returns true if soft-deleted, false if not found.
   * Child records (ingredients, instructions) remain but are inaccessible
   * since getRecipeById filters by deleted_at IS NULL.
   */
  deleteRecipe(orgId: string, recipeId: string): boolean {
    const now = sqliteNow();
    const result = this.db
      .prepare(
        `UPDATE recipes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND org_id = ?3 AND deleted_at IS NULL`
      )
      .run(now, recipeId, orgId);
    return result.changes > 0;
  }
}
