# Recipe Management System — Architecture

## Overview

A multi-tenant recipe management system designed for a commercial kitchen platform. The system allows several dozen users across competing restaurants to manage bowl-building recipes with precise, machine-readable measurements.

We use the term **Organization** (not "tenant") to follow industry-standard multi-tenancy naming. Each organization represents a business customer — a restaurant. The `org_id` column scopes all data access, ensuring competing restaurants cannot see each other's data.

## Constraints Driving Design

| Constraint | Impact on Architecture |
|---|---|
| Max 5,000-10,000 requests/day | Single-process server, no horizontal scaling needed |
| Max 1,000 recipes | SQLite is more than sufficient; no need for a separate database server |
| Several dozen users, competing restaurants | Multi-tenancy with strict organization-level data isolation |
| Kitchen environment | Large, readable UI; touch-friendly; fast response times |
| Reproducible deployment across kitchens | Docker container; single artifact per release |
| No internationalization required | No i18n library, no locale files. Hardcoded `lang="en"`. Simplifies the frontend. |
| Authentication not yet implemented | Demo middleware with header-based organization context |

## Technology Choices

### Runtime: Bun

**Why:** Native TypeScript execution (no transpilation step), built-in SQLite driver (`bun:sqlite`), built-in test runner, fast startup. Single runtime for development, testing, and production. Ideal for constrained environments — lower memory footprint than Node.js.

**Tradeoff:** Smaller ecosystem than Node.js, but Hono and standard npm packages work without issue.

### Server: Hono

**Why:** ~14KB framework, runs natively on Bun. Express-like DX with modern middleware patterns. Built-in testable request/response interface (no need for supertest). Supports static file serving for single-container deployment.

**Tradeoff:** Less middleware ecosystem than Express, but we don't need much middleware for this use case.

### Database: SQLite (via `bun:sqlite`)

**Why:** Embedded file-based database — no separate process, no network round-trips, zero configuration. More than capable for <1K recipes and <10K requests/day. WAL mode enables concurrent reads. Single file simplifies backup and deployment. SQLite 3.51 provides full JSON/JSONB support for metadata columns.

**Tradeoff:** No built-in replication. If we need multi-node data sync in the future, this would need to evolve (see Future Considerations).

**Why not an ORM:** At this scale with known, stable queries, a thin repository layer with typed SQL is simpler, faster, and easier to debug than an ORM. No query builder overhead, no migration tooling complexity.

### Client: React + Vite

**Why:** Scaffolded via `bun create vite --template react-ts` for canonical project structure. React 19 with TypeScript for type-safe component development. Vite for fast HMR in development and optimized production builds.

**Tradeoff:** React is heavier than alternatives like Preact or Solid, but the universality justified it. The built client is ~88KB gzipped — acceptable.

### Validation: Zod

**Why:** Runtime validation at the API boundary with TypeScript type inference. Schemas are defined once in the shared package and used by both client and server. Catches invalid data (wrong units, negative quantities, empty names) before it reaches the database.

## Design Considerations

These cross-cutting concerns informed every technology and architecture choice.

### Maintainability

- **Layered architecture** (routes -> service -> repository -> database) ensures each layer has a single responsibility and can be tested independently. Changing the database doesn't affect routes; changing validation doesn't affect the repository.
- **Shared types package** (`@recipe-mgmt/shared`) prevents drift between server and client. Change a type once and both sides update. Zod schemas in the same package enforce validation rules at the API boundary and optionally on the client, reducing duplication.
- **App factory pattern** (`createApp()`) enables dependency injection — tests create isolated apps with in-memory databases, no mocks or stubs needed.
- **No ORM** — at this scale, raw SQL with typed mappers is easier to reason about, debug, and modify than ORM abstractions. Adding a new query is writing SQL, not learning an ORM API. This is a deliberate tradeoff: an ORM would help if the schema grew to dozens of tables, but for 5 tables it adds complexity without proportional benefit.
- **Scaffolded with official tooling** — `bun create hono` for the server, `bun create vite --template react-ts` for the client. Canonical project structures that any developer familiar with these tools can navigate immediately.

### Cost

- **Zero external services** — SQLite is embedded, Bun is the only runtime, no managed database, cache, or message queue. The entire system runs as a single process.
- **123MB Docker image, ~21 MiB idle runtime memory** — runs on commodity hardware or SoM devices. No cloud-scale infrastructure required.
- **Docker Compose deployment** — no Kubernetes, no orchestrator. One `docker compose up` per kitchen node. Suitable for deploying across dozens of restaurant locations without DevOps overhead.
- **Open-source stack** — Bun (MIT), Hono (MIT), React (MIT), SQLite (public domain), Zod (MIT).
### Language

