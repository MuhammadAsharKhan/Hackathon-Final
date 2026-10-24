# Frontend: payroll, dashboards and the assistant

The screens for prompt 07. Everything lives in `client/`; the API contract was read from
`server/src/routes` and `server/src/controllers`, not guessed.

## Screens

| Route | File | Who can open it |
| --- | --- | --- |
| `/payroll` | `pages/Payroll.jsx` | Admin, HR |
| `/payroll/:id` | `pages/PayrollRun.jsx` | Admin, HR |
| `/me/payslips` | `pages/MyPayslips.jsx` | HR, Employee |
| `/dashboard` | `pages/Dashboard.jsx` | Every role, one view each |

`/payroll` keeps the month in state with a native month picker capped at the current month. The
button says "Create or recalculate draft", because the same endpoint does both; the server message
on a finalized month reaches the user as a toast, and the list reloads.

`/payroll/:id` shows five totals, the payslip table and the state banners: HR sees "Draft, not
visible to employees" with a Recalculate action, everyone sees the "Finalized" banner once the
month is locked, and both edit and recalculate disappear at that point. Admin sees Finalize behind a
`ConfirmDialog` that explains the lock. A row opens `PayslipDrawer` with days, earnings, deductions,
the formula lines in plain words, net pay and the PDF button.

## Dashboards

`pages/Dashboard.jsx` picks the body by role and owns the filters: a period select (this month,
last 7 days, this year, or a custom range from the two date inputs) and a department select. The
range is computed in the company timezone from `CompanyTimeContext`, so a user east of UTC does not
see yesterday.

- `components/dashboard/AdminDashboard.jsx` - headcount, attrition year to date, payroll cost for
  the month and for every finalized run in view, average salary, headcount and payroll cost by
  department, payroll cost by month, gender split, tenure buckets, average salary tables and the
  last ten audit entries.
- `components/dashboard/HrDashboard.jsx` - headcount, present, on leave and late today, pending
  approvals with links to both inboxes, attendance trend, absenteeism by department, leave by type,
  top late-comers, leave utilization and a CheckInPanel for HR's own day.
- `components/dashboard/MyDay.jsx` - check-in panel, hours this week against the weekly target as a
  progress bar, late count for the month, leave balance cards, the last payslip with download, the
  latest announcements and the "Ask my assistant" button. HR gets the same block as a "My day"
  section under the HR dashboard.
- `components/dashboard/SummaryCard.jsx` - posts the current filters to `/ai/dashboard-summary`,
  shows three to five bullets with an "AI-generated" badge, a note when the model fell back to the
  rule-based bullets, a skeleton while loading and the server message on failure. The result is
  dropped as soon as the filters change, so the page never shows numbers for another range.

Charts come from `components/charts/ChartBoxes.jsx`: a recharts responsive container inside
`ChartCard`, axis and grid colours read from the CSS tokens through `lib/chart.js`, a tooltip in the
same tokens, and a visually hidden sentence with the same numbers for screen readers.

## Assistant

`components/ai/AssistantProvider.jsx` sits once in `AppShell`. It renders the floating button
(bottom right, above the safe area, on every page) and lazy loads the panel the first time it opens.

`hooks/useAssistant.js` holds the thread, the conversation id and the pending state, keeps both in
`sessionStorage`, sends through `api/ai.api.js` and maps 429 and 503 to their own sentences. A
failed answer leaves a retry row instead of a dead thread.

`components/ai/AssistantPanel.jsx` is a right drawer that is full screen under `md`: an
"AI-generated" chip, a "New chat" button, the message list, suggested prompts by role, a caption
with the tools the answer used ("Used: get leave summary"), a typing indicator, and a composer with
Enter to send, Shift and Enter for a new line, a 1000 character limit with a counter, and disabled
state while waiting. `MessageBubble` renders assistant text with `react-markdown` and `remark-gfm`,
never raw HTML, tables scroll inside their card, and code goes through `CodeBlock`.

The panel, the markdown renderer and recharts are the three heavy pieces, so both the dashboards and
the panel are split into their own chunks; the build has no size warning.

## Formatting and accessibility

- `lib/format.js` is the only place that formats money and instants. `formatMoney` writes the `PKR`
  prefix, groups thousands and is used with `tabular-nums` in every table.
- `formatTime` and `formatDateTimeIn` print instants in the company timezone; `formatDate` keeps
  business dates as plain calendar days.
- `Modal` gained `variant="drawer"` for the payslip and the assistant. The focus trap, scroll lock,
  Escape handling and the mobile sheet behaviour are the same code as before.
- Every chart has a text summary, every list has loading, empty and error states, and every page
  fits 375 px: the tables scroll inside their card and the grid children carry `min-w-0` so a table
  cannot widen the page.

## Known issues

- Payroll runs show the finalized date but not who finalized it. The server stores the user id and
  does not populate a name, and prompt 07 allowed client and docs changes only.
- The HR dashboard shows a CheckInPanel and the "My day" section above shows another one; the first
  is the compact view the prompt asks for, the second is the full employee dashboard.
- Attendance trends with very few worked days read as 0% or 1%, because the rate is a real ratio over
  expected days rather than a rounded decorative number.
