# Viva guide

How HCM Lite works, which files run each flow, and short answers to the questions a reviewer is likely to ask. Every path is relative to the repository root. `prompts/00-SPEC.md` is the source of truth for behaviour; this document explains the code that implements it.

## 1. First run and setup

`client/src/components/SetupGate.jsx` asks `GET /api/setup/status` once when the app opens and sends every path to `/setup` while the answer is incomplete. The screen posts to `POST /api/setup`, whose controller calls `completeSetup` in `server/src/services/setupService.js`. That service claims the singleton settings document with one atomic update on `{ _id: "company", setupComplete: false }`, so two parallel submissions cannot both win: the loser either matches nothing or hits the duplicate key and answers 409. The winner creates the admin, seeds the four leave types (annual, sick, casual, unpaid), writes `setup.complete` to the audit log and returns a normal session.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` do the same job at start through `bootstrapAdminFromEnv()`, for a deployment that should not show the setup screen at all.

Questions a reviewer may ask:

- Why an atomic update instead of a check followed by a write? Two tabs can submit the same form at the same moment. The database does the deciding, not the JavaScript.
- Why a fixed settings id? The storage engine enforces one settings document before any index exists.

## 2. Login, refresh tokens and the forced password change

`client/src/pages/Login.jsx` calls `login` in `client/src/context/AuthContext.jsx`, which posts to `/api/auth/login`. `login` in `server/src/controllers/auth.controller.js` compares the password with `bcrypt.compare` and compares against a dummy hash when the email is unknown, so both failures take a similar time and return the same 401. `createSession` in `server/src/utils/tokens.js` signs a 15 minute access token plus a 7 day refresh token, stores only the SHA-256 hash of the refresh token on the user, keeps the five newest sessions and writes the refresh token as the httpOnly cookie `rt` at `path=/api/auth`. In production that cookie is `Secure` and `SameSite` is taken from `COOKIE_SAMESITE`.

The access token lives in memory in `client/src/lib/tokenStore.js`. `client/src/api/http.js` attaches it as a bearer header and, on a 401, refreshes once for every waiting request and retries the original call once. A failed refresh clears the session and dispatches `auth:logout`.

A new HR or employee account has `mustChangePassword: true`. `protect` in `server/src/middleware/auth.js` then allows only `POST /auth/change-password`, `GET /auth/me`, `POST /auth/logout` and `POST /auth/refresh`; every other route answers 403 with `code: "PASSWORD_CHANGE_REQUIRED"`, and the client routes to `/change-password`.

Questions a reviewer may ask:

- Why keep the access token in memory? It never reaches `localStorage`, so a cross-site scripting bug cannot read it, and the httpOnly refresh cookie restores the session after a reload.
- Why hash the refresh token in the database? A database dump then contains nothing usable.
- Why not call refresh on every page load? The cookie is httpOnly, so the page cannot see whether it exists. A small local flag (`hasSessionHint`) says when a refresh is worth trying; otherwise every visitor would see a 401 in the console.

## 3. Roles and scope

Three roles: `admin`, `hr`, `employee`. `restrictTo(...roles)` in `server/src/middleware/auth.js` answers the role question per route. The data-scope question is answered inside services, because only they know which row belongs to whom: `findOwnEmployee(actor.id)` for self-service reads, `approvalService` for who may decide a request, and explicit checks that turn an employee's attempt to read a colleague into a 403.

The admin has no employee record. HR and employees do, which is why an HR person can check in, request leave and receive a payslip like anybody else.

Questions a reviewer may ask:

- Why not put scope checks in middleware? A middleware would have to know the shape of every resource. The service already loads the record, so it is the right place to decide whether this actor may see it.
- Why can an employee open `/employees/:id` in the client? The server answers 403 with a clear message. Hiding the screen would only hide the rule.
- Why can HR not approve their own leave? `approvalService` refuses a decision on your own request, and the admin may decide HR requests so nobody is blocked.

## 4. Employees

`POST /api/employees` (HR) creates the login and the employee record together with a ten character temporary password that is returned once. Codes come from `allocateEmployeeCode()` in `server/src/services/employeeService.js`, an atomic counter that yields `EMP-0001`, `EMP-0002`, and so on and skips a code that already exists.

`GET /api/employees/:id/360?month=YYYY-MM` composes the profile, the attendance month, the leave balances, recent leave and the finalized payslips. Salary fields appear only for the admin, HR and the employee who owns the record.

CSV import is a dry run by default: the same parser returns `{ totalRows, validRows, errors }`, and a real import refuses with 422 and the same report while any row has an error. The department and designation must already exist, so a typo cannot create organisation data by accident.

Questions a reviewer may ask:

- Why is the temporary password shown once? It is never stored in clear text, so the dialog is the only chance to copy it.
- Why an atomic counter for codes? Two registrations at the same time must not produce the same code; `Counter` uses `findOneAndUpdate` with `$inc`.
- Why does import refuse the whole file? Half an import is worse than none: the HR person fixes the sheet and runs it again.

## 5. Attendance

`server/src/services/attendanceCalc.js` holds the pure rules. `buildEmployeeDays` returns one entry per day in a fixed order: `not_employed`, `future`, `off` (weekend or holiday), `on_leave`, `missing_checkout`, the stored record status, `absent`. `computeCheckInStatus` compares the local minute of day with `officeStart` plus `graceMinutes`, so 09:15 exactly is not late. `computeCheckOutStatus` turns a day into `half_day` when the worked minutes are under `halfDayHours` and overrides the late status.

Check-in and check-out stamp the server time and store the status at write time, so a later settings change never rewrites history. A second check-in is 409, a check-out without a check-in is 422, approved leave covering today is 422, and check-in stays allowed on weekends and holidays because a judge may demo on a Saturday.

Corrections are a request plus a decision. Approving writes the record with `source: "correction"`, converts the two times with `zonedToUtc` and recomputes the status with the current settings.

Questions a reviewer may ask:

- Why store the status instead of deriving it on read? A settings change (later office start) should not rewrite last month's late marks.
- Why is the timezone handled in one module? The server runs in UTC. `server/src/utils/dates.js` is the only place that knows company time, and never uses a local `Date` getter or `new Date("YYYY-MM-DD")` for arithmetic.
- Why keep `getEmployeeDaysForRange` as the single reader? Payroll, dashboards and the AI tools all read days through it, so their numbers cannot disagree.

## 6. Leave

`server/src/services/leaveCalc.js` counts working days through the company calendar and checks overlap and quota. Days are the working days between start and end, a request must stay inside one calendar year and cover at least one working day, and overlap with the employee's own pending or approved request is 422.

Balance per type is `{ quota, used, pending, remaining }`, where remaining is quota minus approved and pending days, or null for an unlimited type. `POST /api/leave/preview` returns `{ valid, days, reason, remaining }` without saving, so the form can disable Apply before the server would reject it.

Approval re-checks overlap and balance with the request itself excluded, notifies the employee, and is audited. HR cannot decide their own request; the admin can decide HR requests.

Questions a reviewer may ask:

- Why is the preview a server call? The calendar, holidays and quota all live server side. A client copy would drift.
- Why does over-quota read "Only N day(s) left for casual"? The sentence tells the user what to change.
- Why cancel an approved request only before it starts? Days already taken must stay in the balance.

## 7. Payroll

`server/src/services/payrollCalc.js` is pure: `grossOf`, `annualTax` and `calculatePayslip`. The rules are spec section 4.5:

- gross = basic x (1 + hraPercent/100 + medicalPercent/100), 1.5 x basic by default.
- working days come from the company calendar; eligible days are the working days between the join date (or month start) and the exit date (or month end).
- earned gross = gross x eligible days / working days.
- a day is deducted only when it is absent, unpaid leave of an unpaid type, or half day; late and missing check-out cost nothing.
- annual tax is computed on twelve months of gross through the slabs, then spread over the eligible days.
- net pay = earned gross - attendance deduction - tax, never below zero.

`POST /api/payroll/runs` (HR) builds every payslip in memory, replaces the payslips of an existing draft and saves the totals. A finalized month is 409 and a future month is 422. Finalize is admin-only: it locks the month, notifies every employee with a payslip and is audited.

Each payslip stores a full snapshot of the employee code, name, department and designation, plus every computed number. Later salary edits and even a rename never change a stored payslip.

Questions a reviewer may ask:

- Why a snapshot on the payslip? A payslip is a record of what was paid. Reading it through the live employee document would change history.
- Why can the employee see only finalized runs? A draft is a working document; the employee should not see numbers that may still change.
- Why is the PDF streamed from the server? The browser must not be able to read the file without the same role and scope checks as the JSON.
- Where is the worked example? `server/test/payroll.test.js` asserts basic 100000 with 22 working days, 1 absent, 1 unpaid and 2 half days gives net pay 119545.45.

## 8. Dashboards and metrics

`server/src/services/analyticsService.js` exports one function per metric and `dashboardService.js` composes the three payloads. Everything is computed from one read of the day entries (`getEmployeeDaysForRange`), so the admin view, the HR view and the AI tools agree.

- Headcount is the number of employees employed on a date: joined on or before it and not exited before it.
- Attendance rate = (present + late + missing check-out + half of the half days) / expected days, with on-leave days excluded.
- Absenteeism is absent days over expected days per department, and leave utilization is approved days over quota times headcount.
- Payroll cost counts finalized runs only, by month and by department.

Questions a reviewer may ask:

- Why exclude on-leave days? A person on approved leave was not expected to work, so counting them would make the rate look worse for no reason.
- Why does the trend drop empty days? A weekend has no expected work and would draw a fake zero on the chart.
- Why is the admin allowed on `GET /dashboard/hr`? Spec section 5 grants it; the admin reads the live view of the day while the HR dashboard carries the operational numbers.

## 9. AI assistant

The browser talks to `POST /api/ai/chat` through `client/src/hooks/useAssistant.js`, which keeps the thread and the conversation id in `sessionStorage` so the thread survives navigation but not a new session.

On the server, `runChat` in `server/src/services/aiAssistant.js` builds the system prompt from the company settings, the leave types and the fixed policy text, chooses the tools for the role and runs at most four model calls inside a 15 second budget. Every step goes through `callWithPool` in `server/src/services/aiKeyPool.js`, which claims the least recently used enabled key of the default provider, decrypts it, calls the provider, and rotates to the next key on a retryable failure.

The tools in `server/src/services/aiTools.js` call the same services as the dashboards: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_payroll_summary` and `search_employees` for admin and HR, plus `get_my_leave_balance`, `get_my_attendance_summary` and `get_my_last_payslip` for everybody. An employee is given only the own-data tools, and every tool result is built from the role's scope, so no tool can return another person's salary.

