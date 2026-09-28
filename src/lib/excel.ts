/*
 * Excel (.xlsx) export. ExcelJS is loaded only when an export is requested,
 * so it never weighs down page loads or the server bundle.
 */

export type ExcelColumn<Row> = {
  header: string;
  value: (row: Row) => string | number | null | undefined;
  type?: "text" | "money" | "date" | "number";
  width?: number;
  /** Add this column up in a bold totals row. Only for money/number columns. */
  total?: boolean;
};

export type ExcelSheet<Row> = {
  name: string;
  title?: string;
  subtitle?: string;
  columns: ExcelColumn<Row>[];
  rows: Row[];
};

const MONEY_FORMAT = '"R" #,##0.00;[Red]-"R" #,##0.00';
const DATE_FORMAT = "dd mmm yyyy";
const HEADER_FILL = "FFF6F7F9";
const INK = "FF14171C";
const GREY = "FF5B6472";

function isoToDate(iso: string): Date | string {
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : iso;
}

// Sheets have independent row types; `any` keeps the call site ergonomic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySheet = ExcelSheet<any>;

/** Build the .xlsx file contents. */
export async function buildWorkbook(sheets: AnySheet[]): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dr Ben Azouz MH - Practice dashboard";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31));
    let rowIndex = 1;

    if (sheet.title) {
      const cell = ws.getCell(rowIndex, 1);
      cell.value = sheet.title;
      cell.font = { bold: true, size: 14, color: { argb: INK } };
      rowIndex += 1;
    }
    if (sheet.subtitle) {
      const cell = ws.getCell(rowIndex, 1);
      cell.value = sheet.subtitle;
      cell.font = { size: 10, color: { argb: GREY } };
      rowIndex += 1;
    }
    if (sheet.title || sheet.subtitle) rowIndex += 1;

    const headerRow = rowIndex;
    sheet.columns.forEach((column, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: INK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE4E6EA" } } };
      cell.alignment = {
        vertical: "middle",
        horizontal: column.type === "money" || column.type === "number" ? "right" : "left",
      };
      ws.getColumn(i + 1).width =
        column.width ?? (column.type === "money" ? 14 : column.type === "date" ? 13 : 22);
    });

    for (const row of sheet.rows) {
      rowIndex += 1;
      sheet.columns.forEach((column, i) => {
        const raw = column.value(row);
        const cell = ws.getCell(rowIndex, i + 1);
        if (raw == null || raw === "") return;
        if (column.type === "date" && typeof raw === "string") {
          cell.value = isoToDate(raw);
          cell.numFmt = DATE_FORMAT;
        } else if (column.type === "money") {
          cell.value = Number(raw);
          cell.numFmt = MONEY_FORMAT;
        } else if (column.type === "number") {
          cell.value = Number(raw);
        } else {
          cell.value = String(raw);
        }
      });
    }

    const lastDataRow = rowIndex;
    if (sheet.columns.some((c) => c.total) && sheet.rows.length > 0) {
      rowIndex += 1;
      const label = ws.getCell(rowIndex, 1);
      label.value = "Total";
      label.font = { bold: true };
      sheet.columns.forEach((column, i) => {
        if (!column.total) return;
        const cell = ws.getCell(rowIndex, i + 1);
        const letter = ws.getColumn(i + 1).letter;
        // Cache the result too, so previews that don't calculate still show it.
        const result =
          sheet.rows.reduce(
            (sum: number, row) => sum + Math.round(Number(column.value(row) ?? 0) * 100),
            0,
          ) / 100;
        cell.value = { formula: `SUM(${letter}${headerRow + 1}:${letter}${lastDataRow})`, result };
        cell.numFmt = column.type === "money" ? MONEY_FORMAT : "0";
        cell.font = { bold: true };
        cell.border = { top: { style: "thin", color: { argb: INK } } };
      });
    }

    ws.views = [{ state: "frozen", ySplit: headerRow }];
    if (sheet.rows.length > 0) {
      ws.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: lastDataRow, column: sheet.columns.length },
      };
    }
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Build the workbook and save it through the browser's download. */
export async function downloadWorkbook(fileName: string, sheets: AnySheet[]): Promise<void> {
  const buffer = await buildWorkbook(sheets);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
