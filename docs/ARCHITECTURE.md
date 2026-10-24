# Architecture

The repository is a two-app monorepo: an Express API in `server/` and a React single-page app in `client/`. The root `package.json` only orchestrates install, dev, build and start. The client talks to the API over HTTP.

The API is the HCM Lite backend. It now covers first-run setup, company settings, organization data, accounts, employees, attendance, leave, announcements, notifications, the audit trail and the AI key pool. Payroll, dashboards and the assistant tools are added by the later prompt files, so those routes do not exist yet. The client is still the boilerplate app until the frontend prompts replace it.

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
        │   ├── leaveType.routes.js   Leave type list and CRUD, delete blocked while requests use the type
        │   ├── holiday.routes.js     Holiday list and CRUD
        │   ├── user.routes.js     Admin: HR account creation, user list, activate, reset password
        │   ├── me.routes.js       Self-service profile (phone, address)
        │   ├── employee.routes.js Employee register, list, get, 360, update, salary, CSV import, export and template
        │   ├── attendance.routes.js Today, check-in, check-out, month views, board, corrections
        │   ├── leave.routes.js    Balance, preview, requests, cancel, decision
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
        │   ├── upload.js          Multer memory upload for the 1 MB employee CSV
        │   ├── error.js           One error shape, stacks only outside production
        │   └── notFound.js        Unmatched routes become a 404 ApiError
        ├── models/
        │   ├── Settings.js        Fixed-id singleton: company, timezone, office rules, setupComplete
        │   ├── Department.js      Name unique case-insensitively, description, isActive
        │   ├── Designation.js     Name unique, optional department
        │   ├── LeaveType.js       Slug code, name, yearlyQuota or null, isPaid
        │   ├── Holiday.js         Unique ISO date and name
        │   ├── Employee.js        Code, personal details, org links, join and exit dates, salary fields
        │   ├── Attendance.js      One record per employee and date, stored status and worked minutes
        │   ├── AttendanceCorrection.js  Requested times, reason and decision
        │   ├── LeaveRequest.js    Type, dates, working days, status and decision
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
        │   ├── notificationService.js notify, notifyMany, notifyApprovers, notifyActiveUsers
        │   ├── approvalService.js     Decision rules shared by leave and corrections
        │   ├── employeeService.js     Register, list, 360, update, salary, CSV import and export, codes
        │   ├── attendanceCalc.js      Pure day derivation, check-in and check-out status, geofence, summary
        │   ├── attendanceService.js   Today, check-in and check-out, month views, board, corrections, range reader
        │   ├── leaveCalc.js           Pure leave counting, overlap and balance helpers
        │   ├── leaveService.js        Balances, preview, apply, cancel and decision
        │   ├── setupService.js        Environment bootstrap, atomic first-run setup, leave type seeds
        │   ├── aiProviders.js         Gemini and OpenAI-compatible calls
        │   ├── aiKeyPool.js           Key claiming, rotation and cooldown
        │   └── aiSetup.js             Seeds the AI key and settings from the environment
        ├── validators/            One schema file per resource plus common.validators.js
        ├── utils/
        │   ├── dates.js           Timezone-correct business dates, working days, month bounds, HH:mm to minutes
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

- The server runs in UTC. Business dates are `YYYY-MM-DD` strings in the company timezone (`settings.timezone`, default `Asia/Karachi`); months are `YYYY-MM`; instants such as `checkIn` and `createdAt` stay `Date` objects.
- `utils/dates.js` is the only place that converts between them. It uses `Intl.DateTimeFormat` with the zone and `Date.UTC` arithmetic, never a local `Date` getter and never `new Date("YYYY-MM-DD")` for arithmetic.
- `utils/clock.js` exports `now()`. Every service that needs the time accepts an optional `now` argument, so a test can fix it.
- Money is a PKR number rounded with `round2` once at the end of each computed amount.

## Auth flow

1. `POST /api/auth/login` checks the password against a dummy hash when the email is unknown, so both failures take the same time. An inactive account answers 401.
2. The session is a 15-minute access JWT signed with `JWT_ACCESS_SECRET` and a 7-day refresh JWT signed with `JWT_REFRESH_SECRET`. The refresh token is an httpOnly cookie named `rt` at `path=/api/auth` whose SHA-256 hash is stored on the user. At most five sessions are kept.
3. Login, refresh and `GET /api/auth/me` return `{ user, employee, mustChangePassword }`, where `employee` is `{ id, code, name, department, designation, status }` or null for the admin.
4. `protect` rejects a deactivated account with 401. When `mustChangePassword` is true, only `POST /auth/change-password`, `GET /auth/me`, `POST /auth/logout` and `POST /auth/refresh` pass; every other route answers 403 with `code: "PASSWORD_CHANGE_REQUIRED"`.
5. Refresh rotates the stored hash and keeps the previous token valid for ten seconds, so two tabs do not sign each other out. A token that is no longer stored is treated as reuse: every session for that user is cleared.
6. Setting an employee's `exitDate` marks the employee exited and deactivates the login.

