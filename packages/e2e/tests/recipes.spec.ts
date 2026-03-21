import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests covering the critical functionality from the assignment prompt:
 *
 * 1. Keep track of recipes (list of ingredients, instructions, yield)
 * 2. Allow users to search for recipes
 * 3. Display recipes in a kitchen-friendly way
 * 4. Allow users to edit or remove recipes
 * 5. Multi-organization isolation (competing restaurants)
 * 6. RBAC: viewer role sees read-only UI
 * 7. Login/logout flow
 */

// ─── Helper: Sign in as a demo user ────────────────────

async function signIn(page: Page, userName: string) {
  // If already on the login screen, click the user card
  const loginCard = page.locator(".login-card", { hasText: userName });
  if (await loginCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginCard.click();
    return;
  }
  // If signed in as someone else, sign out first
  const trigger = page.locator(".user-menu-trigger");
  if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
    await trigger.click();
    await page.locator(".user-menu-signout").click();
    await page.locator(".login-card", { hasText: userName }).click();
  }
}

async function signInAsMaria(page: Page) {
  // Clear any stale session to ensure clean login
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await signIn(page, "Maria Santos");
  // Wait for recipes to load
  await expect(page.locator(".recipe-card").first()).toBeVisible();
}

// ─── Login Flow ────────────────────────────────────────

test.describe("Login Flow", () => {
  test("shows login screen on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".login-title")).toHaveText("Recipe Management");
    await expect(page.locator(".login-subtitle")).toContainText(
      "Select your account"
    );
    // Should show both organizations
    await expect(page.getByText("Bowl & Soul")).toBeVisible();
    await expect(page.getByText("Green Machine")).toBeVisible();
    // Should show 6 user cards total
    await expect(page.locator(".login-card")).toHaveCount(6);
  });

  test("signs in by clicking a user card", async ({ page }) => {
    await page.goto("/");
    await page.locator(".login-card", { hasText: "Maria Santos" }).click();
    // Should now see the main app with recipes
    await expect(page.locator(".recipe-card").first()).toBeVisible();
    // Header should show user name
    await expect(page.locator(".user-menu-trigger")).toContainText(
      "Maria Santos"
    );
  });

  test("signs out and returns to login screen", async ({ page }) => {
    await signInAsMaria(page);
    await page.locator(".user-menu-trigger").click();
    await page.locator(".user-menu-signout").click();
    // Should be back on login screen
    await expect(page.locator(".login-title")).toBeVisible();
  });
});

// ─── Recipe Display ────────────────────────────────────

test.describe("Recipe Display", () => {
  test("displays seeded recipes on the list page", async ({ page }) => {
    await signInAsMaria(page);
    // Bowl & Soul should have 5 recipes
    await expect(page.locator(".recipe-card")).toHaveCount(5);
    await expect(page.getByText("Teriyaki Chicken Bowl")).toBeVisible();
    await expect(page.getByText("Ahi Tuna Poke Bowl")).toBeVisible();
    await expect(page.getByText("Korean Bibimbap Bowl")).toBeVisible();
  });

  test("recipe cards show yield and counts", async ({ page }) => {
    await signInAsMaria(page);
    const teriyakiCard = page.locator(".recipe-card", {
      hasText: "Teriyaki Chicken Bowl",
    });
    await expect(teriyakiCard.getByText("450 g")).toBeVisible();
    await expect(teriyakiCard.getByText("8 ingredients")).toBeVisible();
    await expect(teriyakiCard.getByText("5 steps")).toBeVisible();
  });

  test("shows full recipe detail with ingredients and instructions", async ({
    page,
  }) => {
    await signInAsMaria(page);
    await page.getByText("Teriyaki Chicken Bowl").click();

    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Teriyaki Chicken Bowl"
    );

    // Ingredients with precise measurements
    const ingredients = page.locator(".ingredient-list");
    await expect(ingredients.getByText("200 g")).toBeVisible();
    await expect(ingredients.getByText("Steamed jasmine rice")).toBeVisible();
    await expect(ingredients.getByText("30 mL")).toBeVisible();
    await expect(ingredients.getByText("Teriyaki sauce")).toBeVisible();

    // Instructions
    const instructions = page.locator(".instruction-list");
    await expect(
      instructions.getByText("Place steamed jasmine rice as base layer")
    ).toBeVisible();

    // Yield
    await expect(page.locator(".recipe-detail-yield")).toContainText("450 g");
  });

  test("back button returns to list view", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByText("Teriyaki Chicken Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".recipe-card").first()).toBeVisible();
  });

  test("logo navigates home", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByText("Teriyaki Chicken Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toBeVisible();
    await page.locator(".logo").click();
    await expect(page.locator(".recipe-card").first()).toBeVisible();
  });
});