- **TypeScript end-to-end** — single language for server, client, shared types, validation, and tests. Reduces context-switching and enables type sharing across the full stack.
- **Bun as runtime** — provides native TypeScript execution, built-in SQLite, and a built-in test runner, eliminating separate dependencies for transpilation, database drivers, and test frameworks.

## Architecture

### Monorepo Structure

```
recipe-management/
├── packages/
│   ├── shared/     # Types, validation schemas, measurement units
│   ├── server/     # Hono API (scaffolded via bun create hono)
│   ├── client/     # React UI (scaffolded via bun create vite)
│   └── e2e/        # Playwright end-to-end tests
├── design/         # This document
├── Dockerfile      # Multi-stage production build
└── docker-compose.yml
```

Bun workspaces link the packages. `@recipe-mgmt/shared` is consumed by both server and client.

### Multi-Tenancy Model

**Approach:** Row-level organization isolation. Every org-scoped table has an `org_id` column with a foreign key to the `organizations` table.

**Isolation enforcement happens at three layers:**

1. **Auth Middleware** — Extracts organization context from the request. In production, this would validate a JWT and extract the organization and user claims. Currently uses demo header-based auth (`X-Org-ID`, `X-User-ID`).

2. **Service Layer** — Every method requires `orgId` as its first parameter. Business rules (duplicate name checks, user validation, existence checks) are always organization-scoped.

3. **Repository Layer** — Every SQL query includes `WHERE org_id = ? AND deleted_at IS NULL`. The repository never accepts a query without an organization scope.

**Why 404 instead of 403:** When one organization tries to access another organization's recipe, they get `404 Not Found`, not `403 Forbidden`. This avoids leaking the existence of resources to unauthorized organizations.

**Testing:** Dedicated organization isolation test suite (`isolation.test.ts`) that creates two organizations and verifies that neither can list, read, update, or delete the other's recipes.

### Data Model

#### Relationship Overview

```
organizations
    └── users
    └── recipes
            └── ingredients
            └── instructions
```

#### `organizations`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `name` | TEXT | NOT NULL, UNIQUE | URL-friendly slug |
| `display_name` | TEXT | NOT NULL | Human-readable name shown in UI |
| `metadata` | TEXT | NOT NULL, DEFAULT '{}', CHECK json_valid | Extensible JSON (plan tier, feature flags, branding) |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last modification timestamp |
| `deleted_at` | TEXT | DEFAULT NULL | Soft delete tombstone; NULL = active |

#### `users`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `org_id` | TEXT | NOT NULL, FK → organizations(id) CASCADE | Organization membership |
| `email` | TEXT | NOT NULL, UNIQUE(org_id, email) | User email, unique per organization |
| `name` | TEXT | NOT NULL | Display name |
| `picture` | TEXT | nullable | Profile image URL |
| `role` | TEXT | NOT NULL, CHECK IN ('admin','member','viewer') | RBAC role |
| `metadata` | TEXT | NOT NULL, DEFAULT '{}', CHECK json_valid | Extensible JSON (preferences, external IDs) |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last modification timestamp |
| `deleted_at` | TEXT | DEFAULT NULL | Soft delete tombstone |

#### `recipes`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `org_id` | TEXT | NOT NULL, FK → organizations(id) CASCADE | Organization ownership |
| `name` | TEXT | NOT NULL, UNIQUE(org_id, name) | Recipe name, unique per organization |
| `description` | TEXT | NOT NULL, DEFAULT '' | Brief description of the recipe |
| `yield_amount` | REAL | NOT NULL, CHECK > 0 | How much the recipe produces |
| `yield_unit` | TEXT | NOT NULL, CHECK IN ('g','kg','mL','L','servings','pieces') | Unit for yield amount |
| `created_by` | TEXT | NOT NULL, FK → users(id) | User who created the recipe |
| `metadata` | TEXT | NOT NULL, DEFAULT '{}', CHECK json_valid | Extensible JSON (tags, allergens, robot parameters) |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last modification timestamp |
| `deleted_at` | TEXT | DEFAULT NULL | Soft delete tombstone |

Indexes: `idx_recipes_org (org_id) WHERE deleted_at IS NULL`, `idx_recipes_org_name (org_id, name) WHERE deleted_at IS NULL`

