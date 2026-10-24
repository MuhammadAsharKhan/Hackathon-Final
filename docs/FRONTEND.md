# Frontend

The client is a Vite + React 18 single page app in `client/`. It is the HCM Lite interface described in `prompts/00-SPEC.md`; this document records what is built, where it lives and how it is wired.

Design tokens, typography and component rules live in `theme.md`. The server contract lives in `docs/ARCHITECTURE.md` and `server/src/routes`.

## Run

```bash
npm run dev              # API on 5000 and client on 5173
npm run build            # production build into client/dist
```

`client/.env` (optional):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API path on the page origin. Absolute values are ignored so requests stay same origin. |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Where the Vite dev server forwards `/api`. Point it at another port when a second API instance runs. |

The client is fixed to port 5173 with `strictPort`. It never reads `PORT`.

## Folder map

```
client/src/
├── App.jsx                  Route table, guards, toaster
├── main.jsx                 Auth and setup providers, router
├── api/                     One module per resource plus http.js
├── components/
│   ├── data/                DataTable, FilterBar, ChartCard
│   ├── charts/              BarChartBox, LineChartBox, PieChartBox
│   ├── dashboard/           AdminDashboard, HrDashboard, MyDay, SummaryCard
│   ├── payroll/             PayslipDrawer and the PDF button
│   ├── ui/                  Shared controls and states
│   ├── layout/              AppShell, Sidebar, Topbar, NotificationBell, UserMenu, AuthLayout, Footer, ScrollManager
│   ├── organization/        Company settings and the four organization panels
│   ├── users/               Create HR modal and the one time password modal
│   ├── announcements/       Announcement form modal
│   ├── audit/               Before and after block for audit rows
│   ├── ai/                  Assistant panel, provider, bubbles and the admin key screens
│   ├── auth/                Forgot password modal, email code flow
│   ├── SetupGate.jsx        Setup redirect gate
│   ├── ProtectedRoute.jsx   Session, role and forced password gate
│   └── GuestRoute.jsx       Keeps signed-in users out of the auth screens
├── config/menus.js          One menu definition for the three roles
├── context/                 AuthContext, SetupContext
├── hooks/                   useAuth, useResource, useConfirm, useDebounce, useDocumentTitle, useMountedRef, useResendCountdown
├── lib/                     errors, format, dates, navigation, validation, tokenStore, cn, scroll
└── pages/                   One file per route
```

## Routes

Public routes are reachable without a session. Every other route needs one.

| Path | Roles | Page | Notes |
| --- | --- | --- | --- |
| `/setup` | public | `pages/Setup.jsx` | Only while setup is incomplete. Finishing it signs the admin in and opens `/admin/organization`. |
| `/login` | public | `pages/Login.jsx` | Redirects to `/setup` while setup is incomplete and to the dashboard when a session exists. |
| `/change-password` | signed in | `pages/ChangePassword.jsx` | Also the forced target when `mustChangePassword` is true. |
| `/dashboard` | signed in | `pages/Dashboard.jsx` | Default landing. Renders the admin, HR or employee dashboard for the signed-in role. |
| `/announcements` | signed in | `pages/Announcements.jsx` | Posting for admin and HR, delete for admin or the author. |
| `/admin/organization` | admin | `pages/Organization.jsx` | Tabs: Company, Departments, Designations, Leave types, Holidays. |
| `/admin/users` | admin | `pages/AdminUsers.jsx` | HR logins, one time passwords, activate, deactivate, reset. |
| `/admin/audit` | admin | `pages/AuditLog.jsx` | Filters and expandable before/after rows. |
| `/admin/ai` | admin | `pages/AdminAi.jsx` | Provider keys, models and the system prompt. |
| `/employees` | admin, hr | `pages/ComingSoon.jsx` | Placeholder until the people step. |
| `/attendance` | admin, hr | `pages/ComingSoon.jsx` | Placeholder. |
| `/leave/requests` | admin, hr | `pages/ComingSoon.jsx` | Placeholder. |
| `/payroll` | admin, hr | `pages/Payroll.jsx` | Runs table, month picker and the draft button for HR. |
| `/payroll/:id` | admin, hr | `pages/PayrollRun.jsx` | Totals, payslips, the payslip drawer, recalculate for HR and finalize for the admin. |
| `/me/attendance` | hr, employee | `pages/ComingSoon.jsx` | Placeholder. |
| `/me/leave` | hr, employee | `pages/ComingSoon.jsx` | Placeholder. |
| `/me/payslips` | hr, employee | `pages/MyPayslips.jsx` | Finalized payslips with a PDF button per row. |
| `/me/profile` | hr, employee | `pages/MyProfile.jsx` | Read only record, editable phone and address, link to change the password. |
| `*` | any | `pages/NotFound.jsx` | Unknown paths. Inside the shell when signed in. |

