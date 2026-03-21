# @recipe-mgmt/server

Hono API server for recipe management. Scaffolded with `bun create hono --template bun`.

## Development

```bash
# Start with hot reload
bun run dev
# Server listens on http://localhost:3000

# Start without hot reload
bun run start
```

`bun run dev` uses `bun run --hot` which preserves the running process and reloads changed modules in-place — faster than `--watch` which restarts the full process. Edits to source files take effect immediately without dropping active connections.

On first start, the server seeds demo data (2 organizations, 6 users, 8 recipes) if the database is empty.

## Testing

```bash
bun test
```

Tests across 2 files:

- `tests/integration/recipes.test.ts` — Full CRUD lifecycle, validation edge cases, search
- `tests/integration/isolation.test.ts` — Cross-organization isolation (read, write, update, delete, search)

Each test gets a fresh in-memory SQLite database via `createTestContext()`. No cleanup needed, no test pollution.

## API Endpoints

All `/api/recipes/*` endpoints require auth headers (see Authentication below).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/recipes` | List recipes (paginated) |
| `GET` | `/api/recipes/search?q=` | Search by recipe name or ingredient |
| `GET` | `/api/recipes/:id` | Full recipe detail |
| `POST` | `/api/recipes` | Create recipe |
| `PUT` | `/api/recipes/:id` | Update recipe (partial) |
| `DELETE` | `/api/recipes/:id` | Soft-delete recipe |

### Query Parameters

- `limit` — Max results (default: 50, max: 100)
- `offset` — Pagination offset (default: 0)
- `q` — Search query (required for `/search`)

## Authentication (Demo)

Auth uses demo header-based context. In production, these would come from JWT validation via an identity provider.

```bash
curl -H "X-Org-ID: org-bowlandsoul" \
     -H "X-User-ID: user-maria-santos" \
     http://localhost:3000/api/recipes
```

| Header | Required | Description |
|---|---|---|
| `X-Org-ID` | Yes | Organization ID — scopes all data access |
| `X-User-ID` | Yes | User ID |
| `X-User-Role` | No | `admin`, `member`, or `viewer` (default: `viewer`) |

Missing `X-Org-ID` or `X-User-ID` returns `401`.

### Demo Organizations & Users

**Bowl & Soul** (`org-bowlandsoul`) — 5 recipes:

| User ID | Name | Role |
|---|---|---|
| `user-maria-santos` | Maria Santos | `admin` (Owner/Manager) |
| `user-james-chen` | James Chen | `member` (Head Chef) |
| `user-jordan-kim` | Jordan Kim | `viewer` (Line Cook) |

**Green Machine** (`org-greenmachine`) — 3 recipes:

| User ID | Name | Role |
|---|---|---|
| `user-alex-rivera` | Alex Rivera | `admin` (Owner/Manager) |
| `user-priya-patel` | Priya Patel | `member` (Head Chef) |
| `user-casey-brooks` | Casey Brooks | `viewer` (Prep Cook) |

## Example: Create a Recipe

```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -H "X-Org-ID: org-bowlandsoul" \
  -H "X-User-ID: user-maria-santos" \
  -d '{
    "name": "Spicy Tuna Bowl",
    "description": "Seared tuna over sushi rice with spicy mayo",
    "yieldAmount": 400,
    "yieldUnit": "g",
    "ingredients": [
      { "name": "Sushi rice", "quantity": 200, "unit": "g" },
      { "name": "Seared tuna", "quantity": 120, "unit": "g" },
      { "name": "Spicy mayo", "quantity": 20, "unit": "mL" },
      { "name": "Avocado, sliced", "quantity": 50, "unit": "g" },
      { "name": "Sesame seeds", "quantity": 5, "unit": "g" }
    ],
    "instructions": [
      { "stepNumber": 1, "description": "Place sushi rice as base", "durationSeconds": 10 },
      { "stepNumber": 2, "description": "Arrange seared tuna slices", "durationSeconds": 15 },
      { "stepNumber": 3, "description": "Add avocado and drizzle spicy mayo", "durationSeconds": 10 },
      { "stepNumber": 4, "description": "Garnish with sesame seeds", "durationSeconds": 5 }
    ]
  }'
```

## Valid Measurement Units

Ingredients use strict units only — no freeform strings.

| Unit | Type | Description |
|---|---|---|
| `g` | Mass | Grams |
| `kg` | Mass | Kilograms |
| `mL` | Volume | Milliliters |
| `L` | Volume | Liters |
| `each` | Count | Discrete items |

Yield additionally supports `servings` and `pieces`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DB_PATH` | `recipe-management.db` | SQLite database file path |
| `NODE_ENV` | — | Set to `production` to serve static client |
| `STATIC_DIR` | `packages/client/dist` | Path to built client (production only) |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |

