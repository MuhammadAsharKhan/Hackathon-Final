# Architecture

The repository is a two-app monorepo: an Express API in `server/` and a React single-page app in `client/`. The root `package.json` only orchestrates install, dev, build and start. The client talks to the API over HTTP.

The API is the HCM Lite backend. At this stage it covers the foundation: first-run setup, company settings, organization data, accounts, announcements, notifications, the audit trail and the AI key pool. Attendance, leave, payroll, dashboards and the assistant tools are added by the later prompt files, so those routes do not exist yet. The client is still the boilerplate app until the frontend prompts replace it.

## File tree

```
.
├── .gitignore                     Ignores node_modules, .env files, build output and editor files
├── package.json                   Root scripts: install:all, dev, build, start
├── README.md                      Setup, environment variables, scripts and deployment
├── theme.md                       Design tokens, typography, component and copy rules
├── knowledge.md                   Compact orientation for coding agents
├── prompts/                       Task briefs and the specification (00-SPEC.md wins)
├── docs/
│   ├── ARCHITECTURE.md            This document
│   └── VIVA.md                    Plain-language flow walkthrough and review questions
├── client/                        React app from the boilerplate, replaced by the frontend prompts
└── server/
    ├── package.json               Dependencies and the dev, start, seed and test scripts
    ├── .env.example               Environment template
    ├── test/                      node:test unit tests, run with npm test
    └── src/
        ├── index.js               Entry: connect, environment bootstrap, AI seed, listen, keep-alive, shutdown
        ├── app.js                 Middleware order, health routes, API router, 404 and error handler
        ├── config/
        │   ├── env.js             Dotenv loading and Zod validation of every environment variable
        │   ├── db.js              Mongoose connect and disconnect helpers
        │   └── aiDefaults.js      AI provider presets, default models and the base URL guard
        ├── routes/
        │   ├── index.js           One line per router
        │   ├── setup.routes.js    GET /setup/status, POST /setup
        │   ├── auth.routes.js     login, forgot-password, verify-otp, reset-password, refresh, logout, me, change-password
        │   ├── settings.routes.js Company settings read and update
        │   ├── department.routes.js  Department list and CRUD
        │   ├── designation.routes.js Designation list and CRUD
        │   ├── leaveType.routes.js   Leave type list and CRUD
        │   ├── holiday.routes.js     Holiday list and CRUD
        │   ├── user.routes.js     Admin: HR account creation, user list, activate, reset password
        │   ├── me.routes.js       Self-service profile (phone, address)
        │   ├── announcement.routes.js  Announcement list, create, delete
        │   ├── notification.routes.js  Own notifications, unread count, mark read
        │   ├── audit.routes.js    Read-only audit log for the admin
        │   ├── ai.routes.js       Existing AI chat, conversations and the admin key and settings routes
        │   └── health.routes.js   GET /api/health, mounted outside the global rate limiter
        ├── controllers/           One file per resource, reading the request and calling services
        ├── middleware/
        │   ├── auth.js            protect (token, account state, forced password change) and restrictTo
        │   ├── validate.js        Runs a Zod schema against body, query or params
        │   ├── rateLimit.js       Global, auth, otp and AI chat limiters
        │   ├── error.js           One error shape, stacks only outside production
        │   └── notFound.js        Unmatched routes become a 404 ApiError
        ├── models/
        │   ├── Settings.js        Fixed-id singleton: company, timezone, office rules, setupComplete
        │   ├── Department.js      Name unique case-insensitively, description, isActive
        │   ├── Designation.js     Name unique, optional department
        │   ├── LeaveType.js       Slug code, name, yearlyQuota or null, isPaid
        │   ├── Holiday.js         Unique ISO date and name
        │   ├── Employee.js        Code, personal details, org links, join and exit dates, salary fields
        │   ├── User.js            name, email, password hash, role, employeeId, isActive, mustChangePassword, sessions
        │   ├── AuditLog.js        Append-only trail, rejects every update and delete
        │   ├── Notification.js    One row per user, readAt for the unread count
        │   ├── Announcement.js    Title, body and author snapshot
        │   ├── AiLog.js           One row per AI request, written by the assistant
        │   ├── Counter.js         Named atomic counter, used for employee codes
        │   ├── Conversation.js    Existing AI chat history
        │   ├── PasswordOtp.js     Password reset codes per email
        │   ├── AiKey.js           Encrypted provider keys with status and cooldown
        │   └── AiSettings.js      Provider, models, base URLs and system prompt
        ├── services/
        │   ├── settingsService.js     Cached company settings, cache cleared on every write
        │   ├── calendarService.js     Holiday set for a range and settings plus holiday set
        │   ├── auditService.js        auditService.log, strips secret keys from before and after
        │   ├── notificationService.js notify, notifyMany, notifyActiveUsers
        │   ├── employeeService.js     Employee summary, employee code allocation
        │   ├── setupService.js        Environment bootstrap, atomic first-run setup, leave type seeds
        │   ├── aiProviders.js         Gemini and OpenAI-compatible calls
        │   ├── aiKeyPool.js           Key claiming, rotation and cooldown
        │   └── aiSetup.js             Seeds the AI key and settings from the environment
        ├── validators/            One schema file per resource plus common.validators.js
        ├── utils/
        │   ├── dates.js           Timezone-correct business dates, working days and month bounds
        │   ├── clock.js           now(), the single source of the current instant
        │   ├── money.js           round2
        │   ├── haversine.js       distanceMeters between two coordinates
        │   ├── temporaryPassword.js Ten letters and digits, at least one of each
        │   ├── tokens.js          Access and refresh signing, hashing, cookie options, session cap
        │   ├── password.js        Password reuse check and session-clearing save
        │   ├── otp.js             Reset code hashing and reset token signing
        │   ├── mailer.js          Resend delivery through fetch, development console fallback
        │   ├── uid.js             Nine digit uid for AI conversations
        │   ├── crypto.js          AES-256-GCM encryption for stored AI keys
        │   ├── ApiError.js        Status code, message, field errors and optional code
        │   ├── asyncHandler.js    Sends rejected promises to the error handler
        │   └── keepAlive.js       Production self-ping of /api/health
        └── scripts/seed.js        Creates the admin from the environment, then exits
```

