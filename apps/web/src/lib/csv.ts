/** Download rows as CSV (semicolon-separated so Indonesian Excel opens it cleanly). */
export function downloadCSV(
  filename: string,
  rows: (string | number | null | undefined)[][],
) {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