## First-run setup

- `GET /api/setup/status` reports `{ setupComplete }`.
- `POST /api/setup { companyName, adminName, adminEmail, adminPassword }` claims the settings document with one atomic `findOneAndUpdate` on `{ _id: "company", setupComplete: false }` with upsert. The document id is fixed, so the storage engine enforces one settings document even before any index from the schema exists. The loser of two parallel calls either matches nothing or hits a duplicate key, and answers 409. The winner creates the admin, seeds the four leave types and writes `setup.complete` to the audit log.
- At start, when no admin exists and `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, `bootstrapAdminFromEnv()` does the same with `COMPANY_NAME` and the admin name `Admin`.
- The settings document is a singleton with a fixed `_id`. `settingsService` caches it for 30 seconds and every write clears the cache.

## Organization data

- Departments have a unique, case-insensitive name. Designations have a unique name and an optional department. Leave types have a unique lowercase slug code and a quota that is a whole number or null for unlimited. Holidays have a unique ISO date.
- Deleting a department is 409 while a designation or an employee references it. Deleting a designation is 409 while an employee references it. Deleting a leave type is 409 while any leave request uses it, with a message naming the type and the request count. Deleting a holiday always succeeds.
- Every write is recorded with `auditService.log(actor, action, entity, entityId, before, after)`.

## People

- `POST /api/employees` creates the login and the employee record together: role `employee`, `mustChangePassword: true`, a ten-character temporary password returned once, a welcome notification and an `employee.register` audit entry.
- Employee codes come from `employeeService.allocateEmployeeCode()`, an atomic counter that yields `EMP-0001`, `EMP-0002`, and so on and skips a code that already exists.
- `GET /api/employees` filters by `search` (name, code or email), department, designation and status, with paging. Rows carry the department and designation names next to their ids.
- `GET /api/employees/:id/360?month=YYYY-MM` returns `{ profile, attendance: { month, summary, days }, leaveBalances, recentLeaves, payslips }`. `payslips` stays an empty array until the payroll module writes it. An employee may read only their own 360 view.
- `PATCH /api/employees/:id` edits details and the exit date. Clearing the exit date reactivates the login.
- `PATCH /api/employees/:id/salary` takes `basicSalary`, `hraPercent` and `medicalPercent`. HR cannot change their own salary; the admin may change the salary of HR employees only.
- CSV import accepts a multipart field named `file`, at most 1 MB and 2000 rows. `?dryRun=true` returns `{ totalRows, validRows, errors: [{ row, field, reason }] }`. A real import refuses with 422 and the same report when any row has an error, otherwise it creates the employees and their logins and returns `{ created: [{ code, name, email, temporaryPassword }] }`. The allowed columns are `code,name,email,phone,address,gender,dateOfBirth,department,designation,joinDate,status,basicSalary`.
- `GET /api/employees/export` returns the same columns as `text/csv`; `GET /api/employees/import/template` returns the header row.

## Attendance

`services/attendanceCalc.js` holds the pure rules:

- `buildEmployeeDays({ employee, from, to, settings, holidaySet, records, approvedLeaveDates, today })` returns one entry per day, `{ date, status, record, isWorkingDay }`, applying the rules in this order: `not_employed` before the join date or after the exit date, `future` after today, `off` on a weekend or holiday (a record on that day is still returned), `on_leave` when an approved leave covers the day, `missing_checkout` when a past day has a record without a check-out, the stored record status otherwise, and `absent` when there is no record.
- `computeCheckInStatus(instant, settings)` is late when the local minute of day is past `officeStart` plus `graceMinutes`. 09:15 exactly is not late.
- `computeCheckOutStatus(record, instant, settings)` returns `{ workedMinutes, status }` and turns the day into `half_day` when the worked minutes are under `halfDayHours`.
- `evaluateCameraLocation({ settings, lat, lng, accuracy, faceCount })` returns `{ allowed, reason, distanceMeters }` for the strict camera path.
- `summarizeEmployeeDays(days)` returns the month counts, worked minutes, late count and the attendance rate as a ratio.

`services/attendanceService.js` holds the reads and writes:

- `getEmployeeDaysForRange(employeeIds, from, to, { now })` returns `Map<employeeId, day entries>` and is the shared reader for payroll and dashboards. Keep the signature stable. It loads settings, the holiday set, the employees, the attendance records and the approved leaves in a fixed number of queries, whatever the number of employees.
- Check-in and check-out stamp the server time, use the company date and store the status at write time, so a later settings change never rewrites history. A second check-in is 409, a check-out without a check-in is 422, a second check-out is 409, and approved leave covering today blocks a check-in with 422. Check-in is allowed on weekends and holidays.
- When `lat` and `lng` are sent and the office location is set, the distance is stored. `source: "camera"` is accepted only with exactly one face, an accuracy of 100 meters or better, an office location and a distance inside `radiusMeters`; otherwise it is 422 with the reason. `source: "web"` never rejects on location.
- Corrections accept a past or current date, at least one time and a reason of five characters or more. One pending request per date. Approving writes the attendance record with `source: "correction"`, converts the times with `zonedToUtc` and recomputes the worked minutes and status; when there is no record yet, both times are required. Rejection needs a comment.
- HR cannot decide their own correction. The admin may decide corrections that belong to HR employees.

## Leave

- `services/leaveCalc.js` holds the pure rules: working day counting through the company calendar, overlap detection, remaining days and the quota check.
- Days are the working days between the start and end date. A request must start and end in the same calendar year, end not before the start, and cover at least one working day.
- Balance per type is `{ quota, used (approved), pending, remaining }`, where remaining is the quota minus approved and pending days, or null for an unlimited type.
- Overlap with the employee's own pending or approved request is 422. A request over the quota is 422 with `Only N day(s) left for <type>`. Unlimited types never fail on balance.
- `POST /api/leave/preview` returns `{ valid, days, reason, remaining }` for the form without saving, and the remaining shown is what is left after the request.
- Cancel is owner-only: a pending request, or an approved request whose start date is still in the future.
- A decision needs the request to be pending. Rejection needs a comment; approval re-checks overlap and balance with the request itself excluded. Approval and rejection notify the employee, and the decision is audited.
- HR cannot decide their own request. The admin may decide requests that belong to HR employees.
- Leave submission notifies every HR user, and the admin too when the requester is HR. Corrections use the same rule.

## Audit trail

`AuditLog` is append-only. `pre` hooks reject `save` on an existing document, `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndDelete` and `findOneAndReplace` with an error. The only route over the collection is the read-only `GET /api/audit` for the admin. `auditService.log` removes any key that looks like a password, hash, token, secret, OTP or credential before writing.

Audited actions: `setup.complete`, `settings.update`, `department.create/update/delete`, `designation.create/update/delete`, `leaveType.create/update/delete`, `holiday.create/update/delete`, `user.createHr`, `user.activate`, `user.deactivate`, `user.resetPassword`, `employee.register`, `employee.update`, `employee.salaryUpdate`, `employee.import`, `attendance.correctionDecision`, `leave.decision`, `leave.cancel`, `announcement.create`, `announcement.delete`.

## Notifications

`notificationService.notify` writes one row, `notifyMany` writes a batch, `notifyApprovers` writes to every HR user and to the admins when the requester is HR, and `notifyActiveUsers` writes one row per active account. Unread count is `{ userId, readAt: null }`. Created now: welcome for a new account, leave submitted, leave decided, correction submitted, correction decided and announcements.

## API contract

All responses are JSON. Success bodies are `{ success: true, data }`; errors are `{ success: false, message, errors?, code? }`. Roles: A admin, H hr, E employee, * any signed-in account.

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/api/health` | public | status, uptime, timestamp, database state |
| GET | `/api/setup/status` | public | `{ setupComplete }` |
| POST | `/api/setup` | public | 201 with a session, 409 once complete |
| POST | `/api/auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/verify-otp`, `/reset-password` | public | as before |
| GET | `/api/auth/me` | * | `{ user, employee, mustChangePassword }` |
| POST | `/api/auth/change-password` | * | `{ currentPassword, newPassword }`, new session |
| PATCH | `/api/me/profile` | H, E | `{ phone, address }` |
| GET, PATCH | `/api/settings` | A, H read; A write | company settings |
| GET, POST, PATCH, DELETE | `/api/departments`, `/designations`, `/leave-types`, `/holidays` | * read; A write | delete in use is 409 |
| GET | `/api/users?role&search&page&limit` | A | paginated accounts |
| POST | `/api/users/hr` | A | `{ user, employee, temporaryPassword }` |
| PATCH | `/api/users/:id/active` | A | `{ isActive }` |
| POST | `/api/users/:id/reset-password` | A | `{ temporaryPassword }` |
| GET | `/api/employees?search&departmentId&designationId&status&page&limit` | A, H | paged rows with org names |
| POST | `/api/employees` | H | `{ employee, temporaryPassword }` |
| GET | `/api/employees/:id` | A, H any; E own | profile |
| GET | `/api/employees/:id/360?month` | A, H any; E own | profile, attendance, balances, leaves, payslips |
| PATCH | `/api/employees/:id` | H | details and exit date |
| PATCH | `/api/employees/:id/salary` | H; A for HR employees | salary fields |
| POST | `/api/employees/import?dryRun=true\|false` | H | multipart `file`, report |
| GET | `/api/employees/export`, `/api/employees/import/template` | H | `text/csv` |
| GET | `/api/attendance/today` | H, E | `{ date, record, status, canCheckIn, canCheckOut }` |
| POST | `/api/attendance/check-in`, `/check-out` | H, E | optional location and source |
| GET | `/api/attendance/me?month` | H, E | `{ month, days, summary }` |
| GET | `/api/attendance/board?date&departmentId&search&status&page` | A, H | one row per active employee |
| GET | `/api/attendance/employee/:employeeId?month` | A, H | `{ month, days, summary }` |
| POST | `/api/attendance/corrections` | H, E | `{ date, requestedCheckIn?, requestedCheckOut?, reason }` |
| GET | `/api/attendance/corrections?status&page` | E own; H, A all | requests with employee names |
| PATCH | `/api/attendance/corrections/:id` | H; A for HR employees | `{ decision, comment }` |
| GET | `/api/leave/balance?year` | H, E | `{ year, balances }` |
| POST | `/api/leave/preview` | H, E | `{ valid, days, reason, remaining }` |
| POST | `/api/leave/requests` | H, E | creates a pending request |
| GET | `/api/leave/requests?status&employeeId&from&to&page` | E own; H, A all | requests with employee names |
| PATCH | `/api/leave/requests/:id/cancel` | owner | pending, or approved and in the future |
| PATCH | `/api/leave/requests/:id/decision` | H; A for HR employees | `{ decision, comment }` |
| GET, POST, DELETE | `/api/announcements` | * read; A, H write | notifies every other active user |
| GET | `/api/notifications`, `/unread-count`; PATCH `/notifications/:id/read`, POST `/notifications/read-all` | * | own rows |
| GET | `/api/audit?actor&action&entity&from&to&page&limit` | A | read-only |
| POST | `/api/ai/chat`, GET `/api/ai/conversations/:id`, `/api/admin/ai/*` | as before | unchanged boilerplate routes until the AI prompt |