// ─── Recipe Search ─────────────────────────────────────

test.describe("Recipe Search", () => {
  test("searches by recipe name with debounce", async ({ page }) => {
    await signInAsMaria(page);
    await page.locator(".search-input").fill("Teriyaki");
    // Debounce fires after 300ms — wait for results to update
    await expect(page.locator(".recipe-card")).toHaveCount(1);
    await expect(page.getByText("Teriyaki Chicken Bowl")).toBeVisible();
  });

  test("searches by ingredient name", async ({ page }) => {
    await signInAsMaria(page);
    await page.locator(".search-input").fill("gochujang");
    await expect(page.locator(".recipe-card")).toHaveCount(1);
    await expect(page.getByText("Korean Bibimbap Bowl")).toBeVisible();
  });

  test("shows empty state for no results", async ({ page }) => {
    await signInAsMaria(page);
    await page.locator(".search-input").fill("nonexistent recipe xyz");
    await expect(page.getByText("No recipes found")).toBeVisible();
  });

  test("clear button resets search results", async ({ page }) => {
    await signInAsMaria(page);
    await page.locator(".search-input").fill("Teriyaki");
    await expect(page.locator(".recipe-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator(".recipe-card")).toHaveCount(5);
  });
});

// ─── Recipe Create ─────────────────────────────────────

test.describe("Recipe Create", () => {
  test("creates a new recipe with precise measurements", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByRole("button", { name: "+ New Recipe" }).click();

    await page.locator("#recipe-name").fill("Spicy Tuna Bowl");
    await page.locator("#recipe-desc").fill("Seared tuna over sushi rice");
    await page.locator("#yield-amount").fill("400");

    const ingredientRows = page.locator(".ingredient-row");
    await ingredientRows
      .nth(0)
      .locator('input[placeholder="Ingredient name"]')
      .fill("Sushi rice");
    await ingredientRows
      .nth(0)
      .locator('input[placeholder="Qty"]')
      .fill("200");

    await page.getByRole("button", { name: "+ Add Ingredient" }).click();
    await ingredientRows
      .nth(1)
      .locator('input[placeholder="Ingredient name"]')
      .fill("Seared tuna");
    await ingredientRows
      .nth(1)
      .locator('input[placeholder="Qty"]')
      .fill("120");

    const instructionRows = page.locator(".instruction-row");
    await instructionRows
      .nth(0)
      .locator("textarea")
      .fill("Place sushi rice as base");

    await page.getByRole("button", { name: "Create Recipe" }).click();

    // Wait for mutation to complete and navigate to detail view
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Spicy Tuna Bowl",
      { timeout: 10000 }
    );

    const ingredients = page.locator(".ingredient-list");
    await expect(ingredients.getByText("200 g")).toBeVisible();
    await expect(ingredients.getByText("Sushi rice")).toBeVisible();
  });

  test("shows validation error for missing ingredients", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByRole("button", { name: "+ New Recipe" }).click();
    await page.locator("#recipe-name").fill("Empty Bowl");

    const instructionRows = page.locator(".instruction-row");
    await instructionRows.nth(0).locator("textarea").fill("Do nothing");

    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(page.locator(".form-error")).toContainText(
      "At least one ingredient is required"
    );
  });

  test("shows validation error for missing instructions", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByRole("button", { name: "+ New Recipe" }).click();
    await page.locator("#recipe-name").fill("No Steps Bowl");

    // Fill an ingredient but leave instructions empty
    const ingredientRows = page.locator(".ingredient-row");
    await ingredientRows
      .nth(0)
      .locator('input[placeholder="Ingredient name"]')
      .fill("Rice");
    await ingredientRows.nth(0).locator('input[placeholder="Qty"]').fill("200");

    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(page.locator(".form-error")).toContainText(
      "At least one instruction is required"
    );
  });

  test("cancel returns to list without creating", async ({ page }) => {
    await signInAsMaria(page);
    const countBefore = await page.locator(".recipe-card").count();

    await page.getByRole("button", { name: "+ New Recipe" }).click();
    await page.locator("#recipe-name").fill("Should Not Exist");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should be back on list with same count
    await expect(page.locator(".recipe-card")).toHaveCount(countBefore);
    await expect(page.getByText("Should Not Exist")).not.toBeVisible();
  });
});