## Request flow

1. The browser calls `/api/...`. In development the Vite proxy forwards it to `http://localhost:5000`.
2. Express trusts `TRUST_PROXY_HOPS` proxies, then runs `helmet`, `compression`, CORS, the JSON body parser with a 10 KB limit and `cookie-parser`.
3. Health routes are mounted first, then the global rate limiter, then the API router.
4. Inside a router: `protect` verifies the bearer token and loads the account, `restrictTo` checks the role, `validate` parses the body, query or params with Zod.
5. The controller reads the input, calls a service for anything that is a business rule, and returns `{ success: true, data, message? }`.
6. Unknown routes become a 404 `ApiError`. `errorHandler` maps every error to `{ success: false, message, errors?, code? }`.

## Time, dates and money

- The server runs in UTC. Business dates are `YYYY-MM-DD` strings in the company timezone (`settings.timezone`, default `Asia/Karachi`); months are `YYYY-MM`; instants such as `createdAt` stay `Date` objects.
- `utils/dates.js` is the only place that converts between them. It uses `Intl.DateTimeFormat` with the zone and `Date.UTC` arithmetic, never a local `Date` getter and never `new Date("YYYY-MM-DD")` for arithmetic.
- `utils/clock.js` exports `now()`. Services accept an optional `now` argument so a test can fix the time.
- Money is a PKR number rounded with `round2` once at the end of each computed amount.

## Auth flow

