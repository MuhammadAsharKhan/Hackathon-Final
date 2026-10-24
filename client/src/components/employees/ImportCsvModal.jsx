import { useState } from "react";
import { Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import {
  downloadImportTemplate,
  importEmployees,
} from "@/api/employees.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { saveBlob, saveCsv } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors";

const reportFrom = (failure) => failure?.response?.data?.data || null;

export default function ImportCsvModal({ open, onClose, onImported }) {
  const mountedRef = useMountedRef();

  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [created, setCreated] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setReport(null);
    setCreated(null);
    setError("");
  };

  const close = () => {
    if (checking || importing) return;
    reset();
    onClose();
  };

  const handleTemplate = async () => {
    try {
      const download = await downloadImportTemplate();
      saveBlob(download.blob, download.filename);
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    }
  };

  const handleFile = (event) => {
    const chosen = event.target.files?.[0] || null;
    setFile(chosen);
    setReport(null);
    setCreated(null);
    setError("");
  };

  const handleCheck = async () => {
    if (!file || checking) return;
    setChecking(true);
    setError("");

    try {
      const result = await importEmployees(file, true);
      if (!mountedRef.current) return;
      setReport(result);
    } catch (failure) {
      if (!mountedRef.current) return;
      setReport(reportFrom(failure));
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  };

  const handleImport = async () => {
    if (!file || importing || hasErrors) return;
    setImporting(true);
    setError("");

    try {
      const result = await importEmployees(file, false);
      if (!mountedRef.current) return;
      setCreated(result.created || []);
      toast.success(`${(result.created || []).length} employees imported`);
      onImported();
    } catch (failure) {
      if (!mountedRef.current) return;
      setReport(reportFrom(failure) || report);
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setImporting(false);
    }
  };

  const handlePasswords = () => {
    saveCsv(
      [
        ["code", "name", "email", "temporaryPassword"],
        ...created.map((row) => [
          row.code,
          row.name,
          row.email,
          row.temporaryPassword,
        ]),
      ],
      "employee-passwords.csv"
    );
  };

  const errors = report?.errors || [];
  const hasErrors = errors.length > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import employees"
      description="Check the file first. Import is enabled only when no row has an error."
      footer={
        created ? (
          <Button variant="secondary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={!file || !report || hasErrors}
            >
              {report ? `Import ${report.validRows} rows` : "Import"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Button variant="secondary" size="sm" onClick={handleTemplate}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download template
          </Button>
          <p className="text-xs text-muted-foreground">
            Columns: code, name, email, phone, address, gender, dateOfBirth,
            department, designation, joinDate, status, basicSalary.
          </p>
        </div>

        <Input
          label="CSV file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={Boolean(created)}
          className="h-auto py-2"
          hint="One file, at most 1 MB."
        />

        {!created ? (
          <Button
            variant="secondary"
            onClick={handleCheck}
            loading={checking}
            disabled={!file}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Check file
          </Button>
        ) : null}

        {report ? (
          <div className="space-y-3">
            <p className="text-sm">
              {report.totalRows} rows read, {report.validRows} ready to import,{" "}
              {errors.length} errors.
            </p>

            {hasErrors ? (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {errors.map((row, index) => (
                  <li
                    key={`${row.row}-${row.field}-${index}`}
                    className="px-3 py-2"
                  >
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Row {row.row} · {row.field}
                    </p>
                    <p className="mt-0.5 text-sm">{row.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                No errors found. The import creates one account per row.
              </p>
            )}
          </div>
        ) : null}

        {created ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {created.length} accounts created
              </p>
              <Button variant="secondary" size="sm" onClick={handlePasswords}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download CSV of passwords
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <Table columns={["Code", "Name", "Email", "Password", ""]}>
                {created.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="tabular-nums">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="break-all text-muted-foreground">
                      {row.email}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.temporaryPassword}
                    </TableCell>
                    <TableCell className="w-12">
                      <CopyButton
                        value={row.temporaryPassword}
                        label={`Copy password for ${row.name}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Each password is shown once. Download the file before closing.
            </p>
          </div>
        ) : null}

        <FormError>{error}</FormError>
      </div>
    </Modal>
  );
}
