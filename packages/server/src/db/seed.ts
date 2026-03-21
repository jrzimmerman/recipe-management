/**
 * Seed data for development and demos.
 * Only runs if the database has no organizations.
 *
 * Provides:
 * - 2 organizations (competing restaurants)
 * - 6 users (3 per org: admin, member, viewer)
 * - 8 recipes with real bowl-based recipes and precise measurements
 */

import { Database } from "bun:sqlite";

export function seed(db: Database): void {
  const existing = db
    .prepare<{ count: number }, []>(
      "SELECT COUNT(*) as count FROM organizations"
    )
    .get();

  if (existing && existing.count > 0) return;

  console.log("Seeding database with demo data...");

  const tx = db.transaction(() => {
    // ────────────────────────────────────────────────────────
    // Organization A: "Bowl & Soul"
    // ────────────────────────────────────────────────────────
    const orgA = "org-bowlandsoul";

    db.prepare(
      `INSERT INTO organizations (id, name, display_name) VALUES (?1, ?2, ?3)`
    ).run(orgA, "bowlandsoul", "Bowl & Soul");

    // Users — 3 tiers: admin (owner), member (head chef), viewer (line cook)
    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-maria-santos", orgA, "maria@bowlandsoul.com", "Maria Santos", "admin");

    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-james-chen", orgA, "james@bowlandsoul.com", "James Chen", "member");

    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-jordan-kim", orgA, "jordan@bowlandsoul.com", "Jordan Kim", "viewer");

    const chefA = "user-maria-santos";

    // ── Recipe 1: Teriyaki Chicken Bowl ──────────────────
    seedRecipe(db, orgA, chefA, {
      id: "recipe-teriyaki-chicken",
      name: "Teriyaki Chicken Bowl",
      description:
        "Grilled chicken with teriyaki glaze over steamed jasmine rice with edamame and pickled ginger",
      yieldAmount: 450,
      yieldUnit: "g",
      ingredients: [
        ["Steamed jasmine rice", 200, "g"],
        ["Chicken breast, grilled", 120, "g"],
        ["Teriyaki sauce", 30, "mL"],
        ["Edamame, shelled", 40, "g"],
        ["Cucumber, sliced", 30, "g"],
        ["Sesame seeds", 5, "g"],
        ["Green onion, sliced", 10, "g"],
        ["Pickled ginger", 15, "g"],
      ],
      instructions: [
        ["Place steamed jasmine rice as base layer", 10],
        ["Arrange grilled chicken breast slices on one side", 15],
        ["Drizzle teriyaki sauce over chicken", 5],
        ["Add edamame and sliced cucumber on opposite side", 10],
        ["Garnish with sesame seeds, green onion, and pickled ginger", 5],
      ],
    });

    // ── Recipe 2: Ahi Tuna Poke Bowl ─────────────────────
    seedRecipe(db, orgA, chefA, {
      id: "recipe-ahi-tuna-poke",
      name: "Ahi Tuna Poke Bowl",
      description:
        "Sushi-grade ahi tuna in soy-sesame marinade over sushi rice with avocado and nori",
      yieldAmount: 420,
      yieldUnit: "g",
      ingredients: [
        ["Sushi rice", 180, "g"],
        ["Ahi tuna, cubed (sushi-grade)", 120, "g"],
        ["Soy-sesame marinade", 25, "mL"],
        ["Avocado, sliced", 50, "g"],
        ["Cucumber, sliced", 30, "g"],
        ["Edamame, shelled", 40, "g"],
        ["Carrot, julienned", 20, "g"],
        ["Nori strips", 3, "g"],
        ["Sesame seeds", 5, "g"],
        ["Spicy mayo", 15, "mL"],
      ],
      instructions: [
        ["Place sushi rice as base layer", 10],
        ["Arrange marinated ahi tuna cubes in center", 15],
        ["Fan avocado slices along one side", 10],
        ["Add cucumber, edamame, and julienned carrot", 10],
        ["Top with nori strips and sesame seeds", 5],
        ["Drizzle spicy mayo in a zigzag pattern", 5],
      ],
    });

    // ── Recipe 3: Korean Bibimbap Bowl ───────────────────
    seedRecipe(db, orgA, chefA, {
      id: "recipe-korean-bibimbap",
      name: "Korean Bibimbap Bowl",
      description:
        "Seasoned beef bulgogi with assorted namul vegetables, fried egg, and gochujang sauce over short-grain rice",
      yieldAmount: 480,
      yieldUnit: "g",
      ingredients: [
        ["Steamed short-grain rice", 200, "g"],
        ["Seasoned beef bulgogi", 100, "g"],
        ["Spinach namul", 50, "g"],
        ["Bean sprouts, seasoned", 40, "g"],
        ["Carrots, julienned", 30, "g"],
        ["Shiitake mushrooms, sliced", 30, "g"],
        ["Fried egg", 1, "each"],
        ["Gochujang sauce", 25, "mL"],
        ["Sesame oil", 5, "mL"],
      ],
      instructions: [
        ["Place steamed short-grain rice as base", 10],
        ["Arrange seasoned beef bulgogi in center", 15],
        ["Place spinach namul, bean sprouts, carrots, and mushrooms in sections around the bowl", 20],
        ["Top with a fried egg, sunny-side up", 15],
        ["Drizzle gochujang sauce and sesame oil", 5],
        ["Serve with instruction to mix all ingredients before eating", 5],
      ],
    });

    // ── Recipe 4: Mediterranean Falafel Bowl ─────────────
    seedRecipe(db, orgA, chefA, {
      id: "recipe-mediterranean-falafel",
      name: "Mediterranean Falafel Bowl",
      description:
        "Crispy falafel over mixed greens with hummus, pickled vegetables, and tahini dressing",
      yieldAmount: 420,
      yieldUnit: "g",
      ingredients: [
        ["Mixed greens", 60, "g"],
        ["Falafel, fried", 4, "each"],
        ["Hummus", 50, "g"],
        ["Cherry tomatoes, halved", 40, "g"],
        ["Pickled red onion", 20, "g"],
        ["Cucumber, diced", 30, "g"],
        ["Tahini dressing", 25, "mL"],
        ["Feta cheese, crumbled", 20, "g"],
      ],
      instructions: [
        ["Arrange mixed greens as base layer", 10],
        ["Place falafel pieces in center of bowl", 10],
        ["Add hummus dollop on one side", 5],
        ["Arrange cherry tomatoes, pickled onion, and cucumber around falafel", 15],
        ["Drizzle tahini dressing over entire bowl", 5],
        ["Top with crumbled feta cheese", 5],
      ],
    });

    // ── Recipe 5: Chipotle Chicken Burrito Bowl ──────────
    seedRecipe(db, orgA, chefA, {
      id: "recipe-chipotle-burrito",
      name: "Chipotle Chicken Burrito Bowl",
      description:
        "Chipotle-seasoned grilled chicken with cilantro lime rice, black beans, charred corn, and guacamole",
      yieldAmount: 520,
      yieldUnit: "g",
      ingredients: [
        ["Cilantro lime rice", 200, "g"],
        ["Chipotle grilled chicken, sliced", 130, "g"],
        ["Black beans, seasoned", 60, "g"],
        ["Charred corn kernels", 40, "g"],
        ["Pico de gallo", 40, "g"],
        ["Romaine lettuce, shredded", 30, "g"],
        ["Monterey jack cheese, shredded", 20, "g"],
        ["Sour cream", 20, "mL"],
        ["Guacamole", 30, "g"],
      ],
      instructions: [
        ["Place cilantro lime rice as base layer", 10],
        ["Arrange sliced chipotle chicken on one side", 10],
        ["Add seasoned black beans and charred corn", 10],
        ["Top with shredded romaine lettuce", 5],
        ["Add pico de gallo and guacamole", 10],
        ["Sprinkle shredded cheese and dollop sour cream", 5],
      ],
    });

    // ────────────────────────────────────────────────────────
    // Organization B: "Green Machine"
    // ────────────────────────────────────────────────────────
    const orgB = "org-greenmachine";

    db.prepare(
      `INSERT INTO organizations (id, name, display_name) VALUES (?1, ?2, ?3)`
    ).run(orgB, "greenmachine", "Green Machine");

    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-alex-rivera", orgB, "alex@greenmachine.com", "Alex Rivera", "admin");

    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-priya-patel", orgB, "priya@greenmachine.com", "Priya Patel", "member");

    db.prepare(
      `INSERT INTO users (id, org_id, email, name, role) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run("user-casey-brooks", orgB, "casey@greenmachine.com", "Casey Brooks", "viewer");

    const chefB = "user-alex-rivera";

    // ── Recipe 6: Vegan Power Bowl ───────────────────────
    seedRecipe(db, orgB, chefB, {
      id: "recipe-vegan-power",
      name: "Vegan Power Bowl",
      description:
        "Quinoa base with roasted sweet potato, black beans, avocado, and lime-cilantro dressing",
      yieldAmount: 480,
      yieldUnit: "g",
      ingredients: [
        ["Cooked quinoa", 150, "g"],
        ["Roasted sweet potato, cubed", 100, "g"],
        ["Black beans, drained", 60, "g"],
        ["Avocado, sliced", 50, "g"],
        ["Red cabbage, shredded", 30, "g"],
        ["Corn kernels", 30, "g"],
        ["Lime-cilantro dressing", 30, "mL"],
        ["Pumpkin seeds", 10, "g"],
      ],
      instructions: [
        ["Spread cooked quinoa as base layer", 10],
        ["Arrange roasted sweet potato cubes on one section", 10],
        ["Add black beans and corn kernels", 10],
        ["Fan avocado slices across the top", 15],
        ["Add shredded red cabbage for color contrast", 5],
        ["Drizzle lime-cilantro dressing over bowl", 5],
        ["Sprinkle pumpkin seeds as garnish", 5],
      ],
    });

    // ── Recipe 7: Roasted Tofu Grain Bowl ────────────────
    seedRecipe(db, orgB, chefB, {
      id: "recipe-tofu-grain",
      name: "Roasted Tofu Grain Bowl",
      description:
        "Roasted extra-firm tofu with broccolini over brown rice and quinoa, dressed with miso-tahini sauce",
      yieldAmount: 460,
      yieldUnit: "g",
      ingredients: [
        ["Brown rice and quinoa blend", 180, "g"],
        ["Extra-firm tofu, roasted and cubed", 120, "g"],
        ["Broccolini, roasted", 60, "g"],
        ["Red cabbage slaw", 40, "g"],
        ["Avocado, sliced", 40, "g"],
        ["Miso-tahini dressing", 30, "mL"],
        ["Sesame seeds", 5, "g"],
      ],
      instructions: [
        ["Place brown rice and quinoa blend as base", 10],
        ["Arrange roasted tofu cubes on one side", 10],
        ["Add roasted broccolini florets alongside tofu", 10],
        ["Top with red cabbage slaw and sliced avocado", 10],
        ["Drizzle miso-tahini dressing over entire bowl", 5],
        ["Garnish with sesame seeds", 5],
      ],
    });

    // ── Recipe 8: Chickpea & Farro Mediterranean Bowl ────
    seedRecipe(db, orgB, chefB, {
      id: "recipe-chickpea-farro",
      name: "Chickpea & Farro Mediterranean Bowl",
      description:
        "Hearty farro base with roasted chickpeas, fresh vegetables, feta, and red wine vinaigrette",
      yieldAmount: 440,
      yieldUnit: "g",
      ingredients: [
        ["Cooked farro", 150, "g"],
        ["Roasted chickpeas", 80, "g"],
        ["Cherry tomatoes, halved", 40, "g"],
        ["Cucumber, diced", 40, "g"],
        ["Avocado, diced", 40, "g"],
        ["Feta cheese, crumbled", 25, "g"],
        ["Red wine vinaigrette", 25, "mL"],
        ["Dried oregano", 2, "g"],
      ],
      instructions: [
        ["Place cooked farro as base layer", 10],
        ["Top with roasted chickpeas", 5],
        ["Arrange cherry tomatoes, cucumber, and avocado in sections", 15],
        ["Drizzle red wine vinaigrette over bowl", 5],
        ["Crumble feta cheese on top", 5],
        ["Finish with a sprinkle of dried oregano", 5],
      ],
    });
  });

  tx();
  console.log("Seed complete: 2 organizations, 6 users, 8 recipes");
}

// ─── Seed Helper ──────────────────────────────────────────

interface SeedRecipe {
  id: string;
  name: string;
  description: string;
  yieldAmount: number;
  yieldUnit: string;
  ingredients: [string, number, string][];
  instructions: [string, number][];
}

function seedRecipe(
  db: Database,
  orgId: string,
  createdBy: string,
  recipe: SeedRecipe
): void {
  db.prepare(
    `INSERT INTO recipes (id, org_id, name, description, yield_amount, yield_unit, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).run(
    recipe.id,
    orgId,
    recipe.name,
    recipe.description,
    recipe.yieldAmount,
    recipe.yieldUnit,
    createdBy
  );

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const [name, qty, unit] = recipe.ingredients[i];
    db.prepare(
      `INSERT INTO ingredients (id, recipe_id, name, quantity, unit, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).run(crypto.randomUUID(), recipe.id, name, qty, unit, i);
  }

  for (let i = 0; i < recipe.instructions.length; i++) {
    const [desc, dur] = recipe.instructions[i];
    db.prepare(
      `INSERT INTO instructions (id, recipe_id, step_number, description, duration_seconds)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    ).run(crypto.randomUUID(), recipe.id, i + 1, desc, dur);
  }
}