Status codes: 400 validation, 401 not signed in or inactive, 403 role or data scope, 404 not found, 409 conflict, 422 business rule broken, 429 rate limited.

## Add a module

### Backend

1. Create `server/src/models/Thing.js` with a `toJSON` transform that exposes `id` and removes `_id` and `__v`, plus the indexes the queries need.
2. Create `server/src/validators/thing.validators.js` with a create schema, an update schema that requires at least one field, and an id schema. Reuse `common.validators.js` for ids, dates, months and pagination.
3. Put the rules in `server/src/services/thingService.js`. Pure rules go in their own `thingCalc.js` so they can be unit tested without a database.
4. Create `server/src/controllers/thing.controller.js`, wrapped in `asyncHandler`, throwing `ApiError`, and writing an audit entry for every write.
5. Create `server/src/routes/thing.routes.js` and register it with one `router.use` line in `server/src/routes/index.js`.
6. Add unit tests for the pure rules and an HTTP check for the routes.

### Remove a module

Delete the model, validator, controller, service and route files, then remove the `router.use` line and the import. Audit and notification writes go with the controller that made them.

### Frontend

The client is rewritten by the frontend prompts. Until then, follow the existing client conventions in `knowledge.md` when touching it.

## Conventions

- Server code is ESM with explicit `.js` extensions.
- Validation lives in a validator, never in a controller.
- Controllers never touch `req.body` without prior validation and never trust a client-supplied owner id.
- Responses are `{ success, data, message? }`; errors are `{ success: false, message, errors?, code? }`.
- Business rules live in `services/`; a controller is input, one service call, output.
- Comments are two plain sentences at most, above a long function or a non-obvious rule.