1. `POST /api/auth/login` checks the password against a dummy hash when the email is unknown, so both failures take the same time. An inactive account answers 401.
2. The session is a 15-minute access JWT signed with `JWT_ACCESS_SECRET` and a 7-day refresh JWT signed with `JWT_REFRESH_SECRET`. The access token is returned in the body; the refresh token is an httpOnly cookie named `rt` at `path=/api/auth` whose SHA-256 hash is stored on the user. At most five sessions are kept.
3. Login, refresh and `GET /api/auth/me` return `{ user, employee, mustChangePassword }`, where `employee` is `{ id, code, name, department, designation, status }` or null for the admin. `POST /api/auth/change-password` returns the same shape plus a fresh access token.
4. `protect` rejects a deactivated account with 401. When `mustChangePassword` is true, only `POST /auth/change-password`, `GET /auth/me`, `POST /auth/logout` and `POST /auth/refresh` pass; every other route answers 403 with `code: "PASSWORD_CHANGE_REQUIRED"`.
5. Refresh rotates the stored hash. The immediately previous token stays valid for ten seconds so two tabs do not sign each other out, and a token that is no longer stored is treated as reuse: every session for that user is cleared.
6. A password change clears every other session, clears `mustChangePassword` and returns a new session.

## First-run setup

- `GET /api/setup/status` reports `{ setupComplete }`.
- `POST /api/setup { companyName, adminName, adminEmail, adminPassword }` claims the settings document with one atomic `findOneAndUpdate` on `{ _id: "company", setupComplete: false }` with upsert. The document id is fixed, so the storage engine enforces one settings document even before any index from the schema exists. The loser of two parallel calls either matches nothing or hits a duplicate key, and answers 409. The winner creates the admin, seeds the four leave types and writes `setup.complete` to the audit log. If account creation fails, the claim is released so setup can be retried.
- At start, when no admin exists and `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, `bootstrapAdminFromEnv()` does the same with `COMPANY_NAME` and the admin name `Admin`. That is how an empty deployment becomes usable without visiting the setup screen.
- The settings document is a singleton with a fixed `_id`. `settingsService` caches it for 30 seconds and every write clears the cache.

## Organization data

- Departments have a unique, case-insensitive name. Designations have a unique name and an optional department. Leave types have a unique lowercase slug code and a quota that is a whole number or null for unlimited. Holidays have a unique ISO date.
- Deleting a department is 409 while a designation or an employee references it. Deleting a designation is 409 while an employee references it. Deleting a holiday always succeeds.
- Every write is recorded with `auditService.log(actor, action, entity, entityId, before, after)`.

## Employee codes and accounts

- `employeeService.allocateEmployeeCode()` increments the `employeeCode` counter atomically and returns `EMP-0001`, `EMP-0002`, and so on. A code that is already taken is skipped instead of failing the request.
- `POST /api/users/hr` creates the HR user and the employee record together. The user gets `mustChangePassword: true` and a ten-character temporary password that is returned once. A welcome notification is written and the action is audited without the password.
- Deactivating a user clears the refresh tokens. The admin account cannot be deactivated or reset through these routes.

## Audit trail

`AuditLog` is append-only. `pre` hooks reject `save` on an existing document, `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndDelete` and `findOneAndReplace` with an error. The only route over the collection is the read-only `GET /api/audit` for the admin. `auditService.log` removes any key that looks like a password, hash, token, secret, OTP or credential before writing, so a whole user or settings document can be passed as `before` or `after`.

Audited actions at this stage: `setup.complete`, `settings.update`, `department.create/update/delete`, `designation.create/update/delete`, `leaveType.create/update/delete`, `holiday.create/update/delete`, `user.createHr`, `user.activate`, `user.deactivate`, `user.resetPassword`, `announcement.create`, `announcement.delete`.

## Notifications

`notificationService.notify` writes one row, `notifyMany` writes a batch and `notifyActiveUsers` writes one row per active account. Unread count is `{ userId, readAt: null }`, so the bell only needs `GET /api/notifications/unread-count`. Created now: the welcome message for a new account and one row per other active user when an announcement is posted.

## API contract

All responses are JSON. Success bodies are `{ success: true, data }`; errors are `{ success: false, message, errors?, code? }`. Roles: A admin, H hr, E employee, * any signed-in account.

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/api/health` | public | status, uptime, timestamp, database state |
| GET | `/api/setup/status` | public | `{ setupComplete }` |
| POST | `/api/setup` | public | 201 with a session, 409 once complete |
| POST | `/api/auth/login` | public | `{ user, employee, mustChangePassword, accessToken }` |
| POST | `/api/auth/refresh` | cookie | same body as login |
| POST | `/api/auth/logout` | cookie | clears the cookie and the stored hash |
| POST | `/api/auth/forgot-password`, `/verify-otp`, `/reset-password` | public, otp limiter | unchanged reset flow |
| GET | `/api/auth/me` | * | `{ user, employee, mustChangePassword }` |
| POST | `/api/auth/change-password` | * | `{ currentPassword, newPassword }`, new session |
| PATCH | `/api/me/profile` | H, E | `{ phone, address }` |
| GET, PATCH | `/api/settings` | A, H read; A write | company settings |
| GET, POST, PATCH, DELETE | `/api/departments(/:id)` | * read; A write | delete in use is 409 |
| GET, POST, PATCH, DELETE | `/api/designations(/:id)` | * read; A write | delete in use is 409 |
| GET, POST, PATCH, DELETE | `/api/leave-types(/:id)` | * read; A write | quota null means unlimited |
| GET, POST, PATCH, DELETE | `/api/holidays(/:id)` | * read; A write | `year` filter on the list |
| GET | `/api/users?role&search&page&limit` | A | paginated accounts |
| POST | `/api/users/hr` | A | `{ user, employee, temporaryPassword }` |
| PATCH | `/api/users/:id/active` | A | `{ isActive }` |
| POST | `/api/users/:id/reset-password` | A | `{ temporaryPassword }` |
| GET | `/api/announcements?page&limit` | * | newest first |
| POST | `/api/announcements` | A, H | notifies every other active user |
| DELETE | `/api/announcements/:id` | A or author | |
| GET | `/api/notifications?unread&page&limit` | * | own rows |
| GET | `/api/notifications/unread-count` | * | `{ count }` |
| PATCH | `/api/notifications/:id/read` | * | own row only |
| POST | `/api/notifications/read-all` | * | `{ updated }` |
| GET | `/api/audit?actor&action&entity&from&to&page&limit` | A | read-only |
| POST | `/api/ai/chat`, GET `/api/ai/conversations/:id`, and `/api/admin/ai/*` | as before | unchanged boilerplate routes until the AI prompt |

