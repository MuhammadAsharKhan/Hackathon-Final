import http from "./http";
import { filenameFromDisposition } from "@/lib/download";

export const downloadPayslipPdf = (id, month) =>
  http.get(`/payroll/payslips/${id}/pdf`, { responseType: "blob" }).then((response) => ({
    blob: response.data,
    filename: filenameFromDisposition(
      response.headers["content-disposition"],
      `payslip-${month || id}.pdf`
    ),
  }));
