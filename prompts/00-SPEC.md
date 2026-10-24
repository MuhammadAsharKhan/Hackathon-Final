# HCM Lite specification (single source of truth)

Every prompt in prompts/hcm/ starts by reading this file. If code, docs or another prompt disagree with it, this file wins.

## 0. Agent rules (apply to every task)
- Decide and build. Never ask me questions. If something is unspecified, pick the simplest option that satisfies the brief and list it under "Deviations" in your final report.
- A failing check is fixed and re-run, at most 3 attempts per problem. If it still fails, list it under "Known issues" and continue.
- Keep boilerplate conventions: ES modules, Express 4, Mongoose 8, React 18, Tailwind 3, zod validation, asyncHandler, ApiError, central error handler. Response format: { success:true, data } and { success:false, message, errors?, code? }.
- CODE STYLE: plain English names, one job per function (under 30 lines), early returns, no clever one-liners. Business rules live in server/src/services/ (controllers read input, call a service, send output). Comments only above long functions or on the main data flow, max two lines, human wording. No emoji anywhere.
- No new dependency unless the task lists it.
- Never print or commit secrets. Local runs use database name hcm_dev. Automated checks use database name hcm_test (replace the database name in MONGODB_URI) and drop it at the end. Temporary scripts live in .tmp/ and are deleted afterwards. Unit tests written with node:test are kept (npm test in server/).
- Final message of every task is a report: files built, checks run with results, Known issues, Deviations.

## 1. Time and money rules (most common source of bugs)
- Company timezone: settings.timezone, default "Asia/Karachi". The server runs in UTC, so NEVER use local Date getters for business logic.
- Business dates are strings "YYYY-MM-DD" in company timezone. Months are "YYYY-MM". Instants (checkIn, checkOut, createdAt) are Date objects. String comparison works for ISO dates.
- server/src/utils/dates.js must export: todayIn(tz, now), localDateOf(instant, tz), localMinutesOfDay(instant, tz), zonedToUtc(dateStr, "HH:mm", tz), addDays(dateStr, n), eachDay(from, to), weekdayOf(dateStr) (0=Sunday), isWorkingDay(dateStr, settings, holidaySet), listWorkingDays(from, to, settings, holidaySet), countWorkingDays(...), monthBounds("YYYY-MM") -> { start, end }. Use Intl.DateTimeFormat with timeZone. Never parse "YYYY-MM-DD" with new Date() for arithmetic (use Date.UTC).
- server/src/utils/clock.js exports now() so tests can inject time. Services take an optional `now` argument.
- Money: PKR numbers, round2(x) = Math.round((x + Number.EPSILON) * 100) / 100. Round only at the end of each computed amount.
- Pagination: query page (default 1), limit (default 10, max 100). Response data has pagination { page, limit, total, pages }.
- Status codes: 400 validation, 401 not signed in, 403 role or data-scope violation, 404 not found, 409 conflict (duplicate, locked), 422 business rule broken.

## 2. Roles and scope
- Roles: admin, hr, employee. Every route declares restrictTo(...). Employee scope: only rows with their own employeeId. Violations return 403. The AI assistant uses the same scope (see section 8).
- Admin has no employee record. HR and Employee users each have an Employee record (user.employeeId). Admin creates HR logins together with the HR's employee record.
- Extra rules so nobody is blocked: HR cannot approve or reject their own leave or attendance correction and cannot change their own salary (403). Admin may decide leave requests and corrections that belong to HR-role employees, and may set the salary of HR-role employees. Everything else about Admin is view-only as in the brief.
- A user with mustChangePassword = true can only call POST /auth/change-password, GET /auth/me, POST /auth/logout and POST /auth/refresh. Every other route answers 403 with code PASSWORD_CHANGE_REQUIRED (enforced in the protect middleware).
- Inactive users cannot log in or refresh (401).