// ─── Recipe Edit ───────────────────────────────────────

test.describe("Recipe Edit", () => {
  test("edits an existing recipe name and verifies the change", async ({
    page,
  }) => {
    await signInAsMaria(page);
    await page.getByText("Mediterranean Falafel Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Mediterranean Falafel Bowl"
    );

    await page.getByRole("button", { name: "Edit" }).click();
    const nameInput = page.locator("#recipe-name");
    await nameInput.clear();
    await nameInput.fill("Updated Falafel Bowl");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Updated Falafel Bowl"
    );
  });

  test("edits ingredients and verifies the replacement", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByText("Ahi Tuna Poke Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Ahi Tuna Poke Bowl"
    );

    await page.getByRole("button", { name: "Edit" }).click();

    // Change the first ingredient name
    const ingredientRows = page.locator(".ingredient-row");
    const firstIngredient = ingredientRows
      .nth(0)
      .locator('input[placeholder="Ingredient name"]');
    await firstIngredient.clear();
    await firstIngredient.fill("Brown rice");

    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify the updated ingredient appears in the detail view
    const ingredients = page.locator(".ingredient-list");
    await expect(ingredients.getByText("Brown rice")).toBeVisible();
  });

  test("cancel returns to detail without saving changes", async ({ page }) => {
    await signInAsMaria(page);
    await page.getByText("Korean Bibimbap Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Korean Bibimbap Bowl"
    );

    await page.getByRole("button", { name: "Edit" }).click();

    // Change the name but cancel
    const nameInput = page.locator("#recipe-name");
    await nameInput.clear();
    await nameInput.fill("Changed Name");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should be back on detail with original name
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Korean Bibimbap Bowl"
    );
  });
});

// ─── Recipe Delete (from detail view with modal) ───────

test.describe("Recipe Delete", () => {
  test("deletes a recipe via confirmation modal in detail view", async ({
    page,
  }) => {
    await signInAsMaria(page);

    // Navigate to a recipe detail
    await page.getByText("Chipotle Chicken Burrito Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Chipotle Chicken Burrito Bowl"
    );

    // Click delete — should show confirmation modal
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator(".modal-title")).toHaveText("Delete Recipe?");
    await expect(page.locator(".modal-description")).toContainText(
      "Chipotle Chicken Burrito Bowl"
    );

    // Confirm deletion
    await page.locator(".modal-actions .btn-danger").click();

    // Should return to list
    await expect(page.locator(".recipe-card").first()).toBeVisible();

    // Recipe should be gone
    await expect(
      page.getByText("Chipotle Chicken Burrito Bowl")
    ).not.toBeVisible();
  });

  test("cancel on delete modal keeps the recipe", async ({ page }) => {
    await signInAsMaria(page);

    await page.getByText("Teriyaki Chicken Bowl").click();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Teriyaki Chicken Bowl"
    );

    // Open delete modal then cancel
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator(".modal-title")).toBeVisible();
    await page.locator(".modal-actions .btn-secondary").click();

    // Modal should close, still on detail view
    await expect(page.locator(".modal-title")).not.toBeVisible();
    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "Teriyaki Chicken Bowl"
    );
  });
});