`/` redirects to `/dashboard`.

## Guards and session flow

- `SetupGate` calls `GET /setup/status` once at start. While it loads, a page loader shows. If the call fails the gate offers a retry. Setup incomplete sends every path to `/setup`; a completed setup sends `/setup` to `/login`, unless the setup request just created a session.
- `ProtectedRoute` waits for the session bootstrap, sends visitors without a session to `/login` with the current location in `state.from`, and sends a role mismatch to `/dashboard`. While `mustChangePassword` is true it sends every path except `/change-password` there.
- `GuestRoute` sends a signed-in visitor to `state.from`, the dashboard, or the change password screen when the password is still temporary.
- The access token lives in memory (`lib/tokenStore.js`). The refresh token stays in the httpOnly cookie at `/api/auth`. A full reload restores the session through `POST /auth/refresh` once, when the local session hint is set.
- `api/http.js` retries one 401 after a single shared refresh, clears the session when the refresh fails, dispatches `auth:passwordChangeRequired` on a `403` with code `PASSWORD_CHANGE_REQUIRED`, and leaves role and rate limit errors to the page. Errors are turned into text by `lib/errors.js`: `Cannot reach the server. Try again.` when there is no response, the server message when there is one, and `Too many requests. Try again in a minute.` for 429.
- `AuthContext` holds `user`, `employee`, `mustChangePassword` and `loading`, and exposes `login`, `logout`, `changePassword`, `refreshAccount`, `applySession` (setup and login) and `applyEmployee` (profile edits).
- `SetupContext` holds `loading`, `setupComplete`, `failed`, `reload` and `markComplete`.

## Menus

`config/menus.js` is the only place a menu is defined. Each role maps to groups of `{ label, to, icon }` items.

- Admin: Dashboard, Organization, Users, Employees, Attendance, Leave, Payroll, Announcements, Audit log, AI keys.
- HR: Dashboard, Employees, Attendance, Leave requests, Payroll, Announcements, then the "My space" group with My attendance, My leave, My payslips, My profile.
- Employee: Dashboard, My attendance, My leave, My payslips, My profile, Announcements.

`pageTitleFor(path)` reads the same file for the top bar title, with a few extra titles for `/change-password`, `/setup` and `/login`.

## App shell

`components/layout/AppShell.jsx` renders a sticky sidebar from `md` up and a drawer below it. The drawer closes on navigation, on Escape, on the backdrop and on its close button. The top bar holds the page title, the notification bell and the user menu.

- The bell polls `GET /notifications/unread-count` every 30 seconds, loads the latest eight notifications when opened, marks a row read when it is opened, follows its `link`, and offers mark all read.
- The user menu shows the name, role, email, a link to change the password and sign out.
- The sidebar highlights the active route and ends with the signed-in name and role.

## API layer

Every call goes through `api/http.js`. Each module unwraps `{ success, data }` and returns `data`.