## 3. Data model
Indexes noted in brackets. All collections have timestamps.
- Settings (single document): companyName, timezone, officeStart "09:00", graceMinutes 15, halfDayHours 5, weekendDays [0,6], officeLat null, officeLng null, radiusMeters 150, weeklyHours 40, setupComplete (boolean).
- Department { name [unique, case-insensitive], description, isActive }.
- Designation { name [unique], departmentId (optional) }.
- LeaveType { code [unique, lowercase slug], name, yearlyQuota (number or null for unlimited), isPaid (boolean) }. Setup seeds: annual 14 paid, sick 8 paid, casual 10 paid, unpaid null unpaid.
- Holiday { date [unique], name }.
- User { name, email [unique, lowercase], passwordHash, role, employeeId, isActive, mustChangePassword, lastLoginAt } plus the existing refresh token fields.
- Employee { code [unique], name, email [unique, lowercase], phone, address, gender (male|female|other), dateOfBirth, departmentId, designationId, joinDate, exitDate (null), status (probation|active|exited), basicSalary, hraPercent 40, medicalPercent 10, userId }.
- Attendance { employeeId, date, checkIn, checkOut, source (web|camera|correction), status (present|late|half_day), workedMinutes, location { lat, lng, accuracy, distanceMeters }, faceCount } [unique employeeId+date]. Status is stored when the record is written, so later settings changes do not rewrite history.
- AttendanceCorrection { employeeId, date, requestedCheckIn "HH:mm"|null, requestedCheckOut "HH:mm"|null, reason, status (pending|approved|rejected), decidedBy (userId), decisionComment, decidedAt }.
- LeaveRequest { employeeId, leaveTypeCode, startDate, endDate, days, reason, status (pending|approved|rejected|cancelled), decidedBy, decisionComment, decidedAt } [employeeId+startDate].
- PayrollRun { month [unique], status (draft|finalized), createdBy, finalizedBy, finalizedAt, totals { employees, gross, deductions, tax, net } }.
- Payslip { runId, employeeId, month [unique employeeId+month], snapshot { employeeCode, employeeName, department, designation }, basic, hra, medical, gross, workingDays, eligibleDays, perDay, earnedGross, absentDays, unpaidDays, halfDays, absentDeduction, unpaidDeduction, halfDayDeduction, attendanceDeduction, annualTax, tax, netPay }.
- Announcement { title, body, authorId, authorName, authorRole }.
- Notification { userId, type, title, message, link, readAt } [userId+readAt].
- AuditLog { actorId, actorName, actorRole, action, entity, entityId, before, after, createdAt } append-only: the model throws on any update or delete operation and no route updates or deletes it. Never store passwords, hashes or tokens in before/after (strip those keys).
- AiLog { userId, role, kind (chat|summary|smart_leave), message, toolsUsed[], status (ok|error|timeout), latencyMs, error }.
- Conversation (existing model, reused by the assistant chat). Existing AiKey and AiSettings (key rotation) stay as they are.

## 4. Business rules
### 4.1 Day status derivation (pure function buildEmployeeDays in services/attendanceCalc.js)
For one employee and a date range it returns an entry per day { date, status, record, isWorkingDay }:
1. date before joinDate or after exitDate -> not_employed (excluded everywhere).
2. date after today -> future (excluded everywhere).
3. weekend or holiday -> off (a record on that day is still returned; it is excluded from all rates and payroll).
4. approved leave covers the date -> on_leave.
5. record exists: no checkOut and date before today -> missing_checkout; otherwise record.status (present, late or half_day; today without checkOut shows its stored present or late).
6. no record -> absent.
isLate is decided at check-in: local minutes of day > officeStart + graceMinutes (09:15 exactly is NOT late). half_day is decided at check-out: workedMinutes < halfDayHours x 60 (overrides late).
"Expected days" = entries with status present, late, half_day, absent, missing_checkout, on_leave.

### 4.2 Check-in and check-out
- Server stamps the time. Check-in on a day that has a record -> 409. Check-in when approved leave covers today -> 422. Check-out without check-in -> 422. Second check-out -> 409.
- Check-in is NOT blocked on weekends or holidays (judging may happen on a Saturday). Such records show as off-day work and are ignored by rates and payroll.
- Optional body { lat, lng, accuracy, faceCount, source }. When lat/lng are sent and the office location is set, store distanceMeters (Haversine). source "camera" is accepted only when faceCount equals 1, accuracy is 100 m or better, the office location is set and distance is within radiusMeters; otherwise 422 with a clear reason. source "web" never rejects on location.

### 4.3 Corrections
- Employee requests for a past or current date with at least one time and a reason (reason required, 5+ chars). One pending request per date.
- Approval writes the record: times are converted with zonedToUtc, source "correction", workedMinutes and status recomputed with current settings. If no record exists, both times are required. Rejection needs a comment.

