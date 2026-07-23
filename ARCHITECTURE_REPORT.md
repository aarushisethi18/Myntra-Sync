# Myntra-Sync Architecture Report

Generated after inspecting the repository on 2026-07-17.

## 1. Current Folder Structure

```text
Myntra-Sync/
+-- apps/
|   +-- api/
|   |   +-- requirements.txt
|   |   +-- app/
|   |       +-- main.py
|   |       +-- core/
|   |       +-- models/
|   |       +-- routes/
|   |       |   +-- context.py
|   |       |   +-- health.py
|   |       +-- schemas/
|   |       +-- services/
|   +-- web/
|       +-- package.json
|       +-- vite.config.ts
|       +-- components.json
|       +-- src/
|           +-- App.tsx
|           +-- main.tsx
|           +-- assets/
|           +-- components/
|           |   +-- ContextCard.tsx
|           |   +-- ui/button.tsx
|           +-- lib/utils.ts
|           +-- pages/HomePage.tsx
|           +-- services/contextService.ts
|           +-- styles/globals.css
|           +-- types/context.ts
+-- assets/
+-- config/
+-- database/
|   +-- migrations/init.sql
|   +-- schema/schema.md
|   +-- seeds/seed.sql
+-- docs/
+-- packages/
|   +-- shared-types/index.ts
+-- scripts/
+-- package.json
+-- package-lock.json
+-- README.md
```

### Observations

- The repository is arranged as a small monorepo with `apps/api`, `apps/web`, `packages/shared-types`, and `database`.
- Several folders are placeholders only: `assets`, `config`, `docs`, `scripts`, and most backend subfolders under `app`.
- The frontend is a Vite + React + Tailwind app.
- The backend is a FastAPI app, but it currently serves hardcoded data and does not connect to the SQL schema.

## 2. Existing APIs

### Backend: FastAPI

Defined in `apps/api/app/main.py`.

| Method | Path | File | Purpose | Current Data Source |
|---|---|---|---|---|
| `GET` | `/health` | `apps/api/app/routes/health.py` | Health check | Static response |
| `GET` | `/context` | `apps/api/app/routes/context.py` | Returns a complete user context snapshot | Hardcoded Python dictionary |

### `GET /health`

Returns:

```json
{
  "status": "ok",
  "message": "Myntra-Sync API is running"
}
```

### `GET /context`

Returns a combined context object containing:

- `user`
- `weather`
- `upcomingEvents`
- `wardrobe`
- `recommendations`
- `notifications`

Current response is mock data only. It does not query users, wardrobe items, calendar events, weather, products, recommendations, or notifications from the database.

### Frontend API Client

Defined in `apps/web/src/services/contextService.ts`.

- Hardcoded base URL: `http://localhost:8000`
- Function: `getContext(): Promise<ContextResponse>`
- Calls `GET /context`
- Throws `Failed to fetch context` on non-2xx responses

## 3. Database Models

The database schema is defined in `database/migrations/init.sql`.

### Implemented Tables

| Table | Purpose |
|---|---|
| `users` | Stores user identity, location, budget, style, color, and brand preferences |
| `wardrobe` | Stores clothing items already owned by a user |
| `calendar_events` | Stores upcoming user events |
| `weather_context` | Stores city-level weather context |
| `products` | Stores catalog products available for recommendation |
| `recommendations` | Stores generated recommendations linking users to products |
| `notifications` | Stores proactive notification messages |

### Relationships

- `wardrobe.user_id` -> `users.id`
- `calendar_events.user_id` -> `users.id`
- `recommendations.user_id` -> `users.id`
- `recommendations.product_id` -> `products.id`
- `notifications.user_id` -> `users.id`
- `weather_context` is independent and related by city/date rather than a foreign key.

### Documented But Missing From Migration

`database/schema/schema.md` documents a `fashion_profile` table, but `database/migrations/init.sql` does not create it.

Expected fields from the schema document:

- `id`
- `user_id`
- `dominant_style`
- `fashion_personality`
- `favorite_color`
- `average_spend`
- `updated_at`

This is a schema drift issue: documentation and executable migration are not aligned.

## 4. Schemas

### Backend Schemas

`apps/api/app/schemas` exists but contains only `__init__.py`.