`POST /api/ai/dashboard-summary` uses the same metrics and falls back to rule-based bullets when the model is unavailable, with `fallback: true`. `POST /api/ai/smart-leave` turns plain words into a leave suggestion and never writes anything.

Questions a reviewer may ask:

- How do the tools stay in sync with the dashboard? Both read `analyticsService` and `attendanceService`; no tool has its own query.
- Why cap the model calls? A model that keeps calling tools must not run until the request times out; four calls is enough for one lookup plus an answer.
- Why is a blank optional argument dropped before validation? A model sends `null` or `""` for an argument it has nothing for; the schemas treat those as "not provided" instead of failing the call.
- Why does the Gemini adapter send the thought signature back? Gemini 3 rejects the next turn of a tool conversation without it.
- Why is the same provider pair used for Groq and xAI? Both speak the OpenAI tool-calling shape, so one adapter covers them, and the env key prefix (`gsk_`, `xai-`) decides the base URL and default model.

## 10. Audit and notifications

`auditService.log(actor, action, entity, entityId, before, after)` strips passwords, hashes and tokens before writing. `AuditLog` throws on update and delete and the router exposes only `GET /api/audit`, so the trail is append-only.

`notificationService` is called by the service that performs the action: leave submitted and decided, correction submitted and decided, payroll finalized, announcement posted, account created. In-app notifications are written to `Notification`; email goes through Resend only when `RESEND_API_KEY` is set.

