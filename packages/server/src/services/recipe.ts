/**
 * Recipe service — business logic layer.
 * Sits between routes and repository.
 * Enforces business rules: duplicate names, user validation, etc.
 */

import { RecipeRepository } from "../db/repository";
import type { CreateRecipeInput, UpdateRecipeInput } from "@recipe-mgmt/shared";
import type { RecipeDetail, RecipeSummary } from "@recipe-mgmt/shared";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export class RecipeService {
  constructor(private repo: RecipeRepository) {}

  listRecipes(
    orgId: string,
    limit: number,
    offset: number
  ): ServiceResult<RecipeSummary[]> {
    const recipes = this.repo.listRecipes(orgId, limit, offset);
    return { ok: true, data: recipes };
  }

  getRecipe(
    orgId: string,
    recipeId: string
  ): ServiceResult<RecipeDetail> {
    const recipe = this.repo.getRecipeById(orgId, recipeId);
    if (!recipe) {
      // Return 404 (not 403) to avoid leaking existence to other organizations
      return { ok: false, error: "Recipe not found", status: 404 };
    }
    return { ok: true, data: recipe };
  }

  searchRecipes(
    orgId: string,
    query: string,
    limit: number,
    offset: number
  ): ServiceResult<RecipeSummary[]> {
    const recipes = this.repo.searchRecipes(orgId, query, limit, offset);
    return { ok: true, data: recipes };
  }

  createRecipe(
    orgId: string,
    userId: string,
    input: CreateRecipeInput
  ): ServiceResult<RecipeDetail> {
    // Validate that the user exists within this organization
    if (!this.repo.userExists(orgId, userId)) {
      return {
        ok: false,
        error: "Invalid user for this organization",
        status: 400,
      };
    }

    // Business rule: no duplicate names within an organization
    if (this.repo.recipeNameExists(orgId, input.name)) {
      return {
        ok: false,
        error: `A recipe named "${input.name}" already exists`,
        status: 409,
      };
    }

    const recipe = this.repo.createRecipe(orgId, userId, input);
    return { ok: true, data: recipe };
  }

  updateRecipe(
    orgId: string,
    recipeId: string,
    input: UpdateRecipeInput
  ): ServiceResult<RecipeDetail> {
    // Check name uniqueness if name is being changed
    if (
      input.name &&
      this.repo.recipeNameExists(orgId, input.name, recipeId)
    ) {
      return {
        ok: false,
        error: `A recipe named "${input.name}" already exists`,
        status: 409,
      };
    }

    const recipe = this.repo.updateRecipe(orgId, recipeId, input);
    if (!recipe) {
      return { ok: false, error: "Recipe not found", status: 404 };
    }
    return { ok: true, data: recipe };
  }

  deleteRecipe(
    orgId: string,
    recipeId: string
  ): ServiceResult<{ deleted: true }> {
    const deleted = this.repo.deleteRecipe(orgId, recipeId);
    if (!deleted) {
      return { ok: false, error: "Recipe not found", status: 404 };
    }
    return { ok: true, data: { deleted: true } };
  }
}
