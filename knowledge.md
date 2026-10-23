# Knowledge

Orientation for coding agents working in this repository.

## Stack

- Server: Node.js ESM, Express 4, Mongoose 8, MongoDB, Zod 4, JSON Web Tokens, bcryptjs, helmet, express-rate-limit, morgan (development only), google-auth-library, multer, cloudinary. Resend email uses plain `fetch`.
- Client: Vite 8, React 18, React Router 6, Tailwind CSS 3.4, axios, lucide-react, react-hot-toast, @fontsource-variable/inter, clsx, tailwind-merge, @react-oauth/google, react-markdown, remark-gfm.
- JavaScript only. No TypeScript, no test framework, no Docker.
- One repository, two apps, a root `package.json` that only orchestrates.

## Folder map

- `server/src/index.js`: process entry. Connects the database, runs `ensureUids()` and `setupAi()`, listens, starts keep-alive, handles shutdown.
- `server/src/app.js`: Express middleware order. Helmet, CORS, JSON limit, cookie parser, health routes, global limiter, API routes, 404, error handler.
- `server/src/config/env.js`: validates every environment variable with Zod. The server exits on an invalid configuration.
- `server/src/config/cloudinary.js`: Cloudinary client, configured only when all three `CLOUDINARY_*` values exist.
- `server/src/config/aiDefaults.js`: default AI models, base URLs, grok vendor detection, base URL guard.
- `server/src/routes/index.js`: mounts `/auth`, `/users`, `/items` and the AI router. Add new routers here.
- `server/src/{models,validators,controllers,routes}`: one file per concern, one module per domain.
- `server/src/services/`: provider adapters, key rotation and AI seeding.
- `server/src/middleware/auth.js`: `protect` (bearer token, loads the user into `req.user`) and `restrictTo(...roles)`.
- `server/src/middleware/upload.js`: multer memory upload, 2 MB, JPEG, PNG and WebP only.
- `server/src/middleware/error.js`: single error response shape. Stacks only outside production.
- `server/src/utils/tokens.js`: access and refresh signing, token hashing, refresh cookie options, five-session cap.
- `server/src/utils/uid.js` and `ensureUids.js`: nine digit uid generation and the startup backfill.
- `server/src/utils/crypto.js`: AES-256-GCM encryption and masking for stored provider keys.
- `server/src/utils/otp.js` and `mailer.js`: reset code hashing, reset tokens and Resend delivery.
- `client/src/App.jsx`: route table. Every page is inside `AppLayout`; auth pages are inside `GuestRoute` and `AuthLayout`.
- `client/src/api/http.js`: axios instance, bearer header, single-flight refresh, one retry per request.
- `client/src/lib/tokenStore.js`: the only place the access token is stored, in memory.
- `client/src/context/AuthContext.jsx`: `user`, `loading`, `login`, `register`, `logout`, `updateUser`, plus the bootstrap refresh.
- `client/src/components/ui/`: the shared primitives. Do not rewrite them per page. `Avatar`, `Tabs`, `OtpInput`, `CopyButton`, `Divider`, `Field`, `FormError`, `ErrorState`, `Table` and `Container` are new.
- `client/src/components/auth/`: `GoogleButton` and `GoogleSection` (only when `VITE_GOOGLE_CLIENT_ID` is set), `EmailVerificationFlow`, `ForgotPasswordModal`, `CompleteProfileModal`.
- `client/src/components/profile/AvatarUpload.jsx`: preview, type and 2 MB checks, upload and remove.
- `client/src/components/ai/`: the chat panel and its parts, plus the admin key modal and status chip.
- `client/src/hooks/useChat.js`: all chat state and calls for both `ChatPanel` variants.
- `client/src/api/ai.api.js`: chat, conversations and the admin key and settings calls.
- `client/src/config/features.js`: `aiPage` and `aiWidget` flags.
- `client/src/pages/Dashboard.jsx`: the reference CRUD page. Copy it for new modules. `FindUser`, `AiBuddy` and `AdminAi` are the other new pages.
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
- `npm run build:client` must pass with no warnings.

## Environment

