# Architecture

The repository is a two-app monorepo: an Express API in `server/` and a React single-page app in `client/`. The root `package.json` only orchestrates install, dev and build. There is no shared code package; the client talks to the API over HTTP.

## File tree

```
.
├── .gitignore                     Ignores node_modules, .env files, build output and editor files
├── package.json                   Root scripts: install:all, dev, build, start
├── package-lock.json              Root lockfile (concurrently only)
├── README.md                      Setup, environment variables, scripts and deployment
├── theme.md                       Design tokens, typography, component and copy rules
├── knowledge.md                   Compact orientation for coding agents
├── docs/
│   └── ARCHITECTURE.md            This document
├── client/
│   ├── index.html                 Vite entry document, mounts #root
│   ├── package.json               Client dependencies and dev/build/preview scripts
│   ├── package-lock.json          Client lockfile
│   ├── vite.config.js             React plugin, @ alias, port 5173, /api proxy to :5000
│   ├── jsconfig.json              Editor path alias for @/*
│   ├── tailwind.config.js         Maps CSS variables to Tailwind color and font tokens
│   ├── postcss.config.js          Tailwind and autoprefixer plugins
│   ├── vercel.json                /api rewrite to Railway plus SPA fallback
│   ├── .env.example               VITE_API_URL=/api
│   └── src/
│       ├── main.jsx               React root, BrowserRouter, AuthProvider, Toaster
│       ├── App.jsx                Route table and toast styling
│       ├── index.css              Tailwind layers, CSS variable tokens, base styles, keyframes
│       ├── api/
│       │   ├── http.js            Axios instance, bearer interceptor, single-flight refresh, retry
│       │   ├── auth.api.js        register, login, refresh, logout, me
│       │   ├── users.api.js       updateProfile, changePassword, listUsers
│       │   └── items.api.js       listItems, getItem, createItem, updateItem, deleteItem
│       ├── lib/
│       │   ├── tokenStore.js      In-memory access token get/set/clear
│       │   ├── cn.js              clsx plus tailwind-merge class helper
│       │   └── errors.js          getErrorMessage and getFieldErrors from API errors
│       ├── context/
│       │   └── AuthContext.jsx    User state, bootstrap refresh, login, register, logout, updateUser
│       ├── hooks/
│       │   ├── useAuth.js         Context reader with a guard against use outside the provider
│       │   └── useDebounce.js     Debounced value hook used by the dashboard search
│       ├── components/
│       │   ├── ProtectedRoute.jsx Redirects signed-out users to /login and enforces roles
│       │   ├── GuestRoute.jsx     Redirects signed-in users away from /login and /register
│       │   ├── ui/
│       │   │   ├── Button.jsx     Variants primary, secondary, ghost, danger; sizes; loading state
│       │   │   ├── Input.jsx      Label, error, hint, aria wiring
│       │   │   ├── Textarea.jsx   Multiline equivalent of Input
│       │   │   ├── Select.jsx     Labeled native select with error and hint support
│       │   │   ├── Card.jsx       Bordered surface container
│       │   │   ├── Badge.jsx      Small status label with tone variants
│       │   │   ├── Modal.jsx      Dialog with Esc and backdrop close, scroll lock, focus handling
│       │   │   ├── ConfirmDialog.jsx Destructive confirmation built on Modal
│       │   │   ├── Spinner.jsx    Loading indicator
│       │   │   ├── EmptyState.jsx Icon, title, description and optional action
│       │   │   ├── Pagination.jsx Previous and next controls with page count
│       │   │   └── PageHeader.jsx Title, description and action slot
│       │   └── layout/
│       │       ├── AppLayout.jsx  Navbar, main container and footer with an Outlet
│       │       ├── AuthLayout.jsx Centered card shell for the auth pages
│       │       ├── Navbar.jsx     Brand, links, user menu, mobile menu
│       │       └── Footer.jsx     Single-line footer
│       └── pages/
│           ├── Home.jsx           Public landing page with signed-in and signed-out actions
│           ├── Login.jsx          Email and password form
│           ├── Register.jsx       Name, email and password form
│           ├── Dashboard.jsx      Reference CRUD page: search, filter, list, create, edit, delete, pagination
│           ├── Profile.jsx        Name form and password form
│           ├── AdminUsers.jsx     Paginated user table, admin only
│           └── NotFound.jsx       404 page with a link home
└── server/
    ├── package.json               Server dependencies and dev/start/seed scripts
    ├── package-lock.json          Server lockfile
    ├── .env.example               Environment template
    └── src/
        ├── index.js               Process entry: connect database, listen, keep-alive, graceful shutdown
        ├── app.js                 Express app: security middleware, routes, 404 and error handler
        ├── config/
        │   ├── env.js             Dotenv loading and Zod validation of every environment variable
        │   └── db.js              Mongoose connect and disconnect helpers
        ├── routes/
        │   ├── index.js           Mounts /auth, /users, /items under /api
        │   ├── auth.routes.js     register, login, refresh, logout, me
        │   ├── user.routes.js     profile, password, admin user list
        │   ├── item.routes.js     item CRUD with validation
        │   └── health.routes.js   GET /api/health, mounted outside the global rate limiter
        ├── controllers/
        │   ├── auth.controller.js Registration, login, refresh rotation, logout, current user
        │   ├── user.controller.js Profile update, password change, admin user listing
        │   ├── item.controller.js Owner-scoped item CRUD
        │   └── health.controller.js Status, uptime, timestamp and database state
        ├── middleware/
        │   ├── auth.js            protect verifies the access token; restrictTo enforces roles
        │   ├── validate.js        Runs a Zod schema against body, query or params
        │   ├── rateLimit.js       Global and auth-specific limiters
        │   ├── error.js           Maps errors to JSON responses, hides stacks in production
        │   └── notFound.js        Converts unmatched routes into a 404 ApiError
        ├── models/
        │   ├── User.js            Name, email, password hash, role, refresh token sessions
        │   └── Item.js            Title, description, status, owner reference
        ├── validators/
        │   ├── auth.validators.js Register and login schemas, shared password rules
        │   ├── user.validators.js Profile, password and user list query schemas
        │   └── item.validators.js Item create, update, id and list query schemas
        ├── utils/
        │   ├── ApiError.js        Error class carrying a status code and optional field errors
        │   ├── asyncHandler.js    Wraps async controllers so rejections reach the error handler
        │   ├── tokens.js          Access and refresh signing, hashing, cookie options, session cap
        │   └── keepAlive.js       Production self-ping of /api/health
        └── scripts/
            └── seed.js            Creates or promotes the admin user, then exits
```