Status codes: 400 validation, 401 not signed in or inactive, 403 role or data scope, 404 not found, 409 conflict, 422 business rule broken, 429 rate limited.

## Add a module

### Backend

1. Create `server/src/models/Thing.js` with a `toJSON` transform that exposes `id` and removes `_id` and `__v`, the same shape as the existing models. Add indexes for the queries you will run.
2. Create `server/src/validators/thing.validators.js` with a create schema, an update schema that requires at least one field, and an id schema (`z.object({ id: objectIdSchema })`). Reuse `common.validators.js` for ids, dates, months and pagination.
3. Put business rules in `server/src/services/thingService.js`. Controllers read input, call the service and send one response.
4. Create `server/src/controllers/thing.controller.js`, wrapped in `asyncHandler`, throwing `ApiError`. Write an audit entry for every write.
5. Create `server/src/routes/thing.routes.js`, apply `router.use(protect)`, then `restrictTo(...)` and `validate(...)` before each controller.
6. Register it in `server/src/routes/index.js` with one `router.use` line. Nothing else in `app.js` changes.

### Remove a module

Delete the model, validator, controller, service and route files, then remove the `router.use` line and the import. Audit and notification writes go with the controller that made them. Nothing else references the module.

### Frontend

The client is rewritten by the frontend prompts. Until then, follow the existing client conventions in `knowledge.md` when touching it.

## Conventions

- Server code is ESM with explicit `.js` extensions.
- Validation lives in a validator, never in a controller.
- Controllers never touch `req.body` without prior validation and never trust a client-supplied owner id.
- Responses are `{ success, data, message? }`; errors are `{ success: false, message, errors?, code? }`.
- Business rules live in `services/`; a controller is input, one service call, output.
- Comments are two plain sentences at most, above a long function or a non-obvious rule.
