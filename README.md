# HCM Lite

HCM Lite is a small human capital management app for a single company: first-run setup, company rules, departments and designations, employee records with CSV import, daily attendance with corrections, leave with balances and approvals, monthly payroll with locked payslips and PDFs, three role dashboards, an audit trail and an AI assistant that answers from the company's own data through role-scoped tools. An admin, HR users and employees each see only what their role and their own record allow.

## Stack

- **Server**: Node.js (ES modules), Express 4, Mongoose 8, MongoDB Atlas or local MongoDB, Zod, JWT, bcryptjs, helmet, express-rate-limit, multer, csv-parse, pdfkit.
- **Client**: Vite 8, React 18, React Router 6, Tailwind CSS 3.4, axios, recharts, react-markdown with remark-gfm, lucide-react, react-hot-toast.
- **AI**: Gemini for native tool calling, and any OpenAI-compatible endpoint (Groq, xAI) through one adapter. Keys live encrypted in the database and rotate on failure.
- **Tests**: `node:test` unit tests plus two dependency-free check scripts.

## Architecture in short

- `server/src/routes` declares who may call what (`protect`, `restrictTo`), `validators` shape the input with Zod, `controllers` read the request and return `{ success, data }`.
- `server/src/services` holds every business rule. Payroll, attendance, leave, analytics and the AI tools all read the same services, so a number on a dashboard matches the same number in an answer or a payslip.
- `client/src/pages` composes shared components from `client/src/components`; `client/src/api` is one module per resource; `client/src/hooks` holds the request, chat and confirm hooks.
- Settings are a singleton document; business dates are `YYYY-MM-DD` strings in the company timezone; money is a PKR number rounded once on the server.
- `scripts/` holds the demo run, the role matrix and the guarded database reset.

## Run it locally (under 10 minutes)

1. **Install**
   ```bash
   npm run install:all
   ```
2. **Configure the API**
   ```bash
   cp server/.env.example server/.env
   ```
   Fill `MONGODB_URI` (local `mongodb://127.0.0.1:27017/hcm_dev` or an Atlas string), and generate the secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_ACCESS_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_REFRESH_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_RESET_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # AI_KEY_SECRET (64 hex chars)
   ```
3. **Start both apps**
   ```bash
   npm run dev
   ```
   The API listens on `http://localhost:5000`, the client on `http://localhost:5173` and proxies `/api` to the API.
4. **Open the app** at `http://localhost:5173`. The first visit shows the setup screen: company name, admin name, admin email and a password of 8 or more characters. Setup signs the admin in and seeds the four leave types.
5. **Or skip the screen** by setting `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `COMPANY_NAME` in `server/.env`: the admin is created at start when no admin exists, and `/setup` then reports the setup as complete.

After setup, create a department, a designation, an HR login (the temporary password is shown once), then employees. An HR account must change its temporary password on first sign-in, and so must every employee.

## Environment variables

### server/.env

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` turns on secure cookies and hides internal error text. |
| `PORT` | no | `5000` | API port. |
| `MONGODB_URI` | yes | - | MongoDB connection string, including the database name. |
| `JWT_ACCESS_SECRET` | yes | - | 32+ characters, signs the 15 minute access token. |
| `JWT_REFRESH_SECRET` | yes | - | 32+ characters, signs the 7 day refresh token. |
| `JWT_RESET_SECRET` | yes | - | 32+ characters, signs the password reset token. |
| `ACCESS_TOKEN_TTL` | no | `15m` | Access token lifetime. |
| `REFRESH_TOKEN_TTL_DAYS` | no | `7` | Refresh token lifetime in days. |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed browser origin(s), comma separated. |
| `COOKIE_SAMESITE` | no | `lax` | `lax`, `strict` or `none` for the refresh cookie. |
| `TRUST_PROXY_HOPS` | no | `1` | How many proxies in front of the API; use `2` behind a Vercel rewrite plus Railway. |
| `SELF_URL` | no | - | Public API URL; enables the production keep-alive ping. |
| `KEEP_ALIVE_MINUTES` | no | `4` | Minutes between keep-alive pings. |
| `COMPANY_NAME` | no | `My Company` | Used when the admin is created from the environment. |
| `ADMIN_EMAIL` | no | - | Creates the admin at start when no admin exists. |
| `ADMIN_PASSWORD` | no | - | Password for that admin, 8+ characters. |
| `RESEND_API_KEY` | no | - | Sends password reset mail; without it the code is printed in the development log. |
| `MAIL_FROM` | no | `onboarding@resend.dev` | Sender address. |
| `AI_KEY_SECRET` | yes | - | Exactly 64 hex characters, encrypts stored provider keys with AES-256-GCM. |
| `AI_COOLDOWN_SECONDS` | no | `60` | Cooldown for a key that hit a rate limit. |
| `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2` | no | - | Gemini keys, seeded on the first start of an empty database. |
| `GROK_API_KEY_1`, `GROK_API_KEY_2` | no | - | OpenAI-compatible keys. The prefix picks the vendor: `gsk_` is Groq, `xai-` is xAI. |
| `AI_API_KEY` | no | - | One key instead of the numbered variables, with its vendor in `AI_PROVIDER`. |
| `AI_PROVIDER` | no | `gemini` | Vendor of `AI_API_KEY`: `gemini`, `groq` or `xai`. |

