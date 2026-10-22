# Knowledge

Orientation for coding agents working in this repository.

## Stack

- Server: Node.js ESM, Express 4, Mongoose 8, MongoDB, Zod 4, JSON Web Tokens, helmet, express-rate-limit, morgan (development only).
- Client: Vite 8, React 18, React Router 6, Tailwind CSS 3.4, axios, lucide-react, react-hot-toast, @fontsource-variable/inter, clsx, tailwind-merge.
- JavaScript only. No TypeScript, no test framework, no Docker.
- One repository, two apps, a root `package.json` that only orchestrates.

## Folder map

- `server/src/index.js`: process entry. Connects the database, listens, starts keep-alive, handles shutdown.
- `server/src/app.js`: Express middleware order. Helmet, CORS, JSON limit, cookie parser, health routes, global limiter, API routes, 404, error handler.
- `server/src/config/env.js`: validates every environment variable with Zod. The server exits on an invalid configuration.
- `server/src/routes/index.js`: mounts `/auth`, `/users` and `/items`. Add new routers here.
- `server/src/{models,validators,controllers,routes}`: one file per concern, one module per domain.
- `server/src/middleware/auth.js`: `protect` (bearer token) and `restrictTo(...roles)`.
- `server/src/middleware/error.js`: single error response shape. Stacks only outside production.
- `server/src/utils/tokens.js`: access and refresh signing, token hashing, refresh cookie options, five-session cap.
- `client/src/App.jsx`: route table. Every page is inside `AppLayout`; auth pages are inside `GuestRoute` and `AuthLayout`.
- `client/src/api/http.js`: axios instance, bearer header, single-flight refresh, one retry per request.
- `client/src/lib/tokenStore.js`: the only place the access token is stored, in memory.
- `client/src/context/AuthContext.jsx`: `user`, `loading`, `login`, `register`, `logout`, `updateUser`, plus the bootstrap refresh.
- `client/src/components/ui/`: the shared primitives. Do not rewrite them per page.
- `client/src/pages/Dashboard.jsx`: the reference CRUD page. Copy it for new modules.
- `docs/ARCHITECTURE.md`: file tree, flows, API contract, module recipes.
- `theme.md`: design tokens and UI rules. Read it before changing the interface.

## Commands

```bash
npm run install:all          # root, server and client dependencies
npm run seed --prefix server # create or promote the admin
npm run dev                  # API on 5000 and client on 5173
npm run build                # client production build
npm start                    # server only, uses NODE_ENV
```

- The client always uses port 5173 from `vite.config.js` (`strictPort`). Do not read `PORT` in client code.
- The Vite dev server proxies `/api` to `http://localhost:5000`.
- If the shell exports `PORT`, prefix commands with `PORT=5000`.
- Pin React 18, React Router 6 and Tailwind 3 when reinstalling. Newer majors break the existing code.

## Conventions

- Server: ESM with explicit `.js` extensions. Validate in `validators/`, act in `controllers/`, wire in `routes/`. Controllers use `asyncHandler` and throw `ApiError`.
- Every user-owned query filters by `owner: req.user.id`. Never trust an id from the client for ownership.
- Responses are `{ success, data, message? }`. Errors are `{ success: false, message, errors? }`.
- Models expose `id` through a `toJSON` transform and hide `_id` and `__v`. Keep new models consistent.
- Client data access goes through `client/src/api/*` and unwraps `response.data.data`.
- Use `getErrorMessage` and `getFieldErrors` from `client/src/lib/errors.js` for failures.
- Use `toast` for outcomes, `EmptyState` for empty and error screens, skeletons for loading lists.
- Styling uses token utilities from `theme.md`, `cn()` for conditional classes, and no hardcoded colors.
- Icons come from lucide-react. No emoji anywhere in code or UI.

## Rules

1. Match the existing item module and the Dashboard page when adding features. A new module is: model, validator, controller, routes file, one line in `routes/index.js`; then an api file, a page copied from `Dashboard.jsx`, a route in `App.jsx`, and a nav link in `Navbar.jsx`.
2. Never break the auth flow. The access token stays in memory, the refresh token stays in the httpOnly cookie at `path=/api/auth`, and `POST /api/auth/refresh` must keep rotating. Do not add `localStorage` or `sessionStorage`.
3. Keep the cookie options, CORS allowlist, rate limits and body size limit intact.
4. Do not add dependencies when an existing one covers the need. Do not add TypeScript, test frameworks or Docker.
5. Run `npm run build` after client changes and restart the server after server changes. Fix warnings rather than suppressing them.
