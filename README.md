# Hackathon MERN Boilerplate

A small starter for hackathon projects.

- `server/` is an Express 4 + Mongoose API with JWT access tokens, rotating refresh tokens in an httpOnly cookie, Zod validation, rate limits and an admin role. It also has nine digit public uids, Google and Facebook sign-in, Cloudinary avatars, OTP password reset and an optional AI Buddy with provider key rotation.
- `client/` is a Vite + React 18 single-page app with a complete auth flow and one working CRUD module (items) that serves as the template for new modules.

The client never stores tokens in web storage. The access token lives in memory only; the refresh token lives in an httpOnly cookie scoped to `/api/auth`.

## Requirements

- Node.js 22 LTS or newer (Vite 8 requires Node 20.19+ or 22.12+)
- npm 10 or newer
- A MongoDB database: MongoDB Atlas (free tier is enough) or a local `mongod`

## Quick start

```bash
npm run install:all
```

Create `server/.env` from the template and fill in the values:

```bash
cp server/.env.example server/.env
```

At minimum set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` and `AI_KEY_SECRET`. Each secret in the first group must be at least 32 characters; `AI_KEY_SECRET` must be 64 hex characters.

Generate two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```bash
npm run seed --prefix server
```

Start the API and the client together:

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5173/api/health (through the Vite proxy)

If your shell already exports `PORT`, the server may pick it up. Prefix the command with a valid port to be explicit: `PORT=5000 npm run dev`.

## Environment variables

### server/.env

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development` or `production`. Production enables secure cookies and disables request logging. |
| `PORT` | No | `5000` | HTTP port the API listens on. |
| `MONGODB_URI` | Yes | none | MongoDB connection string, for example `mongodb+srv://user:pass@cluster.mongodb.net/hackathon`. |
| `JWT_ACCESS_SECRET` | Yes | none | Access token signing secret, minimum 32 characters. |
| `JWT_REFRESH_SECRET` | Yes | none | Refresh token signing secret, minimum 32 characters. Use a different value from the access secret. |
| `ACCESS_TOKEN_TTL` | No | `15m` | Access token lifetime (any `jsonwebtoken` duration string). |
| `REFRESH_TOKEN_TTL_DAYS` | No | `7` | Refresh token and cookie lifetime in days. |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin. Comma-separate multiple origins. |
| `COOKIE_SAMESITE` | No | `lax` | `lax`, `strict` or `none`. Use `none` when the browser calls the API on a different site than the client. |
| `TRUST_PROXY_HOPS` | No | `1` | How many proxies sit in front of the API for rate-limit addressing. Use `1` on Railway alone and `2` when a Vercel rewrite forwards to Railway. |
| `SELF_URL` | No | empty | Public API URL used by the keep-alive pinger, for example `https://api-production.up.railway.app`. |
| `KEEP_ALIVE_MINUTES` | No | `4` | Interval for the internal keep-alive request when `SELF_URL` is set in production. |
| `ADMIN_EMAIL` | No | empty | Email for the seeded admin. The seed script is idempotent and promotes an existing user. |
| `ADMIN_PASSWORD` | No | empty | Password for the seeded admin, 8 to 72 bytes. |
| `JWT_RESET_SECRET` | Yes | none | Secret for code hashes and password reset tokens, minimum 32 characters. |
| `EMAIL_VERIFICATION_REQUIRED` | No | `true` | `false` verifies new password accounts during register and returns a session, for when email delivery is not ready. |
| `GOOGLE_CLIENT_ID` | No | empty | Google OAuth client ID. Without it `POST /api/auth/google` answers 503. |
| `FACEBOOK_APP_ID` | No | empty | Facebook app ID. Without it, or without `FACEBOOK_APP_SECRET`, `POST /api/auth/facebook` answers 503. |
| `FACEBOOK_APP_SECRET` | No | empty | Facebook app secret, used to debug the access token. Never sent to the client. |
| `CLOUDINARY_CLOUD_NAME` | No | empty | Cloudinary cloud name for avatars. The three Cloudinary values are needed together. |
| `CLOUDINARY_API_KEY` | No | empty | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | No | empty | Cloudinary API secret. |
| `RESEND_API_KEY` | No | empty | Resend API key for reset and verification emails. Without it in development the code is printed to the server console. |
| `MAIL_FROM` | No | `onboarding@resend.dev` | Sender address for reset and verification emails. |
| `AI_KEY_SECRET` | Yes | none | 64 hex characters. Encrypts stored AI provider keys. |
| `AI_COOLDOWN_SECONDS` | No | `60` | Cooldown after a provider 429, 5xx, timeout or network error. |
| `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2` | No | empty | Seed keys for the Gemini provider. Admin changes in the database win afterwards. |
| `GROK_API_KEY_1`, `GROK_API_KEY_2` | No | empty | Seed keys for the OpenAI-compatible provider. Accepts a Groq key (`gsk_`) or an xAI key (`xai-`); all of them must use one vendor. |