// ─── Organization Isolation ────────────────────────────

test.describe("Organization Isolation", () => {
  test("switching organization shows different recipes", async ({ page }) => {
    // Sign in as Bowl & Soul admin
    await signInAsMaria(page);
    await expect(page.getByText("Teriyaki Chicken Bowl")).toBeVisible();

    // Sign out and sign in as Green Machine admin
    await page.locator(".user-menu-trigger").click();
    await page.locator(".user-menu-signout").click();
    await page.locator(".login-card", { hasText: "Alex Rivera" }).click();

    // Should see Green Machine recipes
    await expect(page.getByText("Vegan Power Bowl")).toBeVisible();
    await expect(page.getByText("Roasted Tofu Grain Bowl")).toBeVisible();

    // Should NOT see Bowl & Soul recipes
    await expect(page.getByText("Teriyaki Chicken Bowl")).not.toBeVisible();
  });
});

// ─── RBAC: Viewer Role ─────────────────────────────────

test.describe("RBAC", () => {
  test("viewer cannot see create, edit, or delete buttons", async ({
    page,
  }) => {
    await page.goto("/");
    // Sign in as Jordan Kim (viewer)
    await page.locator(".login-card", { hasText: "Jordan Kim" }).click();
    await expect(page.locator(".recipe-card").first()).toBeVisible();

    // No "New Recipe" button
    await expect(
      page.getByRole("button", { name: "+ New Recipe" })
    ).not.toBeVisible();

    // Navigate to detail — no Edit or Delete buttons
    await page.locator(".recipe-card").first().click();
    await expect(page.locator(".recipe-detail-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete" })
    ).not.toBeVisible();
    // But Back button should still be there
    await expect(
      page.getByRole("button", { name: "Back" })
    ).toBeVisible();
  });

  test("member can edit but cannot delete", async ({ page }) => {
    await page.goto("/");
    // Sign in as James Chen (member)
    await page.locator(".login-card", { hasText: "James Chen" }).click();
    await expect(page.locator(".recipe-card").first()).toBeVisible();

    // Should see "New Recipe" button
    await expect(
      page.getByRole("button", { name: "+ New Recipe" })
    ).toBeVisible();

    // Navigate to detail — should see Edit but not Delete
    await page.locator(".recipe-card").first().click();
    await expect(page.locator(".recipe-detail-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete" })
    ).not.toBeVisible();
  });

  test("member can create a recipe", async ({ page }) => {
    await page.goto("/");
    await page.locator(".login-card", { hasText: "James Chen" }).click();
    await expect(page.locator(".recipe-card").first()).toBeVisible();

    await page.getByRole("button", { name: "+ New Recipe" }).click();

    await page.locator("#recipe-name").fill("James Special Bowl");
    await page.locator("#yield-amount").fill("350");

    const ingredientRows = page.locator(".ingredient-row");
    await ingredientRows
      .nth(0)
      .locator('input[placeholder="Ingredient name"]')
      .fill("Wild rice");
    await ingredientRows.nth(0).locator('input[placeholder="Qty"]').fill("180");

    const instructionRows = page.locator(".instruction-row");
    await instructionRows.nth(0).locator("textarea").fill("Cook wild rice");

    await page.getByRole("button", { name: "Create Recipe" }).click();

    await expect(page.locator(".recipe-detail-title")).toHaveText(
      "James Special Bowl",
      { timeout: 10000 }
    );
  });
});