### client/.env (optional)

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API path on the page origin. Absolute URLs are ignored so requests stay same origin. |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Where the dev server forwards `/api`. |

## Configure the AI assistant

The assistant is optional. Without a key the app works and the assistant says it is unavailable; `demo:check` skips the AI steps.

1. **One key from the environment.** Set `AI_API_KEY` and `AI_PROVIDER` (`gemini`, `groq` or `xai`), or set the numbered variables. The first start of an empty database imports those keys into the encrypted key store and picks the matching base URL and default model.
2. **More keys from the UI.** Sign in as the admin and open **AI keys**. Add a key with its provider and an optional label, test it, disable it, or delete it. Keys are encrypted with `AI_KEY_SECRET` and never returned; only a masked tail is shown.
3. **Rotation.** The pool claims the least recently used enabled key of the default provider, and rotates to the next key when one is rate limited, times out or fails. An invalid key is disabled, a temporary failure cools the key down for the retry window or `AI_COOLDOWN_SECONDS`, and a request the provider rejects stops the rotation with the reason recorded. The default provider, the two models, the base URLs and the system prompt are editable on the same screen; the environment key is imported only when the database holds no key at all, so an admin edit survives a restart.
4. **Costs.** Each user gets 20 AI requests per hour across all AI routes, one request may make at most four model calls within 15 seconds, and every call is logged in `AiLog` with its tool names, status and latency.

## Deploy

### Frontend on Vercel

1. Import the repository, set **Root Directory** to `client`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. `client/vercel.json` already rewrites `/api/:path*` to the backend and everything else to `index.html`. Change the destination to your own Railway URL.
4. No frontend environment variables are needed; the client calls `/api` on its own origin.

### Backend on Railway