#### `ingredients`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `recipe_id` | TEXT | NOT NULL, FK → recipes(id) CASCADE | Parent recipe |
| `name` | TEXT | NOT NULL | Ingredient name |
| `quantity` | REAL | NOT NULL, CHECK > 0 | Amount required |
| `unit` | TEXT | NOT NULL, CHECK IN ('g','kg','mL','L','each') | Measurement unit — strict enum, no freeform strings |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Display order within the recipe |
| `notes` | TEXT | nullable | Preparation notes (e.g., "diced", "room temperature") |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last modification timestamp |

Index: `idx_ingredients_recipe (recipe_id)`

#### `instructions`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `recipe_id` | TEXT | NOT NULL, FK → recipes(id) CASCADE | Parent recipe |
| `step_number` | INTEGER | NOT NULL, CHECK > 0 | 1-indexed step order |
| `description` | TEXT | NOT NULL | Human-readable instruction text |
| `duration_seconds` | INTEGER | CHECK >= 0 or NULL | Expected step duration; stored for future order timing support |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last modification timestamp |

Index: `idx_instructions_recipe (recipe_id)`

#### Key Decisions

- **Industry-standard naming:** The `organizations` table and `org_id` foreign key follow standard multi-tenancy conventions. User roles (`admin`, `member`, `viewer`) are generic RBAC tiers rather than domain-specific roles, making the system compatible with any JWT-based identity provider.

- **Consistent meta fields:** All tables have `id`, `created_at`, `updated_at`. Top-level entities (organizations, users, recipes) additionally have `deleted_at` for soft deletes and `metadata` (validated JSON) for extensibility.

- **Soft deletes on top-level entities:** Organizations, users, and recipes use `deleted_at` tombstones. Child entities (ingredients, instructions) use CASCADE hard deletes since they're always replaced atomically with their parent. All read queries filter by `WHERE deleted_at IS NULL` with partial indexes for performance.

- **JSON metadata columns:** `metadata TEXT NOT NULL DEFAULT '{}'` with `CHECK (json_valid(metadata))` on organizations, users, and recipes. SQLite 3.51 has full JSON/JSONB support. Enables organization-specific config, identity provider data, tags, allergen info, and future extensibility without schema changes.

- **Precise measurement units:** The `unit` column is constrained to a strict enum: `g`, `kg`, `mL`, `L`, `each`. No freeform strings like "pinch" or "dash." A robotics kitchen needs exact quantities for automated dispensing.

- **Yield information:** Recipes track both amount and unit for yield (e.g., "450g" or "2 servings"), satisfying the product requirement.

- **Instruction timing:** Optional `duration_seconds` on instructions. Not displayed in the current UI but stored for future order timing support — when orders are implemented, the system can compare expected vs. actual step durations.

- **Composite unique constraint:** `(org_id, name)` ensures recipe names are unique within a restaurant but the same name can exist across organizations.

- **CASCADE deletes:** Soft-deleting a recipe hides it from queries. Child records remain but are inaccessible.

- **Timestamp consistency:** All application-generated timestamps use a `sqliteNow()` helper that matches SQLite's `datetime('now')` format (`YYYY-MM-DD HH:MM:SS`), preventing format mismatches between JS and SQL defaults.

### API Design

```
GET    /api/health              — no auth
GET    /api/recipes             — list (org-scoped, paginated)
GET    /api/recipes/search?q=   — search by name or ingredient
GET    /api/recipes/:id         — detail with ingredients + instructions
POST   /api/recipes             — create (Zod-validated)
PUT    /api/recipes/:id         — update (partial, Zod-validated)
DELETE /api/recipes/:id         — soft-delete
```

List endpoint returns `RecipeSummary` (with ingredient/step counts, no nested data).
Detail endpoint returns full `RecipeDetail` (with ingredients and instructions).
This avoids over-fetching on the list view.

### Error Handling

| Condition | Response |
|---|---|
| Missing auth headers | 401 |
| Invalid JSON body | 400 |
| Validation failure (Zod) | 400 with field-level details |
| Invalid user for organization | 400 |
| Duplicate recipe name in organization | 409 |
| Recipe not found / wrong organization | 404 |
| Unhandled server error | 500 |

### Client Architecture

