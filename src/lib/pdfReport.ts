import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { assetUrl } from "@/lib/assetUrl";

import duLogo from "@/assets/du-logo-t.png.asset.json";
import yayasanLogo from "@/assets/yayasan-logo-t.png.asset.json";
import trisaktiLogo from "@/assets/trisakti-logo-t.png.asset.json";
import diktiLogo from "@/assets/dikti-logo-t.png.asset.json";
import tutwuriLogo from "@/assets/tutwuri-logo-t.png.asset.json";
import bimaLogo from "@/assets/bima-logo-full.png.asset.json";

/* ---------------- PEDULI report design tokens ---------------- */
export const PEDULI = {
  emerald: [19, 139, 105] as [number, number, number],
  deep: [7, 94, 75] as [number, number, number],
  light: [232, 247, 242] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  greyBg: [246, 248, 247] as [number, number, number],
  greyText: [71, 85, 105] as [number, number, number],
  gold: [229, 161, 26] as [number, number, number],
  border: [222, 230, 226] as [number, number, number],
};

const LOVABLE_ORIGIN = "https://career-compass-peduli.lovable.app";
const LOGOS = [duLogo, yayasanLogo, trisaktiLogo, diktiLogo, bimaLogo, tutwuriLogo];

const resolve = (url: string) =>
  url.startsWith("/__l5e/") && typeof window === "undefined" ? `${LOVABLE_ORIGIN}${url}` : assetUrl(url);

type LoadedLogo = { data: string; ratio: number };
let logoCache: LoadedLogo[] | null = null;

const toDataUrl = async (url: string): Promise<LoadedLogo | null> => {
  try {
    const res = await fetch(resolve(url));
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 =
      typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
    // read intrinsic size (PNG header) to keep aspect ratio — never squash logos
    let ratio = 1;
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      if (w > 0 && h > 0) ratio = w / h;
    }
    return { data: `data:image/png;base64,${b64}`, ratio };
  } catch {
    return null;
  }
};

export const preloadReportLogos = async (): Promise<LoadedLogo[]> => {
  if (logoCache) return logoCache;
  const loaded = await Promise.all(LOGOS.map((l: any) => toDataUrl(l.url)));
  logoCache = loaded.filter(Boolean) as LoadedLogo[];
  return logoCache;
};

/* ---------------- types ---------------- */
export type SummaryCard = { label: string; value: string | number; hint?: string };
export type DonutSlice = { label: string; value: number; color?: [number, number, number] };
export type BarItem = { label: string; value: number };

export type ReportOptions = {
  badge?: string;
  subtitle?: string;
  meta?: Record<string, string | number | undefined | null>;
  summary?: SummaryCard[];
  donut?: { title: string; slices: DonutSlice[] };
  bars?: { title: string; items: BarItem[] };
  note?: { title: string; text: string };
  orientation?: "portrait" | "landscape" | "auto";
  reportKind?: string;
};

