import test from "node:test";
import assert from "node:assert/strict";
import {
  executeTool,
  toolNamesForRole,
  toolsForRole,
} from "../src/services/aiTools.js";
import { smartLeaveSchema } from "../src/services/aiSmartLeave.js";

const hasSalaryProperty = (value) => {
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, nested]) => {
    if (/salary|basic|netpay|gross/i.test(key)) return true;
    if (Array.isArray(nested)) return nested.some(hasSalaryProperty);
    return hasSalaryProperty(nested);
  });
};

test("an employee gets only the own-data tools", () => {
  assert.deepEqual(toolNamesForRole("employee"), [
    "get_my_leave_balance",
    "get_my_attendance_summary",
    "get_my_last_payslip",
  ]);
});

test("HR and admin get the org tools plus the own-data tools", () => {
  const expected = [
    "get_headcount",
    "get_attendance_summary",
    "get_late_comers",
    "get_leave_summary",
    "get_payroll_summary",
    "search_employees",
    "get_my_leave_balance",
    "get_my_attendance_summary",
    "get_my_last_payslip",
  ];

  assert.deepEqual(toolNamesForRole("hr"), expected);
  assert.deepEqual(toolNamesForRole("admin"), expected);
});

test("no tool schema mentions a salary", () => {
  for (const role of ["admin", "hr", "employee"]) {
    for (const tool of toolsForRole(role)) {
      assert.equal(
        hasSalaryProperty(tool.parameters),
        false,
        `${tool.name} must not accept salary input`
      );
    }
  }
});

test("the search tool never exposes salary fields", () => {
  const search = toolsForRole("hr").find((tool) => tool.name === "search_employees");

  assert.deepEqual(Object.keys(search.parameters.properties).sort(), [
    "departmentId",
    "departmentName",
    "query",
  ]);
});

test("an unknown tool comes back as an error for the model", async () => {
  const result = await executeTool("drop_all_tables", {}, {});

  assert.equal(result.error, "unknown_tool");
});

test("a tool outside the role scope is unknown even if it exists", async () => {
  const result = await executeTool("get_headcount", {}, {}, [
    "get_my_leave_balance",
  ]);

  assert.deepEqual(result, { error: "unknown_tool", tool: "get_headcount" });
});

test("invalid tool arguments come back as an error for the model", async () => {
  const result = await executeTool("search_employees", { query: "" }, {});

  assert.equal(result.error, "invalid_arguments");
  assert.ok(result.details.length > 0);
});

test("an own-data tool without an employee record answers plainly", async () => {
  const result = await executeTool("get_my_last_payslip", {}, { employeeId: null });

  assert.deepEqual(result, { error: "no_employee_record" });
});

test("the smart leave output must be a real type and valid dates", () => {
  const schema = smartLeaveSchema(["annual", "casual", "sick", "unpaid"]);

  const valid = schema.safeParse({
    type: "casual",
    startDate: "2026-10-26",
    endDate: "2026-10-27",
    reason: "Sister's wedding",
  });
  assert.equal(valid.success, true);

  assert.equal(
    schema.safeParse({
      type: "holiday",
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      reason: "Sister's wedding",
    }).success,
    false
  );

  assert.equal(
    schema.safeParse({
      type: "casual",
      startDate: "2026-10-28",
      endDate: "2026-10-26",
      reason: "Backwards range",
    }).success,
    false
  );

  assert.equal(
    schema.safeParse({
      type: "casual",
      startDate: "26-10-2026",
      endDate: "2026-10-27",
      reason: "Bad date",
    }).success,
    false
  );

  assert.equal(
    schema.safeParse({
      type: "casual",
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      reason: "x",
    }).success,
    false
  );
});
