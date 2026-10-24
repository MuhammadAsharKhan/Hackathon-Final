# Knowledge

Orientation for coding agents working in this repository.

## What this is

HCM Lite: a human capital management app built on the hackathon MERN boilerplate. `prompts/00-SPEC.md` is the single source of truth; if code, docs or another prompt disagree with it, the spec wins.

State after prompts 01 and 02 (foundation and people):

- The API has first-run setup, company settings, organization data, accounts, employees, attendance, leave, announcements, notifications and the audit trail.
- Payroll, dashboards and the assistant tools are not built yet. Their prompts add them.
- The client is still the boilerplate app. The frontend prompts replace it.

## Stack

- Server: Node.js ESM, Express 4, Mongoose 8, MongoDB, Zod 4, JSON Web Tokens, bcryptjs, helmet, express-rate-limit, morgan (development only), multer, csv-parse, pdfkit. Resend email uses plain `fetch`.
- Client: Vite 8, React 18, React Router 6, Tailwind CSS 3.4, axios, lucide-react, react-hot-toast. Unchanged for now.
- JavaScript only. No TypeScript, no Docker. Unit tests use `node:test`.

## Folder map (server)

- `server/src/index.js`: process entry. Connects, runs the environment admin bootstrap, seeds the AI setup, listens, keeps alive, shuts down cleanly.
- `server/src/app.js`: middleware order. Helmet, CORS, JSON limit (10 KB), cookie parser, health routes, global limiter, API routes, 404, error handler.
- `server/src/config/env.js`: Zod validation of every environment variable. The server exits on an invalid configuration.
- `server/src/routes/index.js`: one `router.use` line per router. Add new routers here.
- `server/src/{models,validators,controllers,routes}`: one file per concern.
- `server/src/services/`: business rules. `settingsService` (cached singleton settings), `calendarService` (holiday set), `auditService.log`, `notificationService` (`notify`, `notifyMany`, `notifyApprovers`, `notifyActiveUsers`), `approvalService` (who may decide a request), `employeeService` (register, list, 360, update, salary, CSV, codes), `attendanceCalc.js` and `leaveCalc.js` (pure rules), `attendanceService`, `leaveService`, `setupService`, plus the AI pool files.
- `server/src/utils/`: `dates.js`, `clock.js`, `money.js`, `haversine.js`, `temporaryPassword.js`, `tokens.js`, `password.js`, `otp.js`, `mailer.js`, `crypto.js`, `uid.js`, `ApiError.js`, `asyncHandler.js`, `keepAlive.js`.
- `server/src/middleware/auth.js`: `protect` (token, account state, forced password change) and `restrictTo(...roles)`.
- `server/src/middleware/upload.js`: the 1 MB memory upload for the employee CSV.
- `server/test/*.test.js`: unit tests for dates, haversine, money, the temporary password, day derivation, attendance timing and geofence, and leave rules.
- `docs/ARCHITECTURE.md`: file tree, flows, API contract, module recipes.
- `docs/VIVA.md`: plain-language walkthrough of the main flows.
- `theme.md`: design tokens and UI rules for the client prompts.

## Commands

```bash
npm run install:all          # root, server and client dependencies
npm run dev                  # API on 5000 and client on 5173
npm start                    # server only, uses NODE_ENV
npm test --prefix server     # node:test unit tests
npm run seed --prefix server # create the admin from the environment, then exit
npm run build                # client production build
```

- The client always uses port 5173 (`strictPort`). Do not read `PORT` in client code.
- If the shell exports `PORT`, prefix commands with `PORT=5000`.
- Local runs use the database name `hcm_dev`. Automated checks use `hcm_test` and drop it afterwards.
- Temporary scripts live in `.tmp/` and are deleted afterwards.

## Environment