/* ---------------- primitives ---------------- */
const setFill = (doc: jsPDF, c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
const setText = (doc: jsPDF, c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

const roundedCard = (doc: jsPDF, x: number, y: number, w: number, h: number, fill = PEDULI.white) => {
  setFill(doc, fill);
  setDraw(doc, PEDULI.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
};

const HEADER_H = 21;

const drawHeader = (doc: jsPDF, logos: LoadedLogo[], pageW: number, margin: number) => {
  setFill(doc, PEDULI.white);
  doc.rect(0, 0, pageW, HEADER_H, "F");

  const logoH = 9;
  let x = margin;
  const y = (HEADER_H - logoH) / 2 - 0.5;
  logos.forEach((l) => {
    const w = Math.min(logoH * l.ratio, 20);
    try {
      doc.addImage(l.data, "PNG", x, y, w, logoH, undefined, "FAST");
    } catch {
      /* ignore broken logo */
    }
    x += w + 4;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, [15, 23, 42]);
  const right = pageW - margin;
  const peduli = "PEDULI";
  const wP = doc.getTextWidth(peduli);
  doc.setFont("helvetica", "bold");
  setText(doc, PEDULI.emerald);
  doc.text(peduli, right, 12.5, { align: "right" });
  setText(doc, [15, 23, 42]);
  doc.text("Career Center ", right - wP - 1, 12.5, { align: "right" });

  setDraw(doc, PEDULI.border);
  doc.setLineWidth(0.3);
  doc.line(0, HEADER_H, pageW, HEADER_H);
  setDraw(doc, PEDULI.emerald);
  doc.setLineWidth(0.8);
  doc.line(0, HEADER_H + 0.4, pageW * 0.72, HEADER_H + 0.4);
  setDraw(doc, PEDULI.gold);
  doc.line(pageW * 0.72, HEADER_H + 0.4, pageW, HEADER_H + 0.4);
};

const drawFooter = (
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
  kind: string,
  dateStr: string,
  page: number,
  total: number
) => {
  const y = pageH - 12;
  setDraw(doc, PEDULI.emerald);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW * 0.6, y);
  setDraw(doc, PEDULI.gold);
  doc.line(pageW * 0.6, y, pageW - margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, PEDULI.greyText);
  doc.text(`Career Center PEDULI  •  ${kind}`, margin, y + 5);
  doc.text(dateStr, pageW / 2, y + 5, { align: "center" });
  doc.text(`Halaman ${page} dari ${total}`, pageW - margin, y + 5, { align: "right" });
};

const fmtDateId = (d = new Date()) =>
  `${d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • ${d
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(".", ":")} WIB`;

const drawHero = (
  doc: jsPDF,
  title: string,
  opts: ReportOptions,
  pageW: number,
  margin: number,
  startY: number
) => {
  let y = startY;

  // badge
  const badge = (opts.badge ?? "LAPORAN SISTEM").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const bw = doc.getTextWidth(badge) + 8;
  setFill(doc, PEDULI.emerald);
  doc.roundedRect(margin, y, bw, 6.4, 3.2, 3.2, "F");
  setText(doc, PEDULI.white);
  doc.text(badge, margin + 4, y + 4.3);
  y += 13;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  setText(doc, PEDULI.deep);
  const titleLines = doc.splitTextToSize(title, pageW - margin * 2 - 10);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8.4;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setText(doc, PEDULI.greyText);
    doc.text(doc.splitTextToSize(opts.subtitle, pageW - margin * 2 - 10), margin, y);
    y += 6;
  }

  doc.setFontSize(9);
  setText(doc, PEDULI.greyText);
  doc.text(fmtDateId(), margin, y);
  y += 4;

  const metaEntries = Object.entries(opts.meta ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && String(v).length > 0
  );
  if (metaEntries.length) {
    doc.setFontSize(8.5);
    const line = metaEntries.map(([k, v]) => `${k}: ${v}`).join("   •   ");
    doc.text(doc.splitTextToSize(line, pageW - margin * 2), margin, y + 3.5);
    y += 4.5 + 3.5;
  }

  setDraw(doc, PEDULI.gold);
  doc.setLineWidth(1.2);
  doc.line(margin, y + 2, margin + 22, y + 2);

  return y + 9;
};

const drawSummaryCards = (
  doc: jsPDF,
  cards: SummaryCard[],
  pageW: number,
  margin: number,
  y: number
) => {
  if (!cards.length) return y;
  const perRow = Math.min(4, cards.length);
  const gap = 5;
  const cardW = (pageW - margin * 2 - gap * (perRow - 1)) / perRow;
  const cardH = 22;
  cards.slice(0, 8).forEach((c, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    roundedCard(doc, x, cy, cardW, cardH);
    setFill(doc, PEDULI.emerald);
    doc.roundedRect(x, cy, 1.6, cardH, 0.8, 0.8, "F");
    setFill(doc, PEDULI.light);
    doc.roundedRect(x + 5, cy + 5.5, 7, 7, 2, 2, "F");
    setFill(doc, PEDULI.emerald);
    doc.roundedRect(x + 7, cy + 10.4, 1.3, 2.6, 0.6, 0.6, "F");
    doc.roundedRect(x + 9, cy + 8.6, 1.3, 4.4, 0.6, 0.6, "F");
    setFill(doc, PEDULI.gold);
    doc.roundedRect(x + 11, cy + 7.4, 1.3, 5.6, 0.6, 0.6, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, PEDULI.greyText);
    doc.text(doc.splitTextToSize(c.label, cardW - 18)[0], x + 15, cy + 8.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    setText(doc, PEDULI.deep);
    doc.text(String(c.value), x + 15, cy + 16.4);
    if (c.hint) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setText(doc, PEDULI.greyText);
      doc.text(doc.splitTextToSize(c.hint, cardW - 18)[0], x + 15, cy + 20);
    }
  });
  const rows = Math.ceil(Math.min(cards.length, 8) / perRow);
  return y + rows * (cardH + gap) + 3;
};

const CHART_COLORS: [number, number, number][] = [
  PEDULI.emerald,
  PEDULI.deep,
  PEDULI.gold,
  [125, 190, 170],
  [180, 205, 196],
];

const drawDonut = (
  doc: jsPDF,
  cfg: { title: string; slices: DonutSlice[] },
  x: number,
  y: number,
  w: number,
  h: number
) => {
  roundedCard(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setText(doc, PEDULI.deep);
  doc.text(cfg.title, x + 6, y + 8);

  const total = cfg.slices.reduce((s, v) => s + (v.value || 0), 0) || 1;
  const cx = x + 26;
  const cy = y + h / 2 + 3;
  const rOuter = 15;
  const rInner = 9;
  let start = -90;
  cfg.slices.forEach((s, i) => {
    const sweep = (s.value / total) * 360;
    const col = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
    setFill(doc, col);
    setDraw(doc, col);
    doc.setLineWidth(0.2);
    // filled sector built from an overlapping triangle fan (no seams, print-safe)
    for (let a = start; a < start + sweep - 0.001; a += 3) {
      const a2 = Math.min(a + 3.4, start + sweep);
      const r1 = (a * Math.PI) / 180;
      const r2 = (a2 * Math.PI) / 180;
      doc.triangle(
        cx,
        cy,
        cx + rOuter * Math.cos(r1),
        cy + rOuter * Math.sin(r1),
        cx + rOuter * Math.cos(r2),
        cy + rOuter * Math.sin(r2),
        "FD"
      );
    }
    start += sweep;
  });
  // hole
  setFill(doc, PEDULI.white);
  setDraw(doc, PEDULI.white);
  doc.circle(cx, cy, rInner, "FD");

  const main = cfg.slices[0];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, PEDULI.deep);
  doc.text(`${Math.round(((main?.value ?? 0) / total) * 100)}%`, cx, cy + 1.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setText(doc, PEDULI.greyText);
  doc.text(main?.label ?? "", cx, cy + 5.5, { align: "center" });

  let ly = y + 16;
  cfg.slices.slice(0, 4).forEach((s, i) => {
    const col = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
    setFill(doc, col);
    doc.circle(cx + 24, ly - 1, 1.4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, PEDULI.greyText);
    doc.text(
      `${doc.splitTextToSize(s.label, w - 62)[0]}  ${s.value} (${Math.round((s.value / total) * 100)}%)`,
      cx + 28,
      ly
    );
    ly += 6;
  });
};

const drawBars = (
  doc: jsPDF,
  cfg: { title: string; items: BarItem[] },
  x: number,
  y: number,
  w: number,
  h: number
) => {
  roundedCard(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setText(doc, PEDULI.deep);
  doc.text(cfg.title, x + 6, y + 8);

  const items = cfg.items.slice(0, 5);
  const max = Math.max(...items.map((i) => i.value), 1);
  const barX = x + 6 + 34;
  const barW = w - (barX - x) - 18;
  let by = y + 16;
  items.forEach((it) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, PEDULI.greyText);
    doc.text(doc.splitTextToSize(it.label, 32)[0], x + 6, by + 3);
    setFill(doc, PEDULI.light);
    doc.roundedRect(barX, by, barW, 4.5, 2.2, 2.2, "F");
    setFill(doc, PEDULI.emerald);
    const fw = Math.max((it.value / max) * barW, 2);
    doc.roundedRect(barX, by, fw, 4.5, 2.2, 2.2, "F");
    doc.setFont("helvetica", "bold");
    setText(doc, PEDULI.deep);
    doc.text(String(it.value), barX + barW + 3, by + 3.6);
    by += 8.5;
  });
};

const drawNote = (
  doc: jsPDF,
  note: { title: string; text: string },
  pageW: number,
  margin: number,
  y: number
) => {
  const w = pageW - margin * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(note.text, w - 32);
  const h = Math.max(20, 14 + lines.length * 4.2);
  setFill(doc, PEDULI.light);
  setDraw(doc, PEDULI.emerald);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, w, h, 3, 3, "FD");
  setFill(doc, PEDULI.white);
  doc.roundedRect(margin + 6, y + (h - 10) / 2, 10, 10, 2.5, 2.5, "F");
  setDraw(doc, PEDULI.emerald);
  doc.setLineWidth(0.5);
  doc.line(margin + 9, y + h / 2 - 2, margin + 13, y + h / 2 - 2);
  doc.line(margin + 9, y + h / 2, margin + 13, y + h / 2);
  doc.line(margin + 9, y + h / 2 + 2, margin + 12, y + h / 2 + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, PEDULI.deep);
  doc.text(note.title, margin + 22, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(doc, PEDULI.greyText);
  doc.text(lines, margin + 22, y + 15);
  return y + h + 6;
};

/* ---------------- main entry ---------------- */
export const generateReportPdf = async (
  rows: Record<string, any>[],
  title: string,
  opts: ReportOptions = {}
): Promise<jsPDF> => {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const orientation =
    opts.orientation && opts.orientation !== "auto"
      ? opts.orientation
      : headers.length > 6
        ? "landscape"
        : "portrait";

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = orientation === "landscape" ? 14 : 16;

  setFill(doc, PEDULI.greyBg);
  doc.rect(0, 0, pageW, pageH, "F");

  const logos = await preloadReportLogos();
  const kind = opts.reportKind ?? "Laporan Sistem";
  const dateShort = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  let y = drawHero(doc, title, opts, pageW, margin, HEADER_H + 12);

  const cards: SummaryCard[] = opts.summary?.length
    ? opts.summary
    : [{ label: "Total Data", value: rows.length, hint: "baris dalam laporan ini" }];
  y = drawSummaryCards(doc, cards, pageW, margin, y);

  if (opts.donut || opts.bars) {
    const gap = 5;
    const h = 44;
    const both = !!opts.donut && !!opts.bars;
    const w = both ? (pageW - margin * 2 - gap) / 2 : pageW - margin * 2;
    let cx = margin;
    if (opts.donut) {
      drawDonut(doc, opts.donut, cx, y, w, h);
      cx += w + gap;
    }
    if (opts.bars) drawBars(doc, opts.bars, cx, y, w, h);
    y += h + 6;
  }

  let firstTablePage = true;
  if (rows.length) {
    const body = rows.map((r) => headers.map((h) => String(r[h] ?? "-")));
    autoTable(doc, {
      head: [headers],
      body,
      startY: y,
      margin: { left: margin, right: margin, top: HEADER_H + 10, bottom: 24 },
      rowPageBreak: "auto",
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: orientation === "landscape" ? 7.6 : 8.2,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 },
        textColor: PEDULI.greyText,
        lineColor: PEDULI.border,
        lineWidth: 0.1,
        overflow: "linebreak",
        minCellWidth: 14,
        valign: "middle",
      },
      headStyles: {
        fillColor: PEDULI.emerald,
        textColor: PEDULI.white,
        fontStyle: "bold",
        fontSize: orientation === "landscape" ? 7.6 : 8.2,
        cellPadding: { top: 3, bottom: 3, left: 2.6, right: 2.6 },
        lineWidth: 0,
      },
      alternateRowStyles: { fillColor: [244, 251, 248] },
      bodyStyles: { fillColor: PEDULI.white },
      tableLineColor: PEDULI.border,
      tableLineWidth: 0,
      willDrawPage: () => {
        if (firstTablePage) {
          firstTablePage = false;
          return;
        }
        setFill(doc, PEDULI.greyBg);
        doc.rect(0, 0, pageW, pageH, "F");
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const v = String(data.cell.raw ?? "");
          if (/^(SANTRI|ALUMNI|MITRA|Lulus|Tidak Lulus|PTN|PTS)$/i.test(v.trim())) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = /tidak/i.test(v) ? [176, 108, 20] : PEDULI.deep;
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 7;
  }

  if (opts.note) {
    if (y + 30 > pageH - 20) {
      doc.addPage();
      setFill(doc, PEDULI.greyBg);
      doc.rect(0, 0, pageW, pageH, "F");
      y = HEADER_H + 12;
    }
    drawNote(doc, opts.note, pageW, margin, y);
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawHeader(doc, logos, pageW, margin);
    drawFooter(doc, pageW, pageH, margin, kind, dateShort, p, total);
  }

  return doc;
};

export const downloadReportPdf = async (
  rows: Record<string, any>[],
  filename: string,
  title: string,
  opts: ReportOptions = {}
) => {
  const doc = await generateReportPdf(rows, title, opts);
  doc.save(`${filename}.pdf`);
};
