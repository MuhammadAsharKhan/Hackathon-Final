# Frontend: people, attendance and leave

The screens for prompt 06. Everything lives in `client/`; the API contract was read from
`server/src/routes` and `server/src/controllers`, not guessed.

## Screens

| Route | File | Who can open it |
| --- | --- | --- |
| `/employees` | `pages/Employees.jsx` | Admin, HR |
| `/employees/:id` | `pages/EmployeeDetail.jsx` | Every signed-in role, so the server can answer 403 for someone else's record |
| `/me/attendance` | `pages/MyAttendance.jsx` | HR, Employee |
| `/attendance` | `pages/AttendanceBoard.jsx` | Admin, HR |
| `/me/leave` | `pages/MyLeave.jsx` | HR, Employee |
| `/leave/requests` | `pages/LeaveRequests.jsx` | Admin, HR |

`App.jsx` keeps the existing guards. `/employees/:id` sits outside the admin and HR group on
purpose: an employee who opens another employee's URL gets the server message
"You can only view your own record" instead of a silent redirect.

## API clients

| File | Routes |
| --- | --- |
| `api/employees.api.js` | list, get, 360, register, update, salary, import, export, template |
| `api/attendance.api.js` | today, check-in, check-out, my month, employee month, board, corrections, decision |
| `api/leave.api.js` | balance, preview, apply, list, cancel, decision |
| `api/payslips.api.js` | one payslip PDF as a blob |
| `api/ai.api.js` | `smartLeave` added next to the admin key calls |

Every function returns unwrapped `data`. CSV and PDF downloads use `responseType: "blob"` and
carry the filename from `Content-Disposition`. Server messages, including 409 and 422 text,
reach the user through `getErrorMessage` in a toast or the dialog error line.

## Components

`components/employees/`

- `EmployeeFormModal` - one modal for register and edit. Register needs name, email,
  department, designation (filtered by department), join date, basic salary with a live gross
  preview at 40% house rent and 10% medical, gender, phone, address and date of birth. Edit
  adds the exit date.
- `ImportCsvModal` - template download, file pick, "Check file" dry run, an error list of row,
  field and reason, "Import" enabled only with zero errors, then the created logins with copy
  buttons and a CSV of the passwords.
- `SalaryModal` - basic, house rent and medical percent with the gross it produces.
- `EmployeeProfileTab`, `EmployeeAttendanceTab`, `EmployeeLeaveTab`, `EmployeePayrollTab` -
  the four tabs of the 360 page. Salary is visible to Admin and HR, editable by HR only.

`components/attendance/`

- `CheckInPanel` - today's status, both buttons with the right disabled states, times in the
  company timezone and hours so far. A 409 or 422 lands in a toast and the panel reloads.
- `AttendanceCalendar` - seven columns starting Monday, one cell per day, coloured through
  `statusTone` from `StatusBadge`, a legend, a muted off day and an empty future day. A
  correctable past day is a button that opens the correction modal.
- `CorrectionRequestModal` - fixed date, check-in and check-out times prefilled from the record,
  reason with the server's five character rule.
- `CorrectionDecisionModal` - the stored and requested times side by side, comment required to
  reject.
- `AttendanceSummary` - the card strip used by my attendance and the 360 attendance tab.

`components/leave/`

- `LeaveBalanceCards` - quota, approved, pending and remaining, with "Unlimited" for a null quota.
- `SmartLeaveBox` - plain words in, `POST /ai/smart-leave` out. A suggestion fills the form and
  shows the "AI-generated, check the dates" note; a fallback shows "Could not understand, please
  fill the form". It never submits.
- `LeaveRequestForm` - type, dates, reason and a debounced preview line from
  `POST /leave/preview` that states the working days and the balance left, or the exact problem.
  Apply stays disabled while the preview is invalid.
- `LeaveDecisionModal` - approve or reject with a comment, required for reject.

`hooks/useHrEmployeeIds.js` reads the HR accounts once so the admin knows which rows it may
decide, because the leave and correction lists do not carry the requester's role. While that
read is in flight the decision cell stays empty rather than showing the wrong explanation.

## Helpers

- `lib/time.js` - `formatClock` (an instant in a given zone, a plain `HH:mm` passed through),
  `formatHours`, `percentLabel`, `monthLabel`, `deviceToday`, `deviceMonth`, `weekdayLabel`,
  `dayOfMonth`, `leadingBlanks`.
- `lib/download.js` - `saveBlob`, `saveCsv`, `filenameFromDisposition`.
- `lib/format.js` - `formatDateRange` and `formatMoney` added.
- `context/CompanyTimeContext.jsx` - the company timezone, read from `GET /settings` for Admin
  and HR. Employees cannot read settings, so their clock falls back to the device zone.

## Additive changes to the prompt 05 files

- `components/data/DataTable` gained `onRowClick`; the employees table uses it and keeps the name
  as a link so the keyboard path works too.
- `components/ui/StatusBadge` gained a `correction` kind (pending, approved, rejected).
- `components/layout/AppShell` wraps its tree in `CompanyTimeProvider`.
- `config/menus` gained a prefix title so the top bar reads "Employee" on `/employees/:id`.
- `lib/format` gained `formatMoney` and `formatDateRange`.

## Rules kept from the theme

Pages compose components. No raw `table`, `dialog` or `select` markup in a page. Status chips
come from `StatusBadge`, money through `formatMoney`, and money is rounded once on the server.
Loading, empty and error states exist on every data view, forms disable while submitting, and
every request that can fail shows the server message.

## Known issues

- `POST /ai/smart-leave` accepts `{ message }` on the server while the spec writes `{ text }`.
  The client sends `message`.
- `GET /leave/requests` filters by `employeeId`, not by name, so the employee filter is a select
  of people rather than a text search.
- The attendance board reads up to 100 employees for the summary strip and 10 per page for the
  table, so on a company larger than 100 people the strip counts the first hundred.
- Times inside an employee's own screens fall back to the device timezone because
  `GET /settings` is limited to Admin and HR.