### client/.env

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `/api` | API base URL. It must be a path such as `/api`, because the browser then calls the page's own origin and the dev proxy or the Vercel rewrite forwards it. An absolute URL is ignored: it would make every request cross-origin, where the response is blocked unless the origin is in `CLIENT_URL` and the refresh cookie is never sent. |
| `VITE_GOOGLE_CLIENT_ID` | No | empty | Shows the Google buttons on Login and Register. Use the same client id as `GOOGLE_CLIENT_ID`; without it the pages show the plain form. |
| `VITE_FACEBOOK_APP_ID` | No | empty | Shows the Facebook button under the Google button on Login and Register. Use the same app id as `FACEBOOK_APP_ID`; without it the button is hidden. |

`client/.env` is optional. The defaults work for local development and for the Vercel rewrite.

## Scripts

Run from the repository root:

| Command | Effect |
| --- | --- |
| `npm run install:all` | Installs root, server and client dependencies. |
| `npm run dev` | Runs the API and the Vite dev server together with `concurrently`. |
| `npm run build` | Builds the client into `client/dist`. |
| `npm start` | Starts the API in the current `NODE_ENV`. |

Server (`npm run <script> --prefix server`):

| Script | Effect |
| --- | --- |
| `dev` | `nodemon src/index.js`, restarts on change. |
| `start` | `node src/index.js`, used by Railway. |
| `seed` | Creates or promotes the admin account, then exits. |

Client (`npm run <script> --prefix client`):

| Script | Effect |
| --- | --- |
| `dev` | Vite dev server on port 5173 with the `/api` proxy to port 5000. |
| `build` | Production build into `dist`. |
| `preview` | Serves the built files locally. |

## Deployment

### 1. MongoDB Atlas

1. Create a free M0 cluster and a database user with read and write access.
2. Under Network Access, add `0.0.0.0/0`. This is acceptable for a hackathon and should be tightened for anything long-lived.
3. Copy the connection string, add a database name (for example `hackathon`) and use it as `MONGODB_URI`.

### 2. Railway for the API