Questions a reviewer may ask:

- Why is the audit write inside the service? The rule and its record belong together; a controller that forgets to log would leave a gap.
- Why only in-app notifications for decisions? Email needs a configured sender; the bell always works.

## 11. The client

- `client/src/App.jsx` holds the route table. `/payroll`, `/payroll/:id` and `/me/payslips` are built from the payroll API; `/dashboard` picks the dashboard by role; `/employees/:id` sits outside the role group so an employee sees the server message instead of a redirect.
- `client/src/components/dashboard/` holds `AdminDashboard`, `HrDashboard`, `MyDay` and `SummaryCard`. Charts come from `client/src/components/charts/ChartBoxes.jsx`, which wraps recharts in `ChartCard` and adds a visually hidden text summary for each chart.
- `client/src/components/payroll/PayslipDrawer.jsx` shows the full breakdown and downloads the PDF through `client/src/api/payslips.api.js` with the auth header, never by opening the URL.
- `client/src/components/ai/AssistantPanel.jsx` is the floating drawer mounted once in `AppShell`. It renders answers with `react-markdown` and `remark-gfm` (no raw HTML), shows which tools were used, offers prompts by role and handles 429 and 503 with their own sentences.
- `client/src/lib/format.js` is the only place that decides how money, dates and times look: `formatMoney` writes `PKR` and groups thousands, `formatTime` and `formatDateTimeIn` print instants in the company timezone.