- **API Client** (`api/client.ts`): Typed fetch wrapper, organization-aware via headers
- **Hooks** (`hooks/useRecipes.ts`): React hooks for list, detail, search
- **Components**: Layout, LoginScreen, UserMenu, ConfirmModal, SearchBar, RecipeList, RecipeCard, RecipeDetail, RecipeForm
- **RBAC in UI**: `viewer` sees read-only (no create/edit/delete buttons), `member` can create and edit, `admin` has full access including delete
- **Kitchen-friendly CSS**: 18px+ base font, 44px+ touch targets, high contrast, card-based layout. Delete is behind a confirmation modal in the detail view — no destructive actions on recipe cards.
- **Responsive recipe detail**: On screens 1024px+ (iPad landscape, desktop), ingredients and instructions display side-by-side so a chef can see both without scrolling. Below 1024px (iPad portrait, phone), they stack vertically. This respects the primary kitchen device (tablet) while remaining usable on smaller screens.

The LoginScreen demonstrates the auth flow with 6 demo users (3 per organization, one per role tier). Sign out + sign in as a different user to test organization isolation.

### Deployment

**Docker:** Multi-stage Dockerfile following [Bun's official Docker guide](https://bun.sh/guides/ecosystem/docker):

1. `base` — Alpine-based Bun image (~50MB vs ~800MB Debian)
2. `install` — Installs deps into `/temp/dev` (all deps for building) and `/temp/prod` (production-only). This pattern caches dependency layers separately from source changes.
3. `build` — Copies dev `node_modules` from install stage, builds the React client
4. `production` — Fresh Alpine base, copies only prod `node_modules` + server source + built client. Non-root user, health check via `bun -e` (no curl needed).

**Final image size: 123MB** (123,286,419 bytes via `docker image inspect --format '{{.Size}}'`). Suitable for edge/SoM deployment. Breakdown: ~107MB Bun Alpine base, ~15.5MB production `node_modules`, ~0.3MB application source + built client.

**Single container:** The Hono server serves both the API and the static client build. No nginx, no reverse proxy — appropriate for the request volume.

**docker-compose.yml:** Named volume for SQLite persistence. Memory limited to 256 MiB, 1 CPU — reflects edge/SoM constraints.

```bash
docker compose up --build    # build and run
```

**Resource profile** (measured on Apple M1 via `docker stats --no-stream` and `docker image inspect`):

| Metric | Value |
|---|---|
| Image size | 123 MB |
| Idle memory (after seed) | ~21 MiB / 256 MiB limit |

The image comprises ~107MB Bun Alpine base, ~15.5MB production `node_modules` (Hono, Zod, and dependencies), and ~0.3MB application source + built client. This follows Bun's official Docker guide — Bun resolves imports at runtime from `node_modules`, keeping the deployment model simple and debuggable.

### Testing

**Server integration tests** (`bun test`):
- **Recipe API tests** (`recipes.test.ts`): Full CRUD lifecycle, validation edge cases (empty ingredients, invalid units like "pinch", negative quantities, zero yield, duplicate names), search behavior, soft-delete verification
- **Organization isolation tests** (`isolation.test.ts`): Cross-organization read/write/delete prevention, search isolation, per-organization name uniqueness

Each test gets a fresh in-memory SQLite database via the `createTestContext()` helper. No test pollution, no cleanup needed.

**Playwright E2E tests** (`packages/e2e/`):
- Login flow (login screen, sign in, sign out)
- Recipe display (list view, detail view with ingredients/instructions/yield, back button, logo navigation)
- Recipe search (by name with debounce, by ingredient, empty results, clear)
- Recipe create (with precise measurements, validation: missing ingredients, missing instructions, cancel without saving)
- Recipe edit (name change, ingredient replacement, cancel without saving)
- Recipe delete (via confirmation modal, cancel keeps recipe)
- Organization isolation (sign out + sign in as different org user)
- RBAC (viewer sees no create/edit/delete; member sees no delete; member can create)

## Future Considerations

**Not implemented, but noted for discussion:**

- **Offline-first:** For kitchen nodes with unreliable connectivity, a local-first architecture with sync (e.g., CRDTs or last-write-wins per recipe) would be valuable. The SQLite foundation makes this feasible — tools like Litestream or cr-sqlite could enable replication.

- **Bowl-building specialization:** The current model is a general recipe system. For automated kitchen systems, recipes could be structured with station-based steps (base, protein, toppings, sauce, garnish) and machine-specific parameters (temperature, dispense rate).

- **Identity provider integration:** The data model uses industry-standard naming (`organizations`, `org_id`, generic RBAC roles) compatible with any JWT-based identity provider. Integration requires replacing the header-based demo auth with JWT verification — no schema changes needed.

- **OpenAPI / Swagger documentation:** The existing Zod validation schemas are a natural foundation for OpenAPI spec generation. Hono's `@hono/zod-openapi` middleware can derive a full OpenAPI 3.1 spec from our route definitions and Zod schemas, enabling auto-generated API documentation and client SDK generation.

- **Recipe versioning:** For a production kitchen, recipe changes should be auditable. An append-only version history per recipe would enable rollback and audit trails.

- **Nutritional data:** Ingredient-level nutritional information with automatic per-recipe totals.

- **Full RBAC with organization management:** Currently the three roles (`admin`, `member`, `viewer`) only differ at the recipe level — admin can delete, member can create/edit, viewer is read-only. In a production system, `admin` should additionally manage the organization itself: invite and remove users, assign roles, configure organization settings (branding, plan tier, feature flags via the `metadata` column). These are the capabilities that justify a separate admin tier beyond "head chef who can also delete recipes." Server-side role enforcement (returning 403 for unauthorized actions) would replace the current UI-only approach.

- **Ingredient catalog:** Currently, ingredient names are freeform strings on each recipe — "Chicken breast, grilled" in one recipe and "Grilled chicken breast" in another are treated as different ingredients. A normalized `ingredients_catalog` table per organization (`id`, `org_id`, `name`, `default_unit`, `metadata`) would serve as the single source of truth for ingredient names. Recipe ingredients would reference the catalog by ID instead of storing freeform strings, eliminating typos and name mismatches. This catalog is also the foundation for the inventory system below — inventory tracks stock of catalog entries, and capacity calculations can reliably cross-reference recipes against inventory without fuzzy string matching.

- **Ingredient inventory and capacity planning:** An inventory system that tracks on-hand quantities of catalog ingredients per organization would enable capacity calculations — given current stock, how many of each bowl can the kitchen produce? A capacity endpoint would cross-reference recipe ingredients against inventory to return a maximum producible count per recipe. For a robot kitchen, this is critical for automated ordering and preventing mid-service stockouts.

  Proposed schema:

  **`inventory`**

  | Field | Type | Description |
  |---|---|---|
  | `id` | TEXT PK | UUID identifier |
  | `org_id` | TEXT FK → organizations | Organization ownership |
  | `catalog_id` | TEXT FK → ingredients_catalog | References the ingredient catalog entry |
  | `quantity_on_hand` | REAL | Current stock level |
  | `unit` | TEXT | Measurement unit (g, kg, mL, L, each) |
  | `reorder_threshold` | REAL | Quantity at which to trigger reorder alert |
  | `metadata` | TEXT | JSON (supplier info, lot numbers, expiry dates) |
  | `created_at` | TEXT | Creation timestamp |
  | `updated_at` | TEXT | Last inventory update |

- **Order support with prep time tracking:** An order system where each order contains multiple line items, each mapping to a recipe. The flow is minimal for kitchen staff: pick up an order item, prepare the bowl, mark it done. One tap to start, one tap to finish — no per-step interruptions. The system records actual prep time per bowl, enabling comparison against expected totals (sum of `instructions.duration_seconds`). Over time this reveals which recipes are consistently underestimated and informs scheduling and staffing decisions.

  Proposed schema:

  **`orders`**

  | Field | Type | Description |
  |---|---|---|
  | `id` | TEXT PK | UUID identifier |
  | `org_id` | TEXT FK → organizations | Organization ownership |
  | `status` | TEXT | `pending`, `in_progress`, `completed`, `cancelled` |
  | `created_by` | TEXT FK → users | Who placed or received the order |
  | `metadata` | TEXT | JSON (source system, customer info, table number) |
  | `created_at` | TEXT | When the order was received |
  | `updated_at` | TEXT | Last status change |
  | `completed_at` | TEXT | When all items finished prep |

  **`order_items`**

  | Field | Type | Description |
  |---|---|---|
  | `id` | TEXT PK | UUID identifier |
  | `order_id` | TEXT FK → orders CASCADE | Parent order |
  | `recipe_id` | TEXT FK → recipes | Which recipe (bowl) to prepare |
  | `quantity` | INTEGER | How many of this bowl |
  | `status` | TEXT | `pending`, `in_progress`, `completed` |
  | `started_at` | TEXT | When the cook began this bowl |
  | `completed_at` | TEXT | When the cook finished |

  Expected duration is computed in memory from `SUM(instructions.duration_seconds)` for the recipe — no need to denormalize it into the order. If recipe durations change after an order is placed, recipe versioning (also in future considerations) would handle historical accuracy.

  Per-step timing is intentionally omitted — asking kitchen staff to tap through each instruction step during service is impractical. Step-level telemetry would come from the robot's firmware, not from human interaction with this application.