## Project Structure

```
src/
├── index.ts              # Entrypoint
├── app.ts                # App factory (testable)
├── db/
│   ├── schema.ts         # SQLite table definitions
│   ├── connection.ts     # Database connection management
│   ├── repository.ts     # Organization-scoped query layer
│   └── seed.ts           # Demo data seeder
├── middleware/
│   └── auth.ts           # Demo auth (header-based org context)
├── routes/
│   ├── health.ts         # Health check endpoint
│   └── recipes.ts        # Recipe CRUD + search routes
└── services/
    └── recipe.ts         # Business logic (name uniqueness, user validation, etc.)
tests/
├── helpers.ts            # Test context factory, seed helpers
└── integration/
    ├── recipes.test.ts   # API integration tests
    └── isolation.test.ts # Organization isolation tests
```

## Architecture & Design Decisions

### Layered Architecture

The server follows a strict layered architecture where each layer has a single responsibility:

```
Routes → Service → Repository → SQLite
```

- **Routes** (`routes/recipes.ts`) handle HTTP concerns: parse request parameters, validate input via Zod schemas, and format responses. No business logic.
- **Service** (`services/recipe.ts`) enforces business rules: duplicate name checks, user existence validation, and organization scoping. Returns typed `ServiceResult<T>` objects (success or error with status code) — routes never throw.
- **Repository** (`db/repository.ts`) owns all SQL. Every query is scoped by `org_id` and filtered by `WHERE deleted_at IS NULL`. Converts snake_case SQL rows to camelCase TypeScript types via mapper functions.

This separation means you can test each layer independently. The service doesn't know about HTTP; the repository doesn't know about business rules.

### App Factory Pattern

`app.ts` exports a `createApp(options)` function rather than a global app instance. This enables:

- **Test isolation**: Each test creates a fresh app with an in-memory SQLite database. No shared state, no cleanup, no mocking.
- **Configuration injection**: The database, logging, and static file serving are configurable per environment.
- **Multiple instances**: Could run multiple app instances in the same process if needed (e.g., for benchmarking).

### Organization Isolation

Multi-tenancy is enforced at every layer, not just the middleware:

1. **Middleware** extracts `org_id` from request headers and sets it on the Hono context.
2. **Service** requires `orgId` as the first parameter on every method.
3. **Repository** includes `WHERE org_id = ?` in every SQL query.

Cross-organization access returns `404` (not `403`) to avoid leaking the existence of resources to unauthorized organizations. This is verified by dedicated isolation tests that create two organizations and confirm neither can read, update, delete, or search the other's data.

### SQLite Without an ORM

At this scale (<1K recipes, <10K requests/day), a thin typed repository layer with raw SQL is simpler and more transparent than an ORM:

- **Queries are visible**: Every SQL statement is in the repository, easy to read and debug.
- **No migration tooling**: Schema uses `CREATE TABLE IF NOT EXISTS` — appropriate for an embedded database.
- **Type safety without magic**: Row interfaces map SQL columns to TypeScript types via explicit mapper functions. No decorator metadata, no query builder DSL.
- **Transactions are explicit**: `db.transaction()` wraps recipe creation (recipe + ingredients + instructions) in a single atomic operation.

### Soft Deletes

Top-level entities (organizations, users, recipes) use `deleted_at` timestamps instead of hard deletes. Benefits:

- **Auditability**: Deleted records are preserved for forensic or recovery purposes.
- **Referential safety**: Child records (ingredients, instructions) remain intact. No orphaned foreign keys.
- **Query simplicity**: All read queries add `WHERE deleted_at IS NULL`. Partial indexes (`WHERE deleted_at IS NULL`) keep query performance unaffected.

Child entities use CASCADE hard deletes since they're always replaced atomically when the parent recipe is updated.

### Timestamp Consistency

All application-generated timestamps use a `sqliteNow()` helper that produces `YYYY-MM-DD HH:MM:SS` format, matching SQLite's `datetime('now')` default. This prevents sorting and comparison issues between JavaScript's `toISOString()` (which produces `2026-03-21T13:18:05.000Z`) and SQLite's format.

### Validation at the Boundary

Zod schemas in `@recipe-mgmt/shared` validate all API input at the route level. Invalid data never reaches the service or repository:

- Recipe names must be 1-300 characters
- Quantities must be positive finite numbers
- Units are constrained to a strict enum (`g`, `kg`, `mL`, `L`, `each`)
- At least one ingredient and one instruction required
- Updates validate that at least one field is provided

The same schemas are available to the client for form validation, ensuring both sides enforce the same rules.