There are currently no Pydantic request or response schemas. FastAPI responses are plain dictionaries, so the API contract is not validated or centrally defined.

### Frontend Schemas / Types

Defined in `apps/web/src/types/context.ts`.

The frontend defines `ContextResponse` for:

- user
- weather
- upcoming events
- wardrobe
- recommendations
- notifications

However:

- `wardrobe` is typed as `unknown[]`
- `notifications` is typed as `unknown[]`
- Event shape uses `startTime` and `endTime`, while the database uses `event_date`
- Recommendation confidence is typed as `number`, while database migration uses `INTEGER` and the mock API returns `0.96`

### Shared Types

Defined in `packages/shared-types/index.ts`.

This package defines richer domain interfaces:

- `User`
- `Weather`
- `CalendarEvent`
- `WardrobeItem`
- `Recommendation`
- `Notification`
- `ContextSnapshot`

But the frontend does not currently import from `packages/shared-types`. Instead, it duplicates a narrower `ContextResponse` locally.

## 5. Services

### Backend Services

`apps/api/app/services` exists but is empty.

There is no service layer for:

- context aggregation
- recommendation generation
- user profile retrieval
- wardrobe analysis
- weather lookup
- notification generation
- product matching

### Frontend Services

`apps/web/src/services/contextService.ts` is the only service module.

Responsibilities:

- Calls the backend `/context` endpoint
- Parses JSON response
- Provides the result to `HomePage`

Missing frontend service concerns:

- environment-based API URL
- typed error objects
- retry/caching despite `@tanstack/react-query` being installed
- endpoint-specific service modules beyond context

## 6. Repository Pattern

No repository pattern is currently implemented.

There are no backend modules such as:

- `repositories/user_repository.py`
- `repositories/wardrobe_repository.py`
- `repositories/recommendation_repository.py`
- `db/session.py`
- `db/base.py`

SQLAlchemy is installed in `apps/api/requirements.txt`, but no engine, session, ORM model, or repository abstraction is present.

Recommended repository boundaries:

| Repository | Responsibility |
|---|---|
| `UserRepository` | Read/update user profile and preferences |
| `WardrobeRepository` | Fetch and mutate wardrobe items |
| `CalendarRepository` | Fetch upcoming events by user/date |
| `WeatherRepository` | Fetch weather context by city/date |
| `ProductRepository` | Search/filter product catalog |
| `RecommendationRepository` | Persist and retrieve generated recommendations |
| `NotificationRepository` | Create, list, and mark notifications as read |

## 7. Missing Architecture

### Backend

- Database connection/session management
- SQLAlchemy ORM models or SQLModel models
- Pydantic schemas for API input/output
- Repository layer
- Service layer
- Environment-based configuration
- Alembic migrations or another migration runner
- Auth/user identity handling
- Error handling strategy
- Logging
- API versioning, for example `/api/v1`
- Dependency injection for database sessions
- Tests for routes/services/repositories

### Frontend

- API base URL from environment variables
- React Query usage, despite dependency being installed
- Shared type consumption from `packages/shared-types`
- UI states beyond basic loading/error
- Domain-specific pages beyond the single context card
- Form/input flows for wardrobe, preferences, events, or notifications
- Consistent design system usage beyond one button component

### Monorepo

- Root workspace configuration is missing.
- Root `package.json` contains dependencies but no scripts/workspaces.
- `packages/shared-types` has no package manifest, build setup, or explicit import path.
- No unified lint/test/build orchestration.

### Data / AI Layer

- No actual recommendation engine.
- No ranking/scoring service.
- No weather/calendar integrations.
- No personalization profile update flow.
- No product ingestion or catalog search API.

## 8. Technical Debt

| Area | Debt |
|---|---|
| API data | `/context` returns hardcoded mock data |
| Schema drift | `fashion_profile` is documented but not created in SQL |
| Type drift | Backend response, frontend types, shared types, and SQL schema do not fully match |
| Confidence type | API returns decimal confidence, DB stores integer confidence |
| Event shape | API/frontend use `startTime` and `endTime`, DB stores only `event_date` |
| User seed drift | Seed user is `Ananya Paliwal`; mock API user is `Aarushi` |
| Encoding artifacts | Some files show mojibake in rendered symbols, including temperature separators and arrows |
| Config | API URL and CORS origin are hardcoded |
| Dependencies | SQLAlchemy and React Query are installed but mostly unused |
| Generated files | `__pycache__` files exist under `apps/api/app` and should remain ignored/unmodified |
| Tests | No visible test suite for backend, frontend, or database behavior |
| Error handling | Backend routes do not expose domain errors or typed failure responses |