Questions a reviewer may ask:

- Why lazy load the dashboard and assistant chunks? Recharts and the markdown renderer are the two large dependencies; loading them on demand keeps the first paint small and the build free of size warnings.
- Why is `Modal` able to open as a drawer? The payslip and the assistant need a full height panel on a phone and a side panel on a desktop; one component with a `variant` keeps the focus trap, scroll lock and Escape handling in one place.

## 12. Where to change things quickly

- **A new metric.** Add a function to `analyticsService.js`, compose it in `dashboardService.js`, render it in the matching dashboard component. The AI tools can use it the same way.
- **A new AI tool.** Add the spec to `TOOL_SPECS` in `aiTools.js` with its zod schema and `run`, then list the name in `ORG_TOOLS` or `OWN_TOOLS`; `toolsForRole` and `executeTool` pick it up.
- **A new screen.** Add an API module in `client/src/api`, a page in `client/src/pages`, a route in `App.jsx` and a menu entry in `client/src/config/menus.js`.
- **The colours.** Change the CSS variables in `client/src/index.css`; charts read the same tokens through `client/src/lib/chart.js`.
- **The tax slabs or the gross formula.** `server/src/services/payrollCalc.js`, then the unit test in `server/test/payroll.test.js`.

## 13. The checks in the repository

- `npm test --prefix server` runs the unit tests for dates, money, attendance, leave, payroll, analytics, the AI prompt and tools, and the temporary password.
- `npm run demo:check` plays the five minute demo against a running server and refuses to start when setup is already complete, so the hosted app stays empty for the judges.
- `npm run rbac:check` walks every route as admin, HR, employee and anonymous, then checks object level rules and scans every response for password hashes, tokens and provider keys. Run it after `demo:check` on the same database, because it signs in as the demo accounts.
- `npm run db:reset hcm_test` drops the named database, and only when the name matches `MONGODB_URI`.