| Module | Functions |
| --- | --- |
| `setup.api.js` | `getSetupStatus`, `completeSetup` |
| `auth.api.js` | `login`, `logout`, `refresh`, `getMe`, `changePassword`, `forgotPassword`, `verifyOtp`, `resetPassword` |
| `settings.api.js` | `getSettings`, `updateSettings` |
| `organization.api.js` | list, create, update and delete for departments, designations, leave types and holidays |
| `users.api.js` | `listUsers`, `createHrUser`, `setUserActive`, `resetUserPassword` |
| `announcements.api.js` | `listAnnouncements`, `createAnnouncement`, `deleteAnnouncement` |
| `notifications.api.js` | `listNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead` |
| `audit.api.js` | `listAuditLogs` |
| `profile.api.js` | `updateMyProfile`, `getEmployeeProfile` |
| `payroll.api.js` | `listPayrollRuns`, `getPayrollRun`, `createPayrollRun`, `finalizePayrollRun`, `listMyPayslips`, `getPayslip` |
| `payslips.api.js` | `downloadPayslipPdf` as a blob with the auth header |
| `dashboard.api.js` | `getAdminDashboard`, `getHrDashboard`, `getMyDashboard` |
| `ai.api.js` | `chatWithAssistant`, `dashboardSummary`, `smartLeave`, plus the admin key calls |

`GET /employees/:id` feeds the contact details on My profile. It belongs to the people module; when it is missing the page says the details did not load and still saves phone and address through `PATCH /me/profile`.

## Shared components

Lists use `DataTable` with a column config of `{ key, header, render, className }`. It renders skeleton rows while loading, an `EmptyState` when there is nothing, an `ErrorState` with retry when the request fails, an optional pagination footer, and expandable rows through `renderExpanded`.

`FilterBar` takes `search` (debounced 400 ms), `filters` (selects), `fields` (text inputs) and `dateRange` (two date inputs), plus an optional clear action.

`ChartCard` and `StatCard` are the dashboard building blocks: a titled card with an empty state and a tinted surface card for one number.

`StatusBadge` maps attendance, leave, payroll, employee and account statuses to labels and the four tones. `DateInput`, `MonthInput` and `Checkbox` complete the native controls. `PageSection` groups a titled block. `PageLoading` is the page level spinner.

`useResource(loader, deps)` runs one read and returns `{ data, loading, error, reload, setData }`. `useConfirm()` drives a `ConfirmDialog` from one call site: `ask({ title, description, confirmLabel, run })` and `<ConfirmDialog {...dialogProps} />`. A failing `run` keeps the dialog open with the server message, which is how the in-use 409 on organization deletes is shown.

## Page behaviour

- Setup checks the company name, admin name, email, password and confirmation, then starts the session, marks setup complete and opens the Organization company tab.
- Login has no register link. Forgot password opens the existing reset flow. Server field errors land under their fields.
- Change password shows the temporary password notice, the rules, and signs the user in with the new session after saving.
- Organization keeps one panel per tab. Company settings validate numbers locally and offer "Use my current location" for the office coordinates. Departments, designations, leave types and holidays each have an add and edit modal plus a delete confirmation. Deleting something in use keeps the dialog open with the server message.
- HR accounts are created from a modal. The temporary password appears once in a modal with a copy button and a warning. Reset password shows the same one time dialog.
- Announcements show newest first with the author and role. Admin and HR post, admin or the author delete.
- Audit log filters by actor, action, entity and date range, and expands a row into readable before and after JSON.
- My profile shows the employee record from `GET /auth/me` and saves phone and address.

Every data view has a loading, empty and error state, forms disable while submitting, and nothing shows a raw error object. Pages work from 375 px; tables scroll inside their card instead of the page.

## Later steps

- People, attendance and leave screens: `docs/FRONTEND_PEOPLE.md`.
- Payroll, dashboards and the assistant: `docs/FRONTEND_PAYROLL_AI.md`.

## Known issues

- The payroll runs table shows the finalized date but not the finalizer name, because the server stores the user id without populating it.
- Chart data is repeated as a visually hidden text summary for screen readers rather than as a data table.