### 4.4 Leave
- days = working days between startDate and endDate inclusive (weekends and holidays skipped). 0 working days -> 422. Start and end must be in the same calendar year, end not before start.
- Overlap with the employee's own pending or approved request -> 422. For types with a quota: used (approved + pending days of that type in that year) + requested > quota -> 422 "Only N day(s) left for <type>". Unlimited types never fail on balance.
- Balance per type: { quota, used (approved), pending, remaining }.
- Cancel: owner only, pending, or approved with startDate after today. Otherwise 422.
- Decision: comment required for reject, optional for approve. Approval re-checks overlap and balance (excluding itself). Notifications to the employee.
- POST /leave/preview returns { valid, days, reason, remaining } for the form without saving.

### 4.5 Payroll (functions in services/payrollCalc.js, pure and unit tested)
- gross = basic x (1 + hraPercent/100 + medicalPercent/100) (default 1.5 x basic).
- workingDays = working days in the month (company calendar). eligibleDays = working days in [max(joinDate, monthStart), min(exitDate or monthEnd, monthEnd)]. perDay = gross / workingDays.
- earnedGross = round2(gross x eligibleDays / workingDays).
- Within the eligible window and up to today only: absentDays (status absent), unpaidDays (approved leave of types with isPaid false, working days only), halfDays (status half_day). attendanceDeduction = round2(perDay x (absentDays + unpaidDays + 0.5 x halfDays)). Late and missing_checkout have no deduction.
- annualTax(g) on g = gross x 12: g <= 600000 -> 0; <= 1200000 -> 0.05 x (g - 600000); <= 2400000 -> 30000 + 0.15 x (g - 1200000); <= 3600000 -> 210000 + 0.25 x (g - 2400000); above -> 510000 + 0.35 x (g - 3600000). Monthly tax = round2(annualTax / 12 x eligibleDays / workingDays).
- netPay = max(0, round2(earnedGross - attendanceDeduction - tax)).
- Worked example for tests: basic 100000, 22 working days, 1 absent, 1 unpaid, 2 half days, full month -> gross 150000, perDay 6818.18, attendanceDeduction 20454.55, annualTax 120000, tax 10000, netPay 119545.45.
- Run rules: POST /payroll/runs { month } by HR creates the draft, or recalculates it if a draft exists; finalized month -> 409. Future month -> 422. Includes employees with eligibleDays > 0 and basicSalary > 0. Admin finalizes (locks): afterwards recalculation, edits or a second finalize -> 409. Payslips store a full snapshot, so later salary or employee edits never change them. Employees see only payslips of finalized runs.

### 4.6 Metrics (all computed on the server with the same services used by dashboards and the AI tools)
- headcountAt(date) = employees with joinDate <= date and (exitDate null or exitDate > date). Headcount = headcountAt(end of range or today).
- Attrition % = exits in period / ((headcountAt(from) + headcountAt(to)) / 2) x 100 (0 if the average is 0). Admin dashboard uses year-to-date.
- Attendance rate = (present + late + missing_checkout + 0.5 x half_day) / (entries with status present, late, half_day, absent, missing_checkout). On-leave days are excluded.
- Late % = late / (present + late). Absenteeism = absent / expected days, per department.
- Leave utilization = approved days starting in the range / (yearlyQuota x department headcount), per type and department (unlimited types show null).
- Payroll cost = sum of earnedGross and netPay of FINALIZED runs by month and department. Average salary = mean gross by department and by designation over active and probation employees.
- Filters on every dashboard endpoint: from, to (default first day of the current month to today), department (optional id).

### 4.7 Notifications (created by the service that performs the action)
Leave submitted (to every HR user, and to Admin when the requester is HR), leave decided (to the employee), correction submitted (to HR) and decided (to the employee), payroll finalized (to every employee with a payslip: "Your payslip for <month> is ready"), announcement posted (to every active user except the author), account created (to the new user: welcome).

### 4.8 Audit actions (write with auditService.log(actor, action, entity, entityId, before, after))
setup.complete, settings.update, department.create/update/delete, designation.create/update/delete, leaveType.create/update/delete, holiday.create/delete, user.createHr, user.activate, user.deactivate, user.resetPassword, employee.register, employee.update, employee.salaryUpdate, employee.import, attendance.correctionDecision, leave.decision, leave.cancel, payroll.create, payroll.recalculate, payroll.finalize, announcement.create, announcement.delete.