1. Create a new project and deploy this repository.
2. Set the service root directory to `server`.
3. Set the start command to `npm start`. Railway runs the install step for the service automatically.
4. Set the health check path to `/api/health`.
5. Turn Serverless OFF in the service settings. The keep-alive and the in-process rate limiter expect a long-running process.
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=5000` (Railway injects `PORT`; the server reads it)
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ACCESS_TOKEN_TTL=15m`
   - `REFRESH_TOKEN_TTL_DAYS=7`
   - `CLIENT_URL=https://your-app.vercel.app`
   - `COOKIE_SAMESITE=none` when the client calls the API directly on a different site; keep `lax` when all API traffic goes through the Vercel proxy
   - `TRUST_PROXY_HOPS=2` when the Vercel rewrite forwards to Railway; keep `1` when the browser calls Railway directly
   - `SELF_URL=https://your-service.up.railway.app`
   - `KEEP_ALIVE_MINUTES=4`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (then run the seed once)
   - `JWT_RESET_SECRET`, `AI_KEY_SECRET`
   - `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `MAIL_FROM` when those features are used
   - `GEMINI_API_KEY_*`, `GROK_API_KEY_*`, `AI_COOLDOWN_SECONDS` when AI Buddy is used
7. Deploy, open `/api/health` and confirm `db` is `connected`.

### 3. Vercel for the client

1. Import the repository and set the project root directory to `client`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. `client/vercel.json` already forwards API calls to the deployed API. Update the destination there if the Railway service moves:

   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://your-service.up.railway.app/api/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

   The first rewrite proxies API calls so the browser sees one origin. The second rewrite makes client-side routes work on refresh. A 502 from `/api/*` means the destination host is down or wrong, because requests never reach Express.
4. Leave `VITE_API_URL` unset, or set it to `/api`. The client ignores absolute values, so a stale Railway URL in the project settings cannot turn API calls cross-origin.
5. Deploy and test register, login, a page reload while signed in, and logout on the deployed domain.
6. Add the Vercel domain to `CLIENT_URL` in Railway only when the browser calls the API directly. Through the rewrite the app's own origin is used, so CORS headers are not needed.

### 4. Keep-alive

Free MongoDB Atlas clusters and free Railway services sleep when idle. Two layers keep the API warm:

- Internal: with `SELF_URL` set and `NODE_ENV=production`, the server requests `${SELF_URL}/api/health` every `KEEP_ALIVE_MINUTES` minutes.
- External: create a monitor in cron-job.org or UptimeRobot that requests `https://your-service.up.railway.app/api/health` every 5 minutes and alerts on a non-200 response.

`/api/health` is intentionally outside the global rate limiter so monitors do not exhaust it.

### SnapDeploy free tier

- Root directory: `server`. Point the service at the API folder, not the repository root.
- Start command: `npm start`. There is no build step for the API; leave the build command empty.
- Turn auto deploy off and redeploy by hand, so a half-finished commit never reaches the demo.
- Health check path: `/api/health`. Turn serverless mode off for the same reason as Railway: the in-process rate limiter and keep-alive expect one long-running process.

## Project documentation

- `docs/ARCHITECTURE.md`: file tree, request flow, auth flow, API contract and recipes for new modules.
- `theme.md`: design tokens, typography, component and copy rules.
- `knowledge.md`: compact orientation for coding agents.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `vite: not found` on deploy | The service is building the client folder without installed dependencies. Run the build for the `client` root with `npm ci` first, or build locally and publish `dist`. |
| `npm error ... package.json` under `/app/server` | The service root directory is wrong. Set it to the repository root for the monorepo, or to `server` when the service only runs the API. |
| `Invalid environment configuration` | A required variable is missing or too short. The server prints the field names in the log. |
| `MongooseServerSelectionError` or Atlas could not connect | Add the host to Atlas Network Access and confirm the database user can read and write the database in `MONGODB_URI`. |
| CORS error in the console (`No 'Access-Control-Allow-Origin' header`) | The page is calling the API on another origin. Keep `VITE_API_URL=/api` so the dev proxy or the Vercel rewrite forwards the call, or add the page's origin to `CLIENT_URL` when the browser must reach the API directly. |
| `[GSI_LOGGER]: The given origin is not allowed for the given client ID` | Google sign-in only runs on origins listed on the OAuth client. In Google Cloud Console, edit the web client behind `VITE_GOOGLE_CLIENT_ID` and add each exact origin with no path, for example `https://your-app.vercel.app` and `http://localhost:5173`. The client id must equal `GOOGLE_CLIENT_ID` on the API. |
| Signed out after every request | The refresh cookie is not reaching the API. Check `COOKIE_SAMESITE`, that the request uses `credentials`, and that the client and API share a site or the client proxies `/api`. |
| `429 Too many requests` | The login limiter allows 20 failed attempts per 15 minutes per IP; the global limiter allows 300 API requests per 15 minutes per IP; the reset routes allow 10 per 15 minutes per IP; the uid lookup allows 30 per minute. Behind two proxies set `TRUST_PROXY_HOPS=2`, otherwise every visitor shares the proxy's bucket. |
| AI Buddy answers `503 AI Buddy is busy. Try again in a minute.` | Every provider key is cooling down, disabled or marked invalid. Check `GET /api/admin/ai/keys` as an admin. |
