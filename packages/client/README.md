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
├── main.tsx                # Entry point (React root + QueryClientProvider)
├── App.tsx                 # Composition root — wires hooks to pages, manages navigation
├── index.css               # Kitchen-friendly global styles
├── api/
│   └── client.ts           # Typed fetch wrapper, session management
├── hooks/
│   ├── useRecipes.ts       # TanStack Query hooks for list, detail, search, mutations
│   └── useDebounce.ts      # Generic debounce hook for search input
├── pages/                  # Screen-level views (one per route/view)
│   ├── LoginPage.tsx        # Auth gate with demo user cards per organization
│   ├── RecipeListPage.tsx   # Toolbar + search + recipe card grid
│   ├── RecipeDetailPage.tsx # Full recipe view + delete confirmation modal
│   ├── RecipeCreatePage.tsx # New recipe form
│   └── RecipeEditPage.tsx   # Edit recipe form with pre-filled data
└── components/             # Reusable UI pieces (not tied to a specific page)
    ├── Layout.tsx           # Header + main content wrapper
    ├── UserMenu.tsx         # Top-right dropdown (user name, org, sign out)
    ├── ConfirmModal.tsx     # Confirmation dialog for destructive actions
    ├── SearchBar.tsx        # Debounced search input (controlled)
    ├── RecipeList.tsx       # Grid of recipe cards with retry on error
    ├── RecipeCard.tsx       # Summary card (name, yield, counts)
    ├── RecipeDetail.tsx     # Ingredients + instructions with RBAC-gated actions
    └── RecipeForm.tsx       # Create/edit form with dynamic ingredient/instruction rows
```

**Pages vs. Components:** Pages compose components into screen-specific layouts. A page knows which components to arrange and what data to pass them, but contains no reusable UI logic. Components are generic building blocks — `RecipeCard` doesn't know if it's on the list page or a search results page. This separation keeps components reusable and pages easy to understand at a glance.

## UI Design Principles

- **18px+ base font** for readability on kitchen displays and tablets
- **44px+ touch targets** on all interactive elements
- **High contrast** for visibility under bright kitchen lighting
- **Card-based layout** with clear section hierarchy
- **Precise measurements** displayed prominently (quantity + unit, no freeform text)
- **Numbered instruction steps** with optional duration badges
