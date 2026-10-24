import PDFDocument from "pdfkit";
import { todayIn } from "../utils/dates.js";

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const monthLabel = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTHS[monthNumber - 1]} ${year}`;
};

export const payslipFileName = (payslip) =>
  `payslip-${payslip.snapshot?.employeeCode || payslip.employeeId}-${payslip.month}.pdf`;

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

// One row of a two column table: label on the left, amount on the right.
const drawRow = (doc, y, label, amount, { bold = false } = {}) => {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
  doc.text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH - 140 });
  doc.text(money(amount), PAGE_MARGIN + CONTENT_WIDTH - 140, y, {
    width: 140,
    align: "right",
  });
  return y + 18;
};

const drawHeading = (doc, y, text) => {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(text, PAGE_MARGIN, y);
  doc
    .moveTo(PAGE_MARGIN, y + 16)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, y + 16)
    .strokeColor("#999999")
    .stroke();
  return y + 24;
};

// Writes the PDF straight to the HTTP response. Plain black on white.
export const writePayslipPdf = (res, { payslip, settings }) => {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });

  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  const companyName = settings?.companyName || "Company";
  const generatedOn = todayIn(settings?.timezone);

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000");
  doc.text(companyName, PAGE_MARGIN, PAGE_MARGIN, { width: CONTENT_WIDTH });
  doc.font("Helvetica").fontSize(11);
  doc.text("Payslip", PAGE_MARGIN, PAGE_MARGIN + 24);
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(monthLabel(payslip.month), PAGE_MARGIN, PAGE_MARGIN + 24, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  let y = PAGE_MARGIN + 60;

  doc.font("Helvetica").fontSize(10);
  doc.text(`Employee: ${payslip.snapshot?.employeeName || ""}`, PAGE_MARGIN, y);
  doc.text(`Code: ${payslip.snapshot?.employeeCode || ""}`, PAGE_MARGIN, y + 14);
  doc.text(
    `Department: ${payslip.snapshot?.department || "Not set"}`,
    PAGE_MARGIN,
    y + 28
  );
  doc.text(
    `Designation: ${payslip.snapshot?.designation || "Not set"}`,
    PAGE_MARGIN,
    y + 42
  );

  y += 70;
  y = drawHeading(doc, y, "Earnings");
  y = drawRow(doc, y, "Basic salary", payslip.basic);
  y = drawRow(doc, y, "House rent allowance", payslip.hra);
  y = drawRow(doc, y, "Medical allowance", payslip.medical);
  y = drawRow(doc, y, "Gross salary", payslip.gross, { bold: true });
  y = drawRow(
    doc,
    y,
    `Earned gross (${payslip.eligibleDays} of ${payslip.workingDays} days)`,
    payslip.earnedGross
  );

  y += 10;
  y = drawHeading(doc, y, "Deductions");
  y = drawRow(doc, y, `Absent days (${payslip.absentDays})`, payslip.absentDeduction);
  y = drawRow(doc, y, `Unpaid leave (${payslip.unpaidDays})`, payslip.unpaidDeduction);
  y = drawRow(doc, y, `Half days (${payslip.halfDays})`, payslip.halfDayDeduction);
  y = drawRow(doc, y, "Income tax", payslip.tax);
  y = drawRow(
    doc,
    y,
    "Total deductions",
    payslip.attendanceDeduction + payslip.tax,
    { bold: true }
  );

  y += 10;
  y = drawHeading(doc, y, "Attendance");
  doc.font("Helvetica").fontSize(10);
  doc.text(
    `Working days ${payslip.workingDays}, eligible ${payslip.eligibleDays}, absent ${payslip.absentDays}, unpaid leave ${payslip.unpaidDays}, half days ${payslip.halfDays}`,
    PAGE_MARGIN,
    y,
    { width: CONTENT_WIDTH }
  );

  y += 30;
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, y)
    .strokeColor("#000000")
    .stroke();

  doc.font("Helvetica-Bold").fontSize(13);
  doc.text("Net pay", PAGE_MARGIN, y + 12);
  doc.text(money(payslip.netPay), PAGE_MARGIN, y + 12, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  doc.font("Helvetica").fontSize(9).fillColor("#444444");
  doc.text(`Generated on ${generatedOn}`, PAGE_MARGIN, y + 60);

  doc.end();
};