## 9. Suggested Implementation Order

1. **Normalize contracts**
   - Decide the canonical `ContextSnapshot` shape.
   - Align backend response, frontend types, shared types, and database fields.
   - Resolve `confidence` as either `0-1` decimal or `0-100` integer.

2. **Add backend schemas**
   - Create Pydantic response models in `apps/api/app/schemas`.
   - Apply `response_model` to `/health` and `/context`.

3. **Add database infrastructure**
   - Add database settings in `app/core`.
   - Add SQLAlchemy engine/session dependency.
   - Add ORM models matching `database/migrations/init.sql`.

4. **Introduce repositories**
   - Add repository classes for users, wardrobe, events, weather, products, recommendations, and notifications.
   - Keep SQL/database access out of route files.

5. **Build a context service**
   - Move `/context` aggregation into `ContextService`.
   - Fetch user, weather, events, wardrobe, recommendations, and notifications through repositories.

6. **Connect `/context` to real data**
   - Replace hardcoded mock response.
   - Start with seeded data.
   - Add a predictable development user ID or user lookup strategy.

7. **Fix frontend data fetching**
   - Move API URL to `VITE_API_BASE_URL`.
   - Use React Query for loading/error/cache behavior.
   - Import shared types or generate types from OpenAPI.

8. **Add tests**
   - Backend route tests for `/health` and `/context`.
   - Service tests for context aggregation.
   - Repository tests against a test database.
   - Frontend component tests for loading, error, and populated states.

9. **Add recommendation logic**
   - Implement a simple deterministic ranking service first.
   - Use weather, event type, budget, wardrobe overlap, and style preferences.
   - Persist recommendations and notifications after generation.

10. **Clean repository hygiene**
    - Remove generated cache files from tracked scope if they are tracked.
    - Fix encoding artifacts.
    - Add root workspace scripts for build/lint/test.

## 10. Files That Should Not Be Modified Casually

These files/directories should be left alone unless the change specifically requires them:

| Path | Reason |
|---|---|
| `.git/` | Git internals |
| `node_modules/` | Installed dependencies; regenerate via package manager |
| `apps/web/node_modules/` | Installed frontend dependencies; regenerate via package manager |
| `apps/api/app/**/__pycache__/` | Generated Python bytecode cache |
| `package-lock.json` | Modify only when root dependencies change |
| `apps/web/package-lock.json` | Modify only when frontend dependencies change |
| `LICENSE` | Legal file |
| `apps/web/src/assets/vite.svg` | Default scaffold asset; remove intentionally or leave untouched |
| `apps/web/public/favicon.svg` | Branding asset; change only with product branding work |
| `apps/web/public/icons.svg` | Public icon sprite/asset; change only with design-system intent |
| `database/migrations/init.sql` | Baseline migration; modify carefully or add a new migration once migration strategy exists |
| `database/seeds/seed.sql` | Seed data; modify only when intentionally changing demo state |

## 11. High-Level Target Architecture

```text
React Web App
  +-- services/contextService.ts
      +-- FastAPI /api/v1/context
          +-- ContextService
              +-- UserRepository
              +-- WardrobeRepository
              +-- CalendarRepository
              +-- WeatherRepository
              +-- ProductRepository
              +-- RecommendationRepository
              +-- NotificationRepository
                  +-- SQLAlchemy Session
                      +-- PostgreSQL schema from database/migrations
```

## 12. Summary

The repository has a good MVP skeleton: monorepo layout, FastAPI backend, Vite React frontend, shared type intent, and a thoughtful SQL schema. The main architectural gap is that these layers are not connected yet. The next most valuable move is to make the API contract canonical, add backend schemas and database access, then move the hardcoded `/context` data into a real service/repository-backed flow.