## 5. API contract (prefix /api). Roles: A admin, H hr, E employee, * any signed-in user
Public
- GET /health
- GET /setup/status -> { setupComplete }
- POST /setup { companyName, adminName, adminEmail, adminPassword } -> session like login. 409 once setup is complete (atomic). The server also reads ADMIN_EMAIL, ADMIN_PASSWORD and COMPANY_NAME from env at start and creates the Admin and settings when no admin exists.
- POST /auth/login, /auth/refresh, /auth/logout; POST /auth/forgot-password, /auth/verify-otp, /auth/reset-password (existing, unchanged).
Any user
- GET /auth/me -> { user, employee (id, code, name, department, designation, status), mustChangePassword }
- POST /auth/change-password { currentPassword, newPassword } (clears mustChangePassword, new session)
- PATCH /me/profile { phone, address } (H, E)
- GET /notifications?unread=true&page, GET /notifications/unread-count, PATCH /notifications/:id/read, POST /notifications/read-all
- GET /announcements?page ; POST /announcements { title, body } (A, H) ; DELETE /announcements/:id (A, or the author)
- GET /departments, /designations, /leave-types, /holidays (any signed-in user)
Setup data (write = A)
- GET /settings (A, H) ; PATCH /settings (A)
- POST/PATCH/DELETE /departments(/:id), /designations(/:id), /leave-types(/:id), /holidays(/:id) (A). Delete of something in use -> 409.
Users (A)
- POST /users/hr { name, email, departmentId, designationId, joinDate, basicSalary, gender, phone } -> { user, employee, temporaryPassword }
- GET /users?role&search&page ; PATCH /users/:id/active { isActive } ; POST /users/:id/reset-password -> { temporaryPassword } (any non-admin user)
Employees
- POST /employees (H) -> { employee, temporaryPassword }
- GET /employees?search&departmentId&designationId&status&page&limit (A, H)
- GET /employees/:id (A, H any; E own)
- GET /employees/:id/360?month=YYYY-MM -> { profile, attendance: { summary, days }, leaveBalances, recentLeaves, payslips } (A, H any; E own; salary fields only for A, H and the owner)
- PATCH /employees/:id (H) details and exit (setting exitDate sets status exited and deactivates the login)
- PATCH /employees/:id/salary { basicSalary, hraPercent, medicalPercent } (H; A for hr-role employees)
- POST /employees/import?dryRun=true|false (H, multipart field "file") -> dry run: { totalRows, validRows, errors:[{ row, field, reason }] }. Real import refuses with 422 and the same report when any row has an error; otherwise creates employees and logins and returns { created:[{ code, name, email, temporaryPassword }] }.
- GET /employees/export (H) -> text/csv ; GET /employees/import/template (H) -> text/csv header row
- CSV columns: code,name,email,phone,address,gender,dateOfBirth,department,designation,joinDate,status,basicSalary. Required: code, name, email, department (existing name), joinDate (ISO), basicSalary > 0. Checks: unique code and email (in file and database), valid email, ISO date, known department and designation names, status value.
Attendance
- GET /attendance/today (H, E) -> { record, status, canCheckIn, canCheckOut }
- POST /attendance/check-in, POST /attendance/check-out (H, E)
- GET /attendance/me?month (H, E) -> { days, summary }
- GET /attendance/board?date&departmentId&search&status&page (A, H) -> one row per active employee with derived status
- GET /attendance/employee/:employeeId?month (A, H)
- POST /attendance/corrections { date, requestedCheckIn, requestedCheckOut, reason } (H, E)
- GET /attendance/corrections?status&page (E own; H all except decisions on own; A all)
- PATCH /attendance/corrections/:id { decision, comment } (H; A for hr-role employees)
Leave
- GET /leave/balance?year (H, E) ; POST /leave/preview ; POST /leave/requests { leaveTypeCode, startDate, endDate, reason } (H, E)
- GET /leave/requests?status&employeeId&from&to&page (E own; H, A all)
- PATCH /leave/requests/:id/cancel (owner) ; PATCH /leave/requests/:id/decision { decision, comment } (H; A for hr-role employees)
Payroll
- POST /payroll/runs { month } (H) ; GET /payroll/runs (A, H) ; GET /payroll/runs/:id (A, H) with payslips ; POST /payroll/runs/:id/finalize (A)
- GET /payroll/payslips/me (H, E; finalized only) ; GET /payroll/payslips/:id (A, H any; E own finalized) ; GET /payroll/payslips/:id/pdf (same scope, application/pdf)
Dashboards (from, to, departmentId)
- GET /dashboard/admin (A) ; GET /dashboard/hr (H, A) ; GET /dashboard/me (H, E)
- admin: headcount, attritionYtd, payrollCost { byMonth, byDepartment }, averageSalary { byDepartment, byDesignation }, headcountByDepartment, gender, tenure, auditFeed (latest 10).
- hr: headcount, presentToday, onLeaveToday, lateToday, pendingApprovals { leave, corrections }, attendanceTrend [{ date, rate }], absenteeismByDepartment, leaveByType, topLateComers (5), leaveUtilization.
- me: today status, hoursThisWeek and weeklyHours, lateCount (month), leaveBalances, lastPayslip, announcements (latest 5).
Audit (A): GET /audit?actor&action&entity&from&to&page
AI
- POST /ai/chat { message, conversationId } -> { reply, conversationId, toolsUsed, aiGenerated: true } (all roles)
- GET /ai/conversations/:id (own)
- POST /ai/dashboard-summary { from, to, departmentId } (A, H) -> { bullets (3 to 5), aiGenerated, fallback }
- POST /ai/smart-leave { text } (H, E) -> { type, startDate, endDate, reason, days, aiGenerated } or { fallback: true }
- /admin/ai/* key and settings routes stay as in the boilerplate (A).
Removed from the boilerplate: public register, email verification at sign-up, Google, Facebook, avatar upload, find user by uid, items.

## 6. Permissions in one line each
Admin: company setup, HR logins, resets, finalize payroll, audit, view everything, announcements. HR: employees, salary, attendance board and corrections, leave decisions, payroll drafts, HR dashboard, announcements, own self-service. Employee: own check-in/out, calendar, corrections, leave, payslips, profile phone/address, personal dashboard, read announcements. Nobody can edit finalized payroll or audit entries.

## 7. Frontend routes and menus
- Public: /setup (only while setup is incomplete; /login redirects to it), /login. Forced /change-password when mustChangePassword.
- Admin menu: Dashboard (/dashboard), Organization (/admin/organization, tabs Company, Departments, Designations, Leave types, Holidays), Users (/admin/users), Employees (/employees), Attendance (/attendance), Leave (/leave/requests), Payroll (/payroll), Announcements, Audit log (/admin/audit), AI keys (/admin/ai).
- HR menu: Dashboard, Employees, Attendance (board, corrections), Leave requests, Payroll, Announcements, then "My space": My attendance (/me/attendance), My leave (/me/leave), My payslips (/me/payslips), My profile (/me/profile).
- Employee menu: Dashboard, My attendance, My leave, My payslips, My profile, Announcements.
- Everywhere: notification bell with unread count (poll every 30 s), assistant panel (floating button, drawer), user menu with change password and sign out.
- UI quality bar: loading, empty and error state on every data view, responsive from 375 px, forms disable while submitting, no raw error objects shown to users, toasts for results, "AI-generated" label on assistant output.

## 8. AI assistant rules
- Provider calls only on the server through the existing key pool (rotation). AI_API_KEY and AI_PROVIDER (gemini|groq|xai) env variables seed a first key when the database has none.
- Tool access by role. Admin and HR: get_headcount, get_attendance_summary, get_late_comers, get_leave_summary, get_payroll_summary, search_employees. Admin, HR and Employee own-data tools: get_my_leave_balance, get_my_attendance_summary, get_my_last_payslip. Employees get ONLY the own-data tools. No tool ever returns another person's salary; search_employees returns name, code, department, designation, status only.
- Tools call the same services as the dashboards, so numbers always match.
- 15 second total timeout per request, at most 4 model calls per request, 20 AI requests per user per hour (all AI routes together), every call logged in AiLog. The AI never writes data.
- Model understands and answers in English or Roman Urdu (same language as the user).
- Policy Q&A: policy text is generated from current settings and leave types plus the fixed rules in section 4 and is included in the system prompt. The model answers policy questions only from it or says it does not know.