1. New service from the same repository, **Root Directory** `server`, start command `npm start`.
2. Add every variable from the server table, including `NODE_ENV=production`, `TRUST_PROXY_HOPS=2` (the Vercel rewrite is one hop and Railway's edge is the second) and `CLIENT_URL` set to the Vercel URL.
3. Set `SELF_URL` to the Railway URL so the keep-alive ping and the health route keep the free instance warm. `GET /api/health` is public and outside the rate limiter.
4. In MongoDB Atlas allow `0.0.0.0/0` in Network Access (Railway egress addresses vary) and create a database user with read/write on the database in `MONGODB_URI`.

### Submission

- Commit `.env.example` files only. `git ls-files` must show no real `.env`; the root `.gitignore` covers them.
- Keep the hosted database empty before judging: `npm run demo:check` refuses to run when setup is complete, which is the guard against seeding the judge copy.

## Checks

```bash
npm test --prefix server                 # 85 unit tests: dates, money, attendance, leave, payroll, analytics, AI, passwords
npm run build                            # client production build, no warnings
npm run demo:check                       # the five minute demo against BASE_URL (default http://localhost:5000/api)
npm run rbac:check                       # every route as admin, HR, employee and anonymous, plus object scope and a secret scan
npm run db:reset hcm_test                # drops one database, and only when the name matches MONGODB_URI
```

- `BASE_URL` points either script at another server, for example `BASE_URL=http://localhost:5066/api npm run demo:check`.
- `demo:check` needs an app with no setup yet. It prints `PASS`, `FAIL` or `SKIPPED` per step and exits 1 on any failure; AI steps are `SKIPPED` when no key is configured.
- `rbac:check` runs after `demo:check` on the same database, because it signs in as the demo accounts it created.
- The automated checks use a database named `hcm_test`; local work uses `hcm_dev`. Drop the test database when finished.

## Functionalities

| # | Functionality | Where | Done |
| --- | --- | --- | --- |
| 1 | First-run setup with company and admin | `pages/Setup.jsx`, `setupService.js` | Done |
| 2 | Company rules: timezone, office hours, grace, half day, weekend, office location and radius, weekly hours | `components/organization/CompanySettings.jsx` | Done |
| 3 | Departments | `components/organization/DepartmentsPanel.jsx` | Done |
| 4 | Designations | `components/organization/DesignationsPanel.jsx` | Done |
| 5 | Leave types with quota and paid flag | `components/organization/LeaveTypesPanel.jsx` | Done |
| 6 | Holidays | `components/organization/HolidaysPanel.jsx` | Done |
| 7 | Admin creates HR logins with a one time password | `pages/AdminUsers.jsx`, `components/users/CreateHrModal.jsx` | Done |
| 8 | Activate, deactivate and reset a login | `pages/AdminUsers.jsx` | Done |
| 9 | Employee registration | `pages/Employees.jsx`, `components/employees/EmployeeFormModal.jsx` | Done |
| 10 | Employee list with search, department, designation and status filters | `pages/Employees.jsx` | Done |
| 11 | Employee 360: profile, attendance, leave, payslips | `pages/EmployeeDetail.jsx` | Done |
| 12 | Salary update with a gross preview | `components/employees/SalaryModal.jsx` | Done |
| 13 | Employee CSV import with a dry run, export and template | `components/employees/ImportCsvModal.jsx` | Done |
| 14 | Check-in and check-out with optional location | `components/attendance/CheckInPanel.jsx` | Done |
| 15 | Attendance board and corrections inbox | `pages/AttendanceBoard.jsx` | Done |
| 16 | Correction request and decision | `components/attendance/CorrectionRequestModal.jsx`, `CorrectionDecisionModal.jsx` | Done |
| 17 | My attendance calendar, month summary and own check-in | `pages/MyAttendance.jsx`, `components/attendance/AttendanceCalendar.jsx` | Done |
| 18 | Leave balance, live preview, application and an AI draft from plain words | `pages/MyLeave.jsx`, `components/leave/LeaveRequestForm.jsx`, `SmartLeaveBox.jsx` | Done |
| 19 | Leave approvals with comments and notifications | `pages/LeaveRequests.jsx`, `components/leave/LeaveDecisionModal.jsx` | Done |
| 20 | Payroll draft creation and recalculation | `pages/Payroll.jsx` | Done |
| 21 | Payroll finalization that locks the month | `pages/PayrollRun.jsx` | Done |
| 22 | Payslips with the full breakdown and a PDF | `pages/MyPayslips.jsx`, `components/payroll/PayslipDrawer.jsx` | Done |
| 23 | Admin dashboard: headcount, attrition, payroll cost, salaries, gender, tenure, audit feed | `components/dashboard/AdminDashboard.jsx` | Done |
| 24 | HR dashboard: today, pending approvals, trend, absenteeism, leave, late-comers, own check-in | `components/dashboard/HrDashboard.jsx` | Done |
| 25 | Employee dashboard: my day, hours against target, late count, balances, last payslip, announcements | `components/dashboard/MyDay.jsx` | Done |

Also built: the assistant panel on every page with role-scoped tools and Roman Urdu, the dashboard summary card with a rule-based fallback, announcements, the notification bell, the audit log screen, AI key management with rotation, and the read-only payslip PDF.

## Bonus items

| Item | State |
| --- | --- |
| AI assistant with real tool calling over the company data, restricted by role | Done |
| Several AI keys with rotation, cooldown, encryption and a usage log | Done |
| Dashboard summary generated by the model, with a deterministic fallback | Done |
| Smart leave in plain English or Roman Urdu | Done |
| Payslip PDF streamed with the same role and scope checks as the JSON | Done |
| CSV import with a dry run and a per-row error report | Done |
| Append-only audit log that rejects updates and deletes | Done |
| Geofenced camera check-in (`source: "camera"` with face count, accuracy and radius) | API only, no camera capture UI |
| Email delivery | Through Resend when `RESEND_API_KEY` is set, otherwise the reset code is printed in development |

## Known limitations and design decisions

- **One company, one timezone.** `settings.timezone` is the company calendar; the server itself runs in UTC and never derives a business date from a local `Date` getter.
- **Check-in is allowed on weekends and holidays.** The record is stored but off days are left out of every rate and out of payroll, so a demo on a Saturday still works.
- **HR cannot decide its own requests and cannot change its own salary.** The admin decides requests and salaries that belong to HR employees, so nobody is blocked.
- **No photo is stored.** The camera path sends a face count and an accuracy, not an image.
- **Payslip snapshot.** A payslip keeps a copy of the numbers and of the employee name, code, department and designation, so later edits never change history.
- **Payroll runs show the finalized date but not who finalized it.** The server stores the user id and does not populate the name.
- **Leave filters use the employee id.** The server filters by `employeeId`, so the screen offers a select of people instead of a name search.
- **Attendance board summary reads the first 100 employees.** The table pages at 10; the summary strip is capped at 100.
- **Employees see times in the device timezone.** `GET /settings` is limited to admin and HR, so the personal screens fall back to the browser zone.
- **`POST /ai/smart-leave` takes `message`** (the server also accepts `text`), and `POST /ai/chat` accepts `conversationId`.
- **The database reset refuses an unknown name**, so a typo cannot drop the wrong database.
- **`client/vercel.json` points at the boilerplate Railway URL** until you set your own.

## Judge quick start

1. Open the live link.
2. Complete the first-run setup (company name, admin name, email, password).
3. Open **Organization** and add a department, a designation and (optionally) a holiday.
4. Open **Users** and create an HR login; copy the temporary password.
5. Sign in as HR (change the password), then register two or three employees.
6. Sign in as one employee, check in, request leave; sign back in as HR to approve it.
7. Create the payroll draft for this month as HR, finalize it as the admin, then download the payslip as the employee.
8. Ask the assistant "How many active employees do we have?" and "Who is on leave today?"; both answers come from the same services the dashboard uses.