## Request flow

1. The browser calls `/api/...`.
2. In development, Vite proxies `/api` to `http://localhost:5000`. In production on Vercel, the rewrite in `client/vercel.json` forwards `/api/:path*` to Railway.
3. Express runs `helmet`, `compression`, CORS, the JSON body parser with a 10 KB limit, and `cookie-parser`.
4. Health routes are mounted first, then the global rate limiter, then the API router.
5. Inside a router: `protect` verifies the bearer token and loads the user, `restrictTo` checks the role, `validate` parses the body, query or params with Zod.
6. The controller queries Mongoose and returns `{ success: true, data, message? }`.
7. Unknown routes become a 404 `ApiError`. `errorHandler` maps every error to `{ success: false, message, errors? }` and only includes `stack` outside production.

The client wraps all of this in `client/src/api/http.js`, which attaches the access token, unwraps `response.data.data`, and retries a request once after a silent refresh.

## Auth flow

1. Register or login creates a session: a 15-minute access JWT signed with `JWT_ACCESS_SECRET`, and a 7-day refresh JWT signed with `JWT_REFRESH_SECRET`.
2. The access token is returned in the response body and kept in memory by `client/src/lib/tokenStore.js`. Nothing is written to `localStorage` or `sessionStorage`.
3. The refresh token is set as an httpOnly cookie named `rt` with `path=/api/auth`, `sameSite` from `COOKIE_SAMESITE`, and `secure` in production. Its SHA-256 hash is stored on the user document. At most five sessions are kept; the oldest is dropped.
4. On mount, `AuthContext` calls `POST /api/auth/refresh`. The browser sends the cookie, the server rotates it (the old hash is removed, a new one is stored) and returns a fresh access token plus the user. This is the silent restore after a reload.
5. When any request returns 401, the response interceptor calls refresh once. Concurrent 401s share one promise, so only one rotation happens. The original request is retried once with the new token.
6. If refresh fails, the token is cleared and a window event `auth:logout` resets context state; route guards then send the user to `/login`.
7. If a refresh token that is no longer stored is presented, the server treats it as reuse, clears every session for that user and returns 401.
8. Logout removes the presented session hash and clears the cookie. The access token stays valid until it expires; the client discards it immediately.
9. Changing the password clears all sessions, creates a new one and returns a new access token, which the profile page stores.

