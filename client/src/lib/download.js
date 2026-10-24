// A blob from axios or a CSV built here is saved through the same anchor, so
// downloads behave the same in every browser.
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const saveCsv = (rows, filename) => {
  const text = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  saveBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), filename);
};

export const filenameFromDisposition = (header, fallback) => {
  const match = typeof header === "string" ? header.match(/filename="?([^";]+)"?/) : null;
  return match?.[1] || fallback;
};
