// Every route in the spec, called as each role plus anonymous. A role that is
// allowed must not be stopped by the guard (401 or 403); a role that is not
// allowed must be. Object level checks follow the table.
//
// Run scripts/demo-check.mjs first on the same database, because this script
// signs in as the demo accounts it created.
const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const PASSWORD = "DemoPass123!";
const ACCOUNTS = {
  admin: "admin@demo.local",
  hr: "hr@demo.local",
  employee: "ali@demo.local",
  colleague: "sara@demo.local",
};

const A = ["admin"];
const H = ["hr"];
const E = ["employee"];
const ALL = ["admin", "hr", "employee"];
const AH = ["admin", "hr"];
const HE = ["hr", "employee"];

let passed = 0;
let failed = 0;
const failures = [];
const seen = [];

const shouldAllow = (allowed, role) => allowed.includes(role);

const request = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  seen.push(text);
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  return { status: response.status, data: payload?.data, message: payload?.message };
};

const login = async (email) => {
  const result = await request("POST", "/auth/login", {
    body: { email, password: PASSWORD },
  });
  if (result.status !== 200) throw new Error(`login ${email} answered ${result.status}`);
  return result.data.accessToken;
};

// A role without access must see 403, and a visitor without a session 401.
const record = (label, expected, actual) => {
  const okRow = expected ? actual !== 401 && actual !== 403 : actual === 401 || actual === 403;
  if (okRow) passed += 1;
  else {
    failed += 1;
    failures.push(`${label}: expected ${expected ? "access" : "denied"}, got ${actual}`);
  }
  return okRow;
};

const pad = (value, width) => String(value).padEnd(width);

const runRow = async (row, tokens, ids) => {
  const path = row.path(ids);
  const outcomes = [];

  for (const role of ["admin", "hr", "employee"]) {
    const allowed = shouldAllow(row.allowed, role);
    const result = await request(row.method, path, {
      token: tokens[role],
      body: row.body,
    });
    outcomes.push(result.status);
    record(`${row.method} ${path} as ${role}`, allowed, result.status);
    row.outcome = row.outcome || {};
    row.outcome[role] = result.status;
  }

  const anonymous = await request(row.method, path, { body: row.body });
  outcomes.push(anonymous.status);
  record(`${row.method} ${path} as anonymous`, false, anonymous.status);
  row.outcome.anonymous = anonymous.status;

  console.log(
    `${pad(row.method, 6)} ${pad(path.slice(0, 46), 48)} A ${pad(row.outcome.admin, 3)} H ${pad(row.outcome.hr, 3)} E ${pad(row.outcome.employee, 3)} anon ${row.outcome.anonymous}`
  );

  return outcomes;
};