Required: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` (32+ characters each), `AI_KEY_SECRET` (64 hex characters).

Optional: `NODE_ENV`, `PORT`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `CLIENT_URL`, `COOKIE_SAMESITE`, `TRUST_PROXY_HOPS`, `SELF_URL`, `KEEP_ALIVE_MINUTES`, `COMPANY_NAME` (default `My Company`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `MAIL_FROM`, `AI_COOLDOWN_SECONDS`, `AI_API_KEY`, `AI_PROVIDER` (`gemini`, `groq` or `xai`).

- `ADMIN_EMAIL` and `ADMIN_PASSWORD` create the admin at start when no admin exists. The setup screen does the same job without them.
- `AI_API_KEY` seeds the first provider key only when the database holds no key at all; `AI_PROVIDER` names the vendor.
- Without `RESEND_API_KEY` in development the reset code is printed to the server console.
- `server/.env` holds real secrets and is never read, printed or committed.

## Rules that cause real bugs

1. **Dates.** The server runs in UTC. Business dates are `YYYY-MM-DD` strings in `settings.timezone` (default `Asia/Karachi`). Use `todayIn`, `localDateOf`, `localMinutesOfDay`, `zonedToUtc`, `addDays`, `eachDay`, `weekdayOf`, `isWorkingDay`, `listWorkingDays`, `countWorkingDays` and `monthBounds` from `utils/dates.js`. Never use a local `Date` getter, never parse a date string with `new Date()` for arithmetic.
2. **Clock.** Read the time through `utils/clock.js` `now()`. Services accept an optional `now` argument.
3. **Money.** PKR numbers, `round2` once at the end of each computed amount.
4. **Settings.** Read through `settingsService.getSettings()` so the cache applies; write through `updateSettings()` so the cache is cleared. The settings document is a fixed-id singleton, `_id: "company"`.
5. **Roles.** `admin`, `hr`, `employee`. Every route declares `restrictTo(...)`. Employees only ever read their own rows.
6. **Forced password change.** `protect` answers 403 `PASSWORD_CHANGE_REQUIRED` for every route except `POST /auth/change-password`, `GET /auth/me`, `POST /auth/logout` and `POST /auth/refresh`.
7. **Audit.** `AuditLog` rejects every update and delete at the model level, so an audit fix is a new entry, never an edit. Always log through `auditService.log`; it drops password, hash, token, secret, OTP and credential keys.
8. **Employee codes.** Use `allocateEmployeeCode()`; never build `EMP-0001` by hand.
9. **Pagination.** Query `page` (default 1) and `limit` (default 10, max 100). Response data carries `pagination: { page, limit, total, pages }`.
10. **Status codes.** 400 validation, 401 not signed in or inactive, 403 role or data scope, 404 not found, 409 conflict, 422 business rule broken.
11. **Day status.** Derive days with `buildEmployeeDays` from `services/attendanceCalc.js`, never with an ad hoc rule. Records store their status when written, so a later settings change never rewrites history. The order is not employed, future, off, on leave, record, absent.
12. **Shared day reader.** `getEmployeeDaysForRange(employeeIds, from, to, { now })` in `services/attendanceService.js` returns `Map<employeeId, days>`. Payroll and dashboards import it, so keep the signature stable.
13. **Attendance writes.** Check-in and check-out stamp the server time and use the company date. A second check-in is 409, a check-out without a check-in is 422, approved leave covering today blocks a check-in. Camera check-in is the only path that rejects on location.
14. **Leave.** Days are working days only. A request must stay inside one calendar year and cover at least one working day. Overlap and quota are checked on apply and again on approval, with the request itself excluded. Approvers are HR users; HR cannot decide its own request, and the admin decides HR requests only.
15. **Salary.** HR cannot change its own salary. The admin changes HR salaries only. Employees never see another person's salary.

## Conventions

- Server: ESM with explicit `.js` extensions. Validate in `validators/`, act in `controllers/`, keep rules in `services/`, wire in `routes/`.
- Responses are `{ success: true, data }`; errors are `{ success: false, message, errors?, code? }`.
- Models expose `id` through a `toJSON` transform and hide `_id` and `__v`. Keep new models consistent.
- Never return `password`, `refreshTokens` or `previousRefreshToken`.
- bcrypt stops at 72 bytes. Password validators check `Buffer.byteLength(value, "utf8") <= 72`.
- A function fits on a screen; past about 30 lines, name the steps and extract helpers. Prefer early returns.
- Comments explain why, two plain sentences at most. No banners and no comments that repeat the next line.
- Delete code that nothing calls: unused imports, exports, files and dependencies. No emoji anywhere.
- No new dependency unless the task lists it.

## Add an endpoint

1. Model in `models/` with the shared `toJSON` transform and the indexes the queries need.
2. Validators in `validators/` using `common.validators.js` for ids, dates, months and pagination.
3. Rule in `services/` when there is more than a read or a write.
4. Controller with `asyncHandler`, `ApiError` and an audit entry for writes.
5. Route file with `protect`, `restrictTo`, `validate` in that order.
6. One `router.use` line in `routes/index.js`.
7. Unit test in `server/test/` for pure logic; an HTTP check for the route.

## Client (boilerplate until the frontend prompts)

- Do not change the client in backend tasks. It still shows the old auth flow, items page and profile screens.
- Keep the auth rules when it is rewritten: the access token stays in memory, the refresh token stays in the httpOnly cookie at `path=/api/auth`, and `POST /api/auth/refresh` keeps rotating.
- Pages compose components from `components/ui`; no raw `button`, `input`, `select`, `textarea`, `table` or dialog markup in a page.
- Copy rules and design tokens live in `theme.md`. No em dashes, exclamation marks or marketing words.
