# Recipe Management

Multi-tenant recipe management system for a commercial kitchen platform. Manages bowl-building recipes with precise, machine-readable measurements across competing restaurant organizations.

We use the term **organization** (not tenant) to follow industry-standard multi-tenancy naming conventions. Each organization represents a business customer — in our case, a restaurant. The `org_id` column scopes all data access, ensuring competing restaurants cannot see each other's data.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- [Docker](https://www.docker.com/products/docker-desktop/) (optional, for containerized deployment)

### Local Development

```bash
# Install all workspace dependencies
bun install

# Start server (port 3000) and client (port 5173) concurrently
bun run dev

# Or start them individually
bun run dev:server    # API at http://localhost:3000
bun run dev:client    # UI at http://localhost:5173
```

The server uses `bun --hot` for in-place module reloading. The client uses Vite HMR with React Fast Refresh. Both update instantly on file save. The client dev server proxies `/api` requests to the server, so open http://localhost:5173 during development.

### Run Tests

```bash
# Server integration tests
bun run test:server

# E2E tests via Playwright
bun run test:e2e

# All unit/integration tests across workspaces
bun run test
```

### Docker

```bash
# Build and run with Docker Compose
docker compose up --build

# Run in background
docker compose up --build -d

# Stop
docker compose down

# Stop and remove data volume
docker compose down -v
```

The container serves both the API and the built client at http://localhost:3000.

## Project Structure

```
recipe-management/
├── packages/
│   ├── shared/          # Types, validation schemas, measurement units
│   ├── server/          # Hono API server (bun create hono)
│   ├── client/          # React UI (bun create vite)
│   └── e2e/             # Playwright end-to-end tests
├── design/
│   └── ARCHITECTURE.md  # Architecture decisions and design doc
├── Dockerfile           # Multi-stage Alpine build (~123MB image)
└── docker-compose.yml   # Single-service deployment for kitchen nodes
```

Bun workspaces link the packages. `@recipe-mgmt/shared` is consumed by both server and client.

## Multi-Tenancy Demo

The app shows a login screen with 6 demo users across 2 organizations:

**Bowl & Soul** (5 recipes: Teriyaki Chicken, Ahi Tuna Poke, Korean Bibimbap, Mediterranean Falafel, Chipotle Burrito):

| User | Role | Permissions |
|---|---|---|
| Maria Santos | Admin | Full access |
| James Chen | Member | View, create, edit |
| Jordan Kim | Viewer | View only |

**Green Machine** (3 recipes: Vegan Power, Roasted Tofu Grain, Chickpea & Farro Mediterranean):

| User | Role | Permissions |
|---|---|---|
| Alex Rivera | Admin | Full access |
| Priya Patel | Member | View, create, edit |
| Casey Brooks | Viewer | View only |

Tap a user card to sign in. Sign out and sign in as a different user to see organization isolation and RBAC in action.

## Key Design Decisions

- **Bun runtime** — Native TypeScript, built-in SQLite, built-in test runner. Single runtime for dev and prod.
- **SQLite via `bun:sqlite`** — Embedded file-based database, no separate process. Sufficient for <1K recipes and <10K requests/day. JSON metadata columns with `CHECK (json_valid(metadata))`.
- **No ORM** — Thin typed repository layer with raw SQL. Less overhead, easier to debug at this scale.
- **Precise measurement units** — Strict enum (`g`, `kg`, `mL`, `L`, `each`). No freeform "pinch" or "dash" — a robot needs exact quantities.
- **Organization-based multi-tenancy** — `organizations` table with `org_id` foreign keys. User roles (`admin`, `member`, `viewer`) provide RBAC. Auth uses demo header-based context, ready for any JWT-based identity provider.
- **Organization isolation** — Every query is scoped by `org_id`. Cross-organization access returns 404 (not 403) to avoid leaking resource existence.
- **Consistent meta fields** — All tables have `id`, `created_at`, `updated_at`. Top-level entities add `deleted_at` (soft deletes) and `metadata` (validated JSON).
- **Docker with Alpine** — 123MB image, ~21 MiB idle memory. Suitable for SoM/edge deployment.

See [design/ARCHITECTURE.md](design/ARCHITECTURE.md) for the full architecture document.