const scopeChecks = async (tokens, ids) => {
  const checks = [];

  const expect = async (label, allowed, call, expectedStatus) => {
    const result = await call();
    const okRow =
      expectedStatus === undefined
        ? allowed
          ? result.status !== 401 && result.status !== 403
          : result.status === 403
        : result.status === expectedStatus;
    checks.push([label, okRow, `status ${result.status}`]);
    return result;
  };

  const employee = tokens.employee;

  await expect(
    "employee can read own record",
    true,
    () => request("GET", `/employees/${ids.ownEmployeeId}`, { token: employee }),
    200
  );
  await expect(
    "employee cannot read a colleague's record",
    false,
    () => request("GET", `/employees/${ids.colleagueEmployeeId}`, { token: employee }),
    403
  );
  await expect(
    "employee cannot read a colleague's 360 view",
    false,
    () => request("GET", `/employees/${ids.colleagueEmployeeId}/360`, { token: employee }),
    403
  );
  await expect(
    "employee cannot read a colleague's attendance",
    false,
    () =>
      request("GET", `/attendance/employee/${ids.colleagueEmployeeId}`, {
        token: employee,
      }),
    403
  );

  const scopedLeaves = await request(
    "GET",
    `/leave/requests?employeeId=${ids.colleagueEmployeeId}`,
    { token: employee }
  );
  const onlyOwnLeaves = (scopedLeaves.data?.requests || []).every(
    (row) => row.employeeId !== ids.colleagueEmployeeId
  );
  checks.push([
    "employee cannot read a colleague's leave request",
    scopedLeaves.status === 200 && onlyOwnLeaves,
    `status ${scopedLeaves.status}`,
  ]);

  await expect(
    "employee cannot download a colleague's payslip",
    false,
    () => request("GET", `/payroll/payslips/${ids.colleaguePayslipId}/pdf`, { token: employee }),
    403
  );
  await expect(
    "employee cannot open a colleague's payslip",
    false,
    () => request("GET", `/payroll/payslips/${ids.colleaguePayslipId}`, { token: employee }),
    403
  );
  await expect(
    "employee cannot cancel someone else's leave",
    false,
    () => request("PATCH", `/leave/requests/${ids.colleagueLeaveId}/cancel`, { token: employee }),
    403
  );
  await expect(
    "employee cannot decide a correction",
    false,
    () =>
      request("PATCH", `/attendance/corrections/${ids.correctionId}`, {
        token: employee,
        body: { decision: "approve" },
      }),
    403
  );

  const ownLeave = await request("POST", "/leave/requests", {
    token: tokens.hr,
    body: {
      leaveTypeCode: "annual",
      startDate: ids.hrLeaveStart,
      endDate: ids.hrLeaveStart,
      reason: "Family trip",
    },
  });
  const hrLeaveId = ownLeave.data?.request?.id;

  if (hrLeaveId) {
    await expect(
      "HR cannot decide its own leave request",
      false,
      () =>
        request("PATCH", `/leave/requests/${hrLeaveId}/decision`, {
          token: tokens.hr,
          body: { decision: "approve", comment: "Mine" },
        }),
      403
    );
    await request("PATCH", `/leave/requests/${hrLeaveId}/cancel`, { token: tokens.hr });
  } else {
    checks.push(["HR cannot decide its own leave request", false, `request status ${ownLeave.status}`]);
  }

  await expect(
    "HR cannot change its own salary",
    false,
    () =>
      request("PATCH", `/employees/${ids.hrEmployeeId}/salary`, {
        token: tokens.hr,
        body: { basicSalary: 999999, hraPercent: 40, medicalPercent: 10 },
      }),
    403
  );
  await expect(
    "Admin can set the salary of an HR employee",
    true,
    () =>
      request("PATCH", `/employees/${ids.hrEmployeeId}/salary`, {
        token: tokens.admin,
        body: { basicSalary: 220000, hraPercent: 40, medicalPercent: 10 },
      }),
    200
  );
  await expect(
    "a finalized run cannot be finalized twice",
    true,
    () => request("POST", `/payroll/runs/${ids.runId}/finalize`, { token: tokens.admin }),
    409
  );

  for (const [label, okRow, detail = ""] of checks) {
    if (okRow) {
      passed += 1;
      console.log(`PASS  ${label}${detail ? ` - ${detail}` : ""}`);
    } else {
      failed += 1;
      failures.push(`${label}${detail ? ` (${detail})` : ""}`);
      console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ""}`);
    }
  }
};

const secretScan = async () => {
  const forbidden = [/passwordHash/i, /refreshToken/i, /refreshTokens/i, /encryptedKey/i, /AIza[0-9A-Za-z_-]{10,}/, /gsk_[0-9A-Za-z]{10,}/, /xai-[0-9A-Za-z]{10,}/];
  const hit = seen.find((text) => forbidden.some((pattern) => pattern.test(text)));

  if (hit) {
    failed += 1;
    failures.push("a response carried a secret field or key");
    console.log("FAIL  no response carries a password hash, token or provider key");
    return;
  }

  passed += 1;
  console.log("PASS  no response carries a password hash, token or provider key");
};

const main = async () => {
  const status = await request("GET", "/setup/status");
  if (!status.data?.setupComplete) {
    console.log("This app has no setup yet. Run the demo first: npm run demo:check");
    process.exit(1);
  }

  const tokens = {};
  for (const role of ["admin", "hr", "employee"]) {
    tokens[role] = await login(ACCOUNTS[role]);
  }
  const colleagueToken = await login(ACCOUNTS.colleague);

  const employeeList = await request("GET", "/employees?limit=100", { token: tokens.admin });
  const employees = employeeList.data?.employees || [];
  const userList = await request("GET", "/users?limit=100", { token: tokens.admin });
  const users = userList.data?.users || [];
  const ali = employees.find((row) => row.email === ACCOUNTS.employee);
  const sara = employees.find((row) => row.email === ACCOUNTS.colleague);
  const hrEmployee = employees.find((row) => row.email === ACCOUNTS.hr);

  const runs = await request("GET", "/payroll/runs?limit=10", { token: tokens.admin });
  const run = (runs.data?.runs || [])[0];
  const runDetail = run
    ? await request("GET", `/payroll/runs/${run.id}`, { token: tokens.admin })
    : { data: {} };
  const payslips = runDetail.data?.payslips || [];
  const aliPayslip = payslips.find((row) => row.employeeId === ali?.id);
  const saraPayslip = payslips.find((row) => row.employeeId === sara?.id);

  const leaveList = await request("GET", "/leave/requests?limit=50", { token: tokens.admin });
  const leaves = leaveList.data?.requests || [];
  const saraLeave = leaves.find((row) => row.employeeId === sara?.id);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(
    new Date()
  );
  const addDays = (dateString, days) =>
    new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const nextWeekday = (dateString) => {
    let cursor = dateString;
    while ([0, 6].includes(new Date(`${cursor}T00:00:00Z`).getUTCDay())) {
      cursor = addDays(cursor, 1);
    }
    return cursor;
  };

  // A throwaway account, so the password reset row never knocks the demo
  // accounts into the forced-password state.
  const PROBE_EMAIL = "rbac.probe@demo.local";
  let probe = employees.find((row) => row.email === PROBE_EMAIL);
  if (!probe) {
    const created = await request("POST", "/employees", {
      token: tokens.hr,
      body: {
        name: "Rbac Probe",
        email: PROBE_EMAIL,
        departmentId: ali?.departmentId,
        designationId: ali?.designationId,
        joinDate: today,
        basicSalary: 100000,
        gender: "other",
      },
    });
    probe = created.data?.employee;
  }
  const probeUsers = await request("GET", "/users?limit=100", { token: tokens.admin });
  const probeUser = (probeUsers.data?.users || []).find(
    (row) => row.email === PROBE_EMAIL
  );

  // Pending records the Admin is not allowed to decide on.
  const pendingLeaveResult = await request("POST", "/leave/requests", {
    token: tokens.employee,
    body: {
      leaveTypeCode: "casual",
      startDate: nextWeekday(addDays(today, 14)),
      endDate: nextWeekday(addDays(today, 14)),
      reason: "Rbac pending leave",
    },
  });
  const pendingLeaves = await request("GET", "/leave/requests?status=pending&limit=50", {
    token: tokens.admin,
  });
  const pendingLeave =
    pendingLeaveResult.data?.request ||
    (pendingLeaves.data?.requests || []).find(
      (row) => row.reason === "Rbac pending leave" || row.employeeId === ali?.id
    );

  const correctionResult = await request("POST", "/attendance/corrections", {
    token: tokens.employee,
    body: {
      date: nextWeekday(addDays(today, -3)),
      requestedCheckIn: "09:00",
      requestedCheckOut: "18:00",
      reason: "Rbac pending correction",
    },
  });
  const corrections = await request(
    "GET",
    "/attendance/corrections?status=pending&limit=10",
    { token: tokens.admin }
  );
  const correction =
    correctionResult.data?.correction || (corrections.data?.corrections || [])[0];

  const ids = {
    ownEmployeeId: ali?.id,
    colleagueEmployeeId: sara?.id,
    hrEmployeeId: hrEmployee?.id,
    runId: run?.id,
    ownPayslipId: aliPayslip?.id,
    colleaguePayslipId: saraPayslip?.id,
    colleagueLeaveId: saraLeave?.id,
    pendingLeaveId: pendingLeave?.id,
    correctionId: correction?.id,
    hrLeaveStart: nextWeekday(addDays(today, 21)),
    probeUserId: probeUser?.id,
    employeeUserId: (users.find((row) => row.email === ACCOUNTS.employee) || {}).id,
  };

  const rows = [
    { method: "GET", path: () => "/auth/me", allowed: ALL },
    { method: "GET", path: () => "/notifications", allowed: ALL },
    { method: "GET", path: () => "/notifications/unread-count", allowed: ALL },
    { method: "GET", path: () => "/announcements", allowed: ALL },
    { method: "POST", path: () => "/announcements", allowed: AH, body: { title: "Hello" } },
    { method: "DELETE", path: () => "/announcements/000000000000000000000000", allowed: AH },
    { method: "GET", path: () => "/departments", allowed: ALL },
    { method: "GET", path: () => "/designations", allowed: ALL },
    { method: "GET", path: () => "/leave-types", allowed: ALL },
    { method: "GET", path: () => "/holidays", allowed: ALL },
    { method: "GET", path: () => "/settings", allowed: AH },
    { method: "PATCH", path: () => "/settings", allowed: A, body: { graceMinutes: 15 } },
    { method: "POST", path: () => "/departments", allowed: A, body: { name: "Rbac Probe" } },
    { method: "POST", path: () => "/designations", allowed: A, body: { name: "Rbac Probe" } },
    { method: "POST", path: () => "/leave-types", allowed: A, body: { code: "rbac-probe", name: "Probe" } },
    { method: "POST", path: () => "/holidays", allowed: A, body: { date: "2030-01-01", name: "Probe" } },
    { method: "GET", path: () => "/users", allowed: A },
    { method: "POST", path: () => "/users/hr", allowed: A, body: {} },
    { method: "PATCH", path: (list) => `/users/${list.probeUserId}/active`, allowed: A, body: { isActive: true } },
    { method: "POST", path: (list) => `/users/${list.probeUserId}/reset-password`, allowed: A },
    { method: "POST", path: () => "/employees", allowed: H, body: {} },
    { method: "GET", path: () => "/employees", allowed: AH },
    { method: "GET", path: (list) => `/employees/${list.ownEmployeeId}`, allowed: ALL },
    { method: "GET", path: (list) => `/employees/${list.ownEmployeeId}/360`, allowed: ALL },
    { method: "PATCH", path: (list) => `/employees/${list.ownEmployeeId}`, allowed: H, body: {} },
    {
      method: "PATCH",
      path: (list) => `/employees/${list.ownEmployeeId}/salary`,
      allowed: H,
      body: { basicSalary: 180000, hraPercent: 40, medicalPercent: 10 },
    },
    { method: "POST", path: () => "/employees/import?dryRun=true", allowed: H },
    { method: "GET", path: () => "/employees/export", allowed: H },
    { method: "GET", path: () => "/employees/import/template", allowed: H },
    { method: "GET", path: () => "/attendance/today", allowed: HE },
    { method: "POST", path: () => "/attendance/check-in", allowed: HE, body: {} },
    { method: "POST", path: () => "/attendance/check-out", allowed: HE, body: {} },
    { method: "GET", path: () => "/attendance/me", allowed: HE },
    { method: "GET", path: () => "/attendance/board", allowed: AH },
    { method: "GET", path: (list) => `/attendance/employee/${list.ownEmployeeId}`, allowed: AH },
    { method: "POST", path: () => "/attendance/corrections", allowed: HE, body: {} },
    { method: "GET", path: () => "/attendance/corrections", allowed: ALL },
    {
      method: "PATCH",
      path: (list) => `/attendance/corrections/${list.correctionId}`,
      allowed: H,
      body: { decision: "approve", comment: "Checked" },
    },
    { method: "GET", path: () => "/leave/balance", allowed: HE },
    { method: "POST", path: () => "/leave/preview", allowed: HE, body: {} },
    { method: "POST", path: () => "/leave/requests", allowed: HE, body: {} },
    { method: "GET", path: () => "/leave/requests", allowed: ALL },
    { method: "PATCH", path: (list) => `/leave/requests/${list.colleagueLeaveId}/cancel`, allowed: [],
      body: {} },
    {
      method: "PATCH",
      path: (list) => `/leave/requests/${list.pendingLeaveId}/decision`,
      allowed: H,
      body: { decision: "reject", comment: "Not this time" },
    },
    { method: "POST", path: () => "/payroll/runs", allowed: H, body: {} },
    { method: "GET", path: () => "/payroll/runs", allowed: AH },
    { method: "GET", path: (list) => `/payroll/runs/${list.runId}`, allowed: AH },
    { method: "POST", path: (list) => `/payroll/runs/${list.runId}/finalize`, allowed: A },
    { method: "GET", path: () => "/payroll/payslips/me", allowed: HE },
    { method: "GET", path: (list) => `/payroll/payslips/${list.ownPayslipId}`, allowed: ALL },
    { method: "GET", path: (list) => `/payroll/payslips/${list.ownPayslipId}/pdf`, allowed: ALL },
    { method: "GET", path: () => "/dashboard/admin", allowed: A },
    { method: "GET", path: () => "/dashboard/hr", allowed: AH },
    { method: "GET", path: () => "/dashboard/me", allowed: HE },
    { method: "GET", path: () => "/audit", allowed: A },
    { method: "POST", path: () => "/ai/chat", allowed: ALL, body: { message: "" } },
    { method: "GET", path: () => "/ai/conversations", allowed: ALL },
    { method: "POST", path: () => "/ai/dashboard-summary", allowed: AH, body: {} },
    { method: "POST", path: () => "/ai/smart-leave", allowed: HE, body: { message: "" } },
    { method: "GET", path: () => "/admin/ai/keys", allowed: A },
    { method: "GET", path: () => "/admin/ai/settings", allowed: A },
  ];

  console.log(`Role matrix against ${BASE_URL}\n`);
  console.log(
    `${pad("METHOD", 6)} ${pad("PATH", 48)} A   H   E   anon`
  );

  for (const row of rows) {
    await runRow(row, tokens, ids);
  }

  console.log("\nObject level checks\n");
  await scopeChecks(tokens, ids);

  const secondSetup = await request("POST", "/setup", {
    body: {
      companyName: "Second company",
      adminName: "Someone Else",
      adminEmail: "second@demo.local",
      adminPassword: "DemoPass456!",
    },
  });
  if (secondSetup.status === 409) {
    passed += 1;
    console.log("PASS  setup cannot run twice (409)");
  } else {
    failed += 1;
    failures.push(`setup ran twice: status ${secondSetup.status}`);
    console.log(`FAIL  setup cannot run twice (status ${secondSetup.status})`);
  }

  const health = await request("GET", "/health");
  if (health.status === 200) {
    passed += 1;
    console.log("PASS  health answers without a session");
  } else {
    failed += 1;
    failures.push(`health answered ${health.status}`);
    console.log(`FAIL  health answers without a session (${health.status})`);
  }

  // The colleague account is used only to keep the demo data honest.
  const colleagueMe = await request("GET", "/auth/me", { token: colleagueToken });
  if (colleagueMe.status !== 200) {
    failed += 1;
    failures.push("the colleague account could not read its own profile");
  }

  console.log("\nSecrets\n");
  await secretScan();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`\nThe matrix stopped: ${error.message}`);
  process.exit(1);
});