## API contract

All responses are JSON. Success bodies have `success: true` and a `data` object. Errors have `success: false`, a `message`, and optionally `errors: [{ field, message }]`.

| Method | Path | Auth | Input | `data` |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Public | none | `{ status, uptime, timestamp, db }` |
| POST | `/api/auth/register` | Public | `{ name, email, password }` | `{ user, accessToken }` (201) |
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ user, accessToken }` |
| POST | `/api/auth/refresh` | Refresh cookie | none | `{ user, accessToken }` |
| POST | `/api/auth/logout` | Refresh cookie optional | none | `{ loggedOut: true }` |
| GET | `/api/auth/me` | Bearer | none | `{ user }` |
| PATCH | `/api/users/me` | Bearer | `{ name }` | `{ user }` |
| PATCH | `/api/users/me/password` | Bearer | `{ currentPassword, newPassword }` | `{ user, accessToken }` |
| GET | `/api/users` | Bearer, admin | `page`, `limit` (max 100) | `{ users, pagination }` |
| GET | `/api/items` | Bearer | `page`, `limit` (max 50), `search`, `status` | `{ items, pagination }` |
| POST | `/api/items` | Bearer | `{ title, description?, status? }` | `{ item }` (201) |
| GET | `/api/items/:id` | Bearer, owner | none | `{ item }` |
| PATCH | `/api/items/:id` | Bearer, owner | any of `title`, `description`, `status` | `{ item }` |
| DELETE | `/api/items/:id` | Bearer, owner | none | `{ id }` |

Shared shapes:

- `user`: `{ id, name, email, role, createdAt, updatedAt }`. `role` is `user` or `admin`.
- `item`: `{ id, owner, title, description, status, createdAt, updatedAt }`. `status` is `todo`, `in_progress` or `done`.
- `pagination`: `{ page, limit, total, pages }`.

Status codes: 400 validation or malformed id, 401 missing or invalid credentials, 403 wrong role or disallowed origin, 404 missing resource, 409 duplicate email, 413 body over 10 KB, 429 rate limited, 500 unexpected.

## Adding a module

### Backend

1. Create `server/src/models/Thing.js`. Include an `owner` reference when records belong to a user, and add a `toJSON` transform that exposes `id` and removes `_id` and `__v`, as `Item.js` does.
2. Create `server/src/validators/thing.validators.js` with a create schema, an update schema (at least one field required), an id schema (`24` hex characters) and a list query schema (`page`, `limit`, filters).
3. Create `server/src/controllers/thing.controller.js`. Wrap handlers with `asyncHandler`, scope every query by `owner: req.user.id`, throw `ApiError` for missing records, and return `{ success: true, data }`.
4. Create `server/src/routes/thing.routes.js`. Apply `router.use(protect)`, then chain `validate` before each controller. Add `restrictTo("admin")` to admin-only routes.
5. Register it in `server/src/routes/index.js` with `router.use("/things", thingRoutes)`. Nothing else in `app.js` changes.

### Frontend

1. Create `client/src/api/things.api.js`. Call `http` and unwrap `response.data.data`, following `items.api.js`.
2. Create `client/src/pages/Things.jsx` by copying `Dashboard.jsx`: `PageHeader`, debounced search, filters, list, modal form, confirm dialog, pagination, loading, empty and error states, toasts.
3. Add the route in `client/src/App.jsx` inside the `AppLayout` route, wrapped in `ProtectedRoute` (add `roles={["admin"]}` when needed).
4. Add a nav link in `client/src/components/layout/Navbar.jsx`, visible to signed-in users and to admins only when the page is admin-only.
5. Use `getErrorMessage` and `getFieldErrors` from `client/src/lib/errors.js` for failures, and `toast.success` for confirmations.

## Conventions

- Server code is ESM with explicit `.js` extensions in imports.
- Validation always happens in a validator, never inside a controller.
- Controllers never touch `req.body` without prior validation and never trust a client-supplied owner id.
- Client data access goes through `client/src/api/*`, never directly through axios in a page.
- The access token is only ever held by `tokenStore`.
- Every interactive element has a visible focus state; motion respects `prefers-reduced-motion`.