Required beyond the original auth values: `JWT_RESET_SECRET` (32+ characters) and `AI_KEY_SECRET` (64 hex characters). Optional: `GOOGLE_CLIENT_ID`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY` (with `MAIL_FROM`), `AI_COOLDOWN_SECONDS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GROK_API_KEY_1`, `GROK_API_KEY_2`.

- `VITE_GOOGLE_CLIENT_ID` in `client/.env` makes the Google buttons and the `or` divider appear on Login and Register. Without it those pages show the plain form.
- Missing Google or Cloudinary credentials turn their routes into 503 answers; the app still boots.
- Without `RESEND_API_KEY` in development the reset code is printed to the server console.
- `GROK_API_KEY_*` accept a Groq key (`gsk_`) or an xAI key (`xai-`). All of them must come from one vendor; the base URL follows the prefix.

## Conventions

- Server: ESM with explicit `.js` extensions. Validate in `validators/`, act in `controllers/`, wire in `routes/`. Controllers use `asyncHandler` and throw `ApiError`.
- Every user-owned query filters by `owner: req.user.id`. Never trust an id from the client for ownership.
- Responses are `{ success, data, message? }`. Errors are `{ success: false, message, errors? }`.
- Models expose `id` through a `toJSON` transform and hide `_id` and `__v`. Keep new models consistent.
- `uid` is nine digits, unique and immutable, assigned in a `pre("validate")` hook. Never accept a uid from the client for ownership checks; only for public lookups.
- Never return `password`, `refreshTokens`, `googleId`, `avatarPublicId` or `encryptedKey`.
- Client data access goes through `client/src/api/*` and unwraps `response.data.data`.
- Use `getErrorMessage` and `getFieldErrors` from `client/src/lib/errors.js` for failures.
- Use `toast` for outcomes, `EmptyState` for empty and error screens, skeletons for loading lists.
- Styling uses token utilities from `theme.md`, `cn()` for conditional classes, and no hardcoded colors.
- Icons come from lucide-react. No emoji anywhere in code or UI.

## New endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/google` | Body `{ credential }`. 503 without `GOOGLE_CLIENT_ID`. |
| POST | `/api/auth/forgot-password` | Always the same 200 answer. `otpLimiter`. |
| POST | `/api/auth/verify-otp` | Body `{ email, otp }`, returns `{ resetToken }`. `otpLimiter`. |
| POST | `/api/auth/reset-password` | Body `{ resetToken, newPassword }`, no session. `otpLimiter`. |
| PATCH | `/api/users/me` | `name`, `age`, `gender`. Empty body is 400. |
| PATCH | `/api/users/me/password` | `{ currentPassword, newPassword }` or `{ resetToken, newPassword }`. |
| PUT, DELETE | `/api/users/me/avatar` | Multipart field `avatar`. 503 without Cloudinary. |
| GET | `/api/users/uid/:uid` | Public fields only, `uidLimiter`. |
| GET | `/api/items/uid/:uid` | Owner only. |
| POST | `/api/ai/chat` | `{ conversationUid?, message }`, 20 per minute per user. |
| GET | `/api/ai/conversations` | List of `{ uid, title, updatedAt }`. |
| GET, DELETE | `/api/ai/conversations/:uid` | Owner only. |
| GET, POST | `/api/admin/ai/keys` | Admin only, masked keys. |
| PATCH, DELETE | `/api/admin/ai/keys/:id` | A new `apiKey` resets status, cooldown and error. |
| POST | `/api/admin/ai/keys/:id/test` | Sends one short prompt and reports `{ ok }`. |
| GET, PUT | `/api/admin/ai/settings` | Provider, models, base URLs, system prompt. |

## AI Buddy

`routes/ai.routes.js` holds both `/ai` and `/admin/ai` and is mounted with one line in `routes/index.js`. `aiKeyPool.js` claims keys atomically, least recently used first, and rotates on 429, 5xx, timeout, network, 401 and 403. An empty model reply becomes "I cannot help with that request." All keys are masked in responses and encrypted in the database.

### Remove AI Buddy

Delete `routes/ai.routes.js`, `controllers/ai.controller.js`, `controllers/aiAdmin.controller.js`, `validators/ai.validators.js`, `models/AiKey.js`, `models/AiSettings.js`, `models/Conversation.js`, `services/aiProviders.js`, `services/aiKeyPool.js`, `services/aiSetup.js`, `config/aiDefaults.js`, `utils/crypto.js`, then remove the `aiRoutes` line from `routes/index.js` and the `setupAi()` call from `index.js`.

On the client, set `aiPage: false` and `aiWidget: false` in `config/features.js` to hide the page, nav link and widget without deleting code. To delete it, also remove `components/ai/`, `pages/AiBuddy.jsx`, `pages/AdminAi.jsx`, `api/ai.api.js`, `hooks/useChat.js`, `lib/ai.js`, `config/features.js`, the two routes in `App.jsx`, the two nav links in `Navbar.jsx` and the `AiChatWidget` mount in `AppLayout.jsx`.

### Client AI Buddy

`config/features.js` exports `{ aiPage: true, aiWidget: false }`. `aiPage` mounts `/ai-buddy` and its nav link; `aiWidget` mounts `AiChatWidget` in `AppLayout`, a floating button with a compact panel that stores one conversation uid in `sessionStorage`. `ChatPanel` takes `variant="page" | "widget"` and both variants share `hooks/useChat.js` and `api/ai.api.js`. Assistant replies render through `react-markdown` and `remark-gfm` with no raw HTML; code blocks get a language label and copy button.

To turn AI Buddy into a site-wide chatbot, set `aiWidget: true` and optionally `aiPage: false`, then change the system prompt in `/admin/ai`.

## Rules

1. Match the existing item module and the Dashboard page when adding features. A new module is: model with a `uid` hook, validator, controller, routes file, one line in `routes/index.js`; then an api file, a page copied from `Dashboard.jsx`, a route in `App.jsx`, and a nav link in `Navbar.jsx`.
2. Never break the auth flow. The access token stays in memory, the refresh token stays in the httpOnly cookie at `path=/api/auth`, and `POST /api/auth/refresh` must keep rotating. Do not add `localStorage` or `sessionStorage` for tokens or user data; the only exception is the AI widget conversation uid.
3. Keep the cookie options, CORS allowlist, rate limits and body size limit intact.
4. Do not add dependencies when an existing one covers the need. Do not add TypeScript, test frameworks or Docker.
5. Run `npm run build` after client changes and restart the server after server changes. Fix warnings rather than suppressing them.
