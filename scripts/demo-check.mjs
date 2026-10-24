// The official five minute demo, played against a running server. It refuses
// to touch an app that already has a setup, because the hosted copy must stay
// empty for the judges. Plain fetch, no dependencies.
const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const PASSWORD = "DemoPass123!";
const COMPANY = "Northwind Traders";
const EMAIL = {
  admin: "admin@demo.local",
  hr: "hr@demo.local",
  ali: "ali@demo.local",
  sara: "sara@demo.local",
  bilal: "bilal@demo.local",
};
const SALARY = { ali: 180000, sara: 150000, bilal: 120000 };
const GROSS_FACTOR = 1.5;

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

const pass = (label, detail = "") => {
  passed += 1;
  console.log(`PASS  ${label}${detail ? ` - ${detail}` : ""}`);
};

const fail = (label, detail = "") => {
  failed += 1;
  failures.push(`${label}: ${detail}`);
  console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ""}`);
};

const skip = (label, detail = "") => {
  skipped += 1;
  console.log(`SKIPPED  ${label}${detail ? ` - ${detail}` : ""}`);
};

const check = (label, condition, detail = "") => {
  if (condition) pass(label, detail);
  else fail(label, detail);
  return Boolean(condition);
};

const api = async (method, path, { token, body, raw = false } = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const head = String.fromCharCode(...bytes.slice(0, 4));
    return { status: response.status, head, size: bytes.length };
  }

  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    data: payload.data,
    message: payload.message,
    code: payload.code,
    errors: payload.errors,
  };
};

const ok = (result) => result.status >= 200 && result.status < 300;

const isoDay = (date) => date.toISOString().slice(0, 10);

const zoneToday = (timeZone) =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());

const addDays = (dateString, days) =>
  isoDay(new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000));

const weekdayOf = (dateString) =>
  new Date(`${dateString}T00:00:00Z`).getUTCDay();

const isWeekend = (dateString) => [0, 6].includes(weekdayOf(dateString));

const nextWeekday = (dateString) => {
  let cursor = dateString;
  while (isWeekend(cursor)) cursor = addDays(cursor, 1);
  return cursor;
};

const nextMonday = (from) => {
  let cursor = addDays(from, 1);
  while (weekdayOf(cursor) !== 1) cursor = addDays(cursor, 1);
  return cursor;
};

const login = async (email, password) => {
  const result = await api("POST", "/auth/login", { body: { email, password } });
  if (!ok(result)) {
    throw new Error(`login for ${email} answered ${result.status}`);
  }
  return result.data;
};

const changePassword = async (session, currentPassword) => {
  const result = await api("POST", "/auth/change-password", {
    token: session.accessToken,
    body: { currentPassword, newPassword: PASSWORD },
  });
  if (!ok(result)) {
    throw new Error(`change password answered ${result.status}`);
  }
  return result.data.accessToken;
};

const ask = async (token, message) => {
  const result = await api("POST", "/ai/chat", { token, body: { message } });
  return {
    status: result.status,
    reply: result.data?.reply?.content || "",
    tools: result.data?.toolsUsed || [],
    message: result.message,
    code: result.code,
  };
};

const digitsOf = (text) =>
  (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((value) =>
    Number(value.replace(/,/g, ""))
  );

const main = async () => {
  const status = await api("GET", "/setup/status");

  if (!ok(status)) {
    console.log(`The server did not answer on ${BASE_URL} (status ${status.status}).`);
    process.exit(1);
  }

  if (status.data?.setupComplete) {
    console.log(
      "Setup is already complete on this server, so the demo will not run."
    );
    console.log("The hosted app must stay empty for the judges. Use a fresh database.");
    process.exit(1);
  }

  console.log(`Demo check against ${BASE_URL}\n`);

  // Step 1: first run setup, company rules and the first HR login.
  const setup = await api("POST", "/setup", {
    body: {
      companyName: COMPANY,
      adminName: "Sana Admin",
      adminEmail: EMAIL.admin,
      adminPassword: PASSWORD,
    },
  });
  const adminToken = setup.data?.accessToken;
  check("1.1 first-run setup creates the admin and signs it in", ok(setup) && Boolean(adminToken), `status ${setup.status}`);

  const settings = await api("PATCH", "/settings", {
    token: adminToken,
    body: {
      officeStart: "09:00",
      graceMinutes: 15,
      halfDayHours: 5,
      officeLat: 24.8607,
      officeLng: 67.0011,
      radiusMeters: 200,
      weeklyHours: 40,
    },
  });
  check("1.2 admin sets office hours, location and radius", ok(settings), `status ${settings.status}`);
  const timeZone = settings.data?.settings?.timezone || "Asia/Karachi";
  const today = zoneToday(timeZone);

  const department = await api("POST", "/departments", {
    token: adminToken,
    body: { name: "Engineering", description: "Product engineering" },
  });
  const departmentId = department.data?.department?.id;
  check("1.3 admin creates a department", ok(department) && Boolean(departmentId), `status ${department.status}`);

  const designation = await api("POST", "/designations", {
    token: adminToken,
    body: { name: "Engineer", departmentId },
  });
  const designationId = designation.data?.designation?.id;
  check("1.4 admin creates a designation", ok(designation) && Boolean(designationId), `status ${designation.status}`);

  const holidayDate = nextWeekday(addDays(today, 10));
  const holiday = await api("POST", "/holidays", {
    token: adminToken,
    body: { date: holidayDate, name: "Company day off" },
  });
  check("1.5 admin adds a holiday", ok(holiday), `${holidayDate}, status ${holiday.status}`);

  const hrCreated = await api("POST", "/users/hr", {
    token: adminToken,
    body: {
      name: "Hina HR",
      email: EMAIL.hr,
      departmentId,
      designationId,
      joinDate: addDays(today, -400),
      basicSalary: 220000,
      gender: "female",
      phone: "03001234567",
    },
  });
  const hrTemporary = hrCreated.data?.temporaryPassword;
  check("1.6 admin creates an HR login with a temporary password", ok(hrCreated) && Boolean(hrTemporary), `status ${hrCreated.status}`);

  // Step 2: HR signs in, registers three people and one of them checks in.
  const hrFirst = await login(EMAIL.hr, hrTemporary);
  check("2.1 HR signs in and is forced to change the password", Boolean(hrFirst.mustChangePassword), `mustChangePassword ${hrFirst.mustChangePassword}`);
  const hrToken = await changePassword(hrFirst, hrTemporary);

  const midMonthDay = Math.max(1, Math.min(15, Number(today.slice(8, 10))));
  const people = [
    { name: "Ali Raza", email: EMAIL.ali, basicSalary: SALARY.ali, joinDate: addDays(today, -60), gender: "male" },
    { name: "Sara Khan", email: EMAIL.sara, basicSalary: SALARY.sara, joinDate: addDays(today, -45), gender: "female" },
    {
      name: "Bilal Ahmed",
      email: EMAIL.bilal,
      basicSalary: SALARY.bilal,
      joinDate: `${today.slice(0, 7)}-${String(midMonthDay).padStart(2, "0")}`,
      gender: "male",
    },
  ];

  const registered = [];
  for (const person of people) {
    const created = await api("POST", "/employees", {
      token: hrToken,
      body: {
        ...person,
        departmentId,
        designationId,
      },
    });
    if (!ok(created) || !created.data?.temporaryPassword) {
      fail(`2.2 HR registers ${person.name}`, `status ${created.status} ${created.message || ""}`);
      continue;
    }
    registered.push({ ...person, id: created.data.employee.id, temporaryPassword: created.data.temporaryPassword });
  }
  check("2.2 HR registers three employees, one joining mid-month", registered.length === 3, `${registered.length} of 3 created`);

  const ali = registered.find((person) => person.email === EMAIL.ali);
  const sara = registered.find((person) => person.email === EMAIL.sara);

  const aliFirst = await login(EMAIL.ali, ali.temporaryPassword);
  const aliToken = await changePassword(aliFirst, ali.temporaryPassword);
  check("2.3 the employee signs in and changes the password", Boolean(aliToken));

  const checkIn = await api("POST", "/attendance/check-in", { token: aliToken, body: {} });
  check("2.4 the employee checks in", ok(checkIn) && Boolean(checkIn.data?.record), `status ${checkIn.status}`);

  const secondCheckIn = await api("POST", "/attendance/check-in", { token: aliToken, body: {} });
  check("2.5 a second check-in is refused with 409", secondCheckIn.status === 409, `status ${secondCheckIn.status}`);

  const checkOut = await api("POST", "/attendance/check-out", { token: aliToken, body: {} });
  check("2.6 the employee checks out", ok(checkOut) && Boolean(checkOut.data?.record?.checkOut), `status ${checkOut.status}`);

  // The demo plays in seconds, so the record is corrected to a full day before
  // the dashboard numbers are compared.
  const correction = await api("POST", "/attendance/corrections", {
    token: aliToken,
    body: {
      date: today,
      requestedCheckIn: "09:00",
      requestedCheckOut: "18:00",
      reason: "Checked in from a phone with a broken clock",
    },
  });
  const correctionId = correction.data?.correction?.id;
  check("2.7 the employee requests a correction", ok(correction) && Boolean(correctionId), `status ${correction.status}`);

  const decided = await api("PATCH", `/attendance/corrections/${correctionId}`, {
    token: hrToken,
    body: { decision: "approve", comment: "Fixed" },
  });
  check("2.8 HR approves the correction", ok(decided), `status ${decided.status}`);

  // Step 3: leave, with the AI suggestion when a key is configured.
  const keys = await api("GET", "/admin/ai/keys", { token: adminToken });
  const aiReady = ok(keys) && (keys.data?.keys || []).some((key) => key.enabled && key.status === "active");

  const monday = nextMonday(today);
  const tuesday = nextWeekday(addDays(monday, 1));

  if (aiReady) {
    const suggestion = await api("POST", "/ai/smart-leave", {
      token: aliToken,
      body: { message: "Need next Monday and Tuesday off for my sister's wedding" },
    });
    const suggestionData = suggestion.data || {};
    if (suggestionData.fallback) {
      skip("3.1 the assistant drafts the leave dates", "the model fell back to the form");
    } else {
      check(
        "3.1 the assistant drafts the leave dates",
        ok(suggestion) && suggestionData.startDate === monday && suggestionData.endDate === tuesday,
        `${suggestionData.type} ${suggestionData.startDate} to ${suggestionData.endDate}`
      );
    }
  } else {
    skip("3.1 the assistant drafts the leave dates", "no AI key is configured");
  }

  const balanceBefore = await api("GET", "/leave/balance", { token: aliToken });
  const casualBefore = (balanceBefore.data?.balances || []).find((row) => row.code === "casual");

  const preview = await api("POST", "/leave/preview", {
    token: aliToken,
    body: { leaveTypeCode: "casual", startDate: monday, endDate: tuesday },
  });
  check("3.2 the preview counts the working days", ok(preview) && preview.data?.days === 2, `days ${preview.data?.days}`);

  const applied = await api("POST", "/leave/requests", {
    token: aliToken,
    body: {
      leaveTypeCode: "casual",
      startDate: monday,
      endDate: tuesday,
      reason: "Sister's wedding",
    },
  });
  const leaveId = applied.data?.request?.id;
  check("3.3 the employee applies for leave", ok(applied) && Boolean(leaveId), `status ${applied.status}`);

  const overlap = await api("POST", "/leave/requests", {
    token: aliToken,
    body: {
      leaveTypeCode: "casual",
      startDate: monday,
      endDate: tuesday,
      reason: "Sister's wedding",
    },
  });
  check("3.4 an overlapping request is refused with 422", overlap.status === 422, `status ${overlap.status}`);

  const tooMuch = await api("POST", "/leave/requests", {
    token: aliToken,
    body: {
      leaveTypeCode: "casual",
      startDate: nextWeekday(addDays(today, 30)),
      endDate: `${today.slice(0, 4)}-12-31`,
      reason: "Long trip",
    },
  });
  check(
    "3.5 a request over the balance is refused with 422",
    tooMuch.status === 422,
    `status ${tooMuch.status} ${tooMuch.message || ""}`
  );

  const approval = await api("PATCH", `/leave/requests/${leaveId}/decision`, {
    token: hrToken,
    body: { decision: "approve", comment: "Congratulations" },
  });
  check("3.6 HR approves the leave", ok(approval) && approval.data?.request?.status === "approved", `status ${approval.status}`);

  const balanceAfter = await api("GET", "/leave/balance", { token: aliToken });
  const casualAfter = (balanceAfter.data?.balances || []).find((row) => row.code === "casual");
  check(
    "3.7 the casual balance drops by the approved days",
    casualBefore && casualAfter && casualAfter.remaining === casualBefore.remaining - 2,
    `from ${casualBefore?.remaining} to ${casualAfter?.remaining}`
  );

  const notifications = await api("GET", "/notifications", { token: aliToken });
  const leaveNotice = (notifications.data?.notifications || []).find(
    (row) => String(row.title || "").toLowerCase().includes("leave")
  );
  check("3.8 the employee is notified about the decision", Boolean(leaveNotice), leaveNotice?.message || "no leave notification");

  // Someone else is on leave today, so the KPI has a value to match.
  const todayCover = isWeekend(today)
    ? { startDate: today, endDate: nextWeekday(addDays(today, 1)) }
    : { startDate: today, endDate: today };
  const saraSession = await login(EMAIL.sara, sara.temporaryPassword);
  const saraToken = await changePassword(saraSession, sara.temporaryPassword);

  const saraLeave = await api("POST", "/leave/requests", {
    token: saraToken,
    body: {
      leaveTypeCode: "sick",
      startDate: todayCover.startDate,
      endDate: todayCover.endDate,
      reason: "Fever",
    },
  });
  const saraLeaveId = saraLeave.data?.request?.id;
  const saraApproval = saraLeaveId
    ? await api("PATCH", `/leave/requests/${saraLeaveId}/decision`, {
        token: hrToken,
        body: { decision: "approve", comment: "Get well" },
      })
    : { status: 422 };
  const onLeaveToday = ok(saraApproval) ? 1 : 0;
  check("3.9 an approved leave covers today for the dashboard", onLeaveToday === 1, `status ${saraApproval.status}`);

  // Step 4: the dashboard numbers match records the script already holds.
  const todayRecord = await api("GET", "/attendance/today", { token: aliToken });
  const recordStatus = todayRecord.data?.record?.status || todayRecord.data?.status;
  // A weekend or a company holiday is an off day, and off days are left out of
  // every rate (spec section 4.1), so they never count as present or late.
  const todayIsOff = isWeekend(today) || holidayDate === today;
  // HR owns an employee record too (spec section 2), so it counts in headcount
  // and gets a payslip like everybody else.
  const employeeRecords = registered.length + 1;
  const expected = {
    headcount: employeeRecords,
    presentToday: !todayIsOff && recordStatus === "present" ? 1 : 0,
    lateToday: !todayIsOff && recordStatus === "late" ? 1 : 0,
    onLeaveToday,
  };

  const hrDashboard = await api("GET", "/dashboard/hr", { token: hrToken });
  const kpi = hrDashboard.data || {};
  check(
    "4.1 HR dashboard KPIs equal the records the script holds",
    ok(hrDashboard) &&
      kpi.headcount === expected.headcount &&
      kpi.presentToday === expected.presentToday &&
      kpi.lateToday === expected.lateToday &&
      kpi.onLeaveToday === expected.onLeaveToday,
    `headcount ${kpi.headcount}, present ${kpi.presentToday}, late ${kpi.lateToday}, on leave ${kpi.onLeaveToday}`
  );

  if (aiReady) {
    const summary = await api("POST", "/ai/dashboard-summary", {
      token: hrToken,
      body: { from: `${today.slice(0, 7)}-01`, to: today },
    });
    const bullets = summary.data?.bullets || [];
    check("4.2 Summarize returns three to five bullets", ok(summary) && bullets.length >= 3 && bullets.length <= 5, `${bullets.length} bullets`);

    const onLeaveAnswer = await ask(hrToken, "Who is on leave today?");
    const named = onLeaveAnswer.reply.toLowerCase().includes("sara");
    check(
      "4.3 the assistant answers who is on leave today with a tool",
      onLeaveAnswer.status === 200 &&
        onLeaveAnswer.tools.includes("get_leave_summary") &&
        named,
      `tools [${onLeaveAnswer.tools.join(", ")}] names Sara ${named}`
    );

    const departmentAnswer = await ask(hrToken, "How many active employees are in Engineering?");
    const counted = digitsOf(departmentAnswer.reply).includes(expected.headcount);
    check(
      "4.4 the assistant counts the department with a tool",
      departmentAnswer.status === 200 &&
        departmentAnswer.tools.includes("get_headcount") &&
        counted,
      `tools [${departmentAnswer.tools.join(", ")}] value ${expected.headcount} found ${counted}`
    );

    const salaryAnswer = await ask(aliToken, "What is Sara's salary?");
    const leaked = digitsOf(salaryAnswer.reply).some(
      (value) =>
        value === SALARY.sara ||
        value === SALARY.sara * GROSS_FACTOR ||
        value === Math.round(SALARY.sara / 12)
    );
    check(
      "4.5 an employee asking for a colleague's salary gets no salary",
      salaryAnswer.status === 200 && !leaked,
      `salary leaked ${leaked}`
    );
  } else {
    skip("4.2 Summarize", "no AI key is configured");
    skip("4.3 the assistant answers who is on leave today", "no AI key is configured");
    skip("4.4 the assistant counts the department", "no AI key is configured");
    skip("4.5 another person's salary stays hidden", "no AI key is configured");
  }

  // Step 5: payroll draft, finalize, lock and the PDF.
  const month = today.slice(0, 7);
  const draft = await api("POST", "/payroll/runs", { token: hrToken, body: { month } });
  const runId = draft.data?.run?.id;
  check("5.1 HR creates the payroll draft", ok(draft) && Boolean(runId), `status ${draft.status}, ${draft.data?.run?.totals?.employees} payslips`);

  const runDetail = await api("GET", `/payroll/runs/${runId}`, { token: hrToken });
  const payslips = runDetail.data?.payslips || [];
  check(
    "5.2 the run holds a payslip per eligible employee",
    ok(runDetail) && payslips.length === employeeRecords,
    `${payslips.length} payslips for ${employeeRecords} employee records`
  );

  const finalized = await api("POST", `/payroll/runs/${runId}/finalize`, { token: adminToken });
  check("5.3 the admin finalizes the month", ok(finalized) && finalized.data?.run?.status === "finalized", `status ${finalized.status}`);

  const recalculate = await api("POST", "/payroll/runs", { token: hrToken, body: { month } });
  check("5.4 a finalized month cannot be recalculated (409)", recalculate.status === 409, `status ${recalculate.status}`);

  const myPayslips = await api("GET", "/payroll/payslips/me", { token: aliToken });
  const aliPayslip = (myPayslips.data?.payslips || [])[0];
  check("5.5 the employee sees the finalized payslip", ok(myPayslips) && Boolean(aliPayslip), `${(myPayslips.data?.payslips || []).length} payslips`);

  if (aliPayslip) {
    const pdf = await api("GET", `/payroll/payslips/${aliPayslip.id}/pdf`, {
      token: aliToken,
      raw: true,
    });
    check(
      "5.6 the employee downloads a real PDF",
      pdf.status === 200 && pdf.head === "%PDF" && pdf.size > 1000,
      `${pdf.head}, ${pdf.size} bytes`
    );
  } else {
    fail("5.6 the employee downloads a real PDF", "no payslip to download");
  }

  const saraPayslip = payslips.find(
    (row) => row.snapshot?.employeeCode && row.employeeId === sara?.id
  ) || payslips.find((row) => row.snapshot?.employeeName === "Sara Khan");

  if (saraPayslip) {
    const foreignPdf = await api("GET", `/payroll/payslips/${saraPayslip.id}/pdf`, {
      token: aliToken,
      raw: true,
    });
    check("5.7 another employee's payslip is refused (403)", foreignPdf.status === 403, `status ${foreignPdf.status}`);
  } else {
    skip("5.7 another employee's payslip is refused", "the colleague payslip was not found in the run");
  }

  // Step 6: the audit trail and its read-only shape.
  const audit = await api("GET", "/audit?limit=100", { token: adminToken });
  const logs = audit.data?.logs || [];
  const required = [
    "setup.complete",
    "user.createHr",
    "employee.register",
    "leave.decision",
    "payroll.create",
    "payroll.finalize",
  ];
  const present = required.filter((action) => logs.some((row) => row.action === action));
  check(
    "6.1 the audit log records every important action with an actor",
    ok(audit) && present.length === required.length && logs.every((row) => row.actorName),
    `${present.length} of ${required.length} actions`
  );

  const patchAudit = await api("PATCH", "/audit", { token: adminToken, body: {} });
  const deleteAudit = await api("DELETE", "/audit", { token: adminToken });
  check(
    "6.2 the audit route accepts no writes",
    [404, 405].includes(patchAudit.status) && [404, 405].includes(deleteAudit.status),
    `PATCH ${patchAudit.status}, DELETE ${deleteAudit.status}`
  );

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`\nThe demo stopped: ${error.message}`);
  process.exit(1);
});
