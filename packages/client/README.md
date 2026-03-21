# @recipe-mgmt/client

React frontend for recipe management. Scaffolded with `bun create vite --template react-ts`.

Designed for kitchen readability: large text, high contrast, touch-friendly targets, card-based layout.

## Development

```bash
# Start Vite dev server with HMR
bun run dev
# Client at http://localhost:5173
```

Vite provides Hot Module Replacement with React Fast Refresh — component changes update in the browser instantly without a page reload or state loss.

The Vite dev server proxies `/api` requests to `http://localhost:3000`, so the server must be running for API calls to work. See the root README for how to run both services together.

## Build

```bash
# Type-check and build for production
bun run build

# Preview the production build locally
bun run preview
```

Output goes to `dist/`. In production, the server serves these files as static assets.

## Lint

```bash
bun run lint
```

## Login Flow

The app shows a login screen on first visit with 6 demo users across 2 organizations. Tap a user card to sign in. The user menu in the top-right header shows the current user and provides a sign out button.

**Bowl & Soul** (5 recipes):
| User | Role | Permissions |
|---|---|---|
| Maria Santos | Admin | Full access (create, edit, delete) |
| James Chen | Member | View, create, edit |
| Jordan Kim | Viewer | View only |

**Green Machine** (3 recipes):
| User | Role | Permissions |
|---|---|---|
| Alex Rivera | Admin | Full access |
| Priya Patel | Member | View, create, edit |
| Casey Brooks | Viewer | View only |

UI buttons (New Recipe, Edit, Delete) are shown/hidden based on the signed-in user's role. In production, the session would come from JWT validation via an identity provider.

## Project Structure

```
src/
├── main.tsx                # Entry point (React root)
├── App.tsx                 # Main app with view routing
├── index.css               # Kitchen-friendly global styles
├── api/
│   └── client.ts           # Typed fetch wrapper, organization-aware
├── hooks/
│   ├── useRecipes.ts       # TanStack Query hooks for list, detail, search, mutations
│   └── useDebounce.ts      # Generic debounce hook for search input
└── components/
    ├── Layout.tsx           # Header + main content wrapper
    ├── LoginScreen.tsx      # Auth gate with demo user cards per org
    ├── UserMenu.tsx         # Top-right dropdown (user name, org, sign out)
    ├── ConfirmModal.tsx     # Reusable confirmation dialog for destructive actions
    ├── SearchBar.tsx        # Recipe/ingredient search (controlled)
    ├── RecipeList.tsx       # Grid of recipe cards with retry on error
    ├── RecipeCard.tsx       # Summary card (name, yield, counts — no destructive actions)
    ├── RecipeDetail.tsx     # Full recipe view with RBAC-gated edit/delete
    └── RecipeForm.tsx       # Create/edit form with dynamic rows
```

## UI Design Principles

- **18px+ base font** for readability on kitchen displays and tablets
- **44px+ touch targets** on all interactive elements
- **High contrast** for visibility under bright kitchen lighting
- **Card-based layout** with clear section hierarchy
- **Precise measurements** displayed prominently (quantity + unit, no freeform text)
- **Numbered instruction steps** with optional duration badges
