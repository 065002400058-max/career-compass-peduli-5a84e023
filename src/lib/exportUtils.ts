import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (rows: any[], filename: string, sheetName = "Data") => {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (rows: any[], filename: string, title: string) => {
  if (!rows.length) return;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Diunduh: ${new Date().toLocaleString("id-ID")}`, 14, 22);
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")));
  autoTable(doc, { head: [headers], body, startY: 26, styles: { fontSize: 7 }, headStyles: { fillColor: [16, 185, 129] } });
  doc.save(`${filename}.pdf`);
};
