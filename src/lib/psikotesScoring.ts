// Logic scoring & interpretasi untuk instrumen screening standar (PSS-10, BRS, SRQ-20).
// Catatan: hasil screening BUKAN diagnosis medis/psikologis.

export type ScreeningKind = "pss10" | "brs" | "srq20";

export interface ScreeningOutcome {
  kind: ScreeningKind | null;
  /** Skor total yang disimpan ke database (integer) */
  rawScore: number;
  /** Skor yang ditampilkan ke pengguna (BRS = rata-rata 2 desimal) */
  displayScore: string;
  level: string;
  conclusion: string;
  recommendation: string;
}

export const POSITIVE_MESSAGE =
  "Terima kasih sudah meluangkan waktu untuk mengenali kondisi diri Anda. Memahami diri sendiri adalah salah satu langkah penting untuk berkembang.";

export const DISCLAIMER =
  "Hasil screening ini bukan diagnosis medis maupun psikologis, melainkan gambaran awal kondisi Anda saat ini.";

/** Item BRS dengan skor berkebalikan (nomor urut soal) */
export const BRS_REVERSE_ITEMS = [2, 4, 6];

export function detectScreeningKind(testTitle?: string | null, categoryName?: string | null): ScreeningKind | null {
  const s = `${testTitle ?? ""} ${categoryName ?? ""}`.toLowerCase();
  if (s.includes("pss") || s.includes("perceived stress")) return "pss10";
  if (s.includes("brs") || s.includes("brief resilience") || s.includes("ketahanan") || s.includes("resilien")) return "brs";
  if (s.includes("srq") || s.includes("self rating") || s.includes("self-rating")) return "srq20";
  return null;
}

/** Skor per item setelah memperhitungkan reverse scoring (khusus BRS item 2, 4, 6). */
export function itemScore(kind: ScreeningKind | null, orderNumber: number, score: number): number {
  if (kind === "brs" && BRS_REVERSE_ITEMS.includes(orderNumber)) return 6 - score;
  return score;
}

function pss10(total: number) {
  if (total <= 13)
    return {
      level: "Tingkat Stres Rendah",
      conclusion:
        "Tingkat stres Anda saat ini berada pada kategori rendah. Ini menunjukkan bahwa secara umum Anda mampu menghadapi berbagai tekanan dengan cukup baik.",
      recommendation:
        "Pertahankan kebiasaan positif yang sudah Anda lakukan. Tetap luangkan waktu untuk beristirahat, melakukan aktivitas yang Anda sukai, menjaga pola tidur, dan tetap terhubung dengan orang-orang yang mendukung Anda.",
    };
  if (total <= 26)
    return {
      level: "Tingkat Stres Sedang",
      conclusion:
        "Tingkat stres Anda berada pada kategori sedang. Beberapa tekanan mungkin mulai memengaruhi keseharian Anda, sehingga penting untuk memberikan perhatian lebih pada kondisi diri.",
      recommendation:
        "Cobalah mengatur waktu istirahat, melakukan aktivitas yang membuat Anda rileks, mengatur prioritas, dan berbicara dengan orang yang Anda percaya ketika merasa terbebani. Anda tidak harus menghadapi semuanya sendirian.",
    };
  return {
    level: "Tingkat Stres Tinggi",
    conclusion:
      "Tingkat stres Anda berada pada kategori tinggi. Hasil ini menunjukkan bahwa Anda mungkin sedang menghadapi tekanan yang cukup berat.",
    recommendation:
      "Berikan ruang untuk diri sendiri dan jangan ragu mencari dukungan. Anda dapat berbicara dengan konselor atau tenaga profesional untuk membantu memahami kondisi dan menemukan langkah yang sesuai.",
  };
}

function brs(mean: number) {
  if (mean < 3)
    return {
      level: "Resiliensi Rendah",
      conclusion:
        "Hasil menunjukkan bahwa kemampuan Anda untuk bangkit dan pulih setelah menghadapi situasi sulit saat ini berada pada kategori resiliensi rendah.",
      recommendation:
        "Ini bukan berarti Anda lemah. Setiap orang memiliki cara dan waktu yang berbeda dalam menghadapi kesulitan. Cobalah membangun dukungan dari orang-orang yang dipercaya, memberikan waktu untuk beristirahat, dan menghadapi masalah secara bertahap.",
    };
  if (mean <= 4.3)
    return {
      level: "Resiliensi Normal",
      conclusion:
        "Hasil menunjukkan bahwa kemampuan Anda untuk bangkit dan beradaptasi setelah menghadapi situasi sulit berada pada kategori normal.",
      recommendation:
        "Pertahankan kemampuan positif yang sudah Anda miliki. Tetap jaga hubungan dengan orang-orang yang mendukung Anda, belajar dari pengalaman, dan berikan waktu bagi diri sendiri ketika menghadapi tantangan.",
    };
  return {
    level: "Resiliensi Tinggi",
    conclusion:
      "Hasil menunjukkan bahwa Anda memiliki kemampuan resiliensi yang tinggi dalam menghadapi dan bangkit dari situasi sulit.",
    recommendation:
      "Pertahankan kekuatan positif ini. Gunakan pengalaman yang Anda miliki untuk terus berkembang, tetap terbuka terhadap dukungan orang lain, dan jangan lupa memberikan waktu untuk diri sendiri ketika menghadapi tekanan.",
  };
}

function srq20(total: number) {
  if (total > 5)
    return {
      level: "Ada kemungkinan gejala cemas/depresi",
      conclusion:
        "Hasil menunjukkan adanya kemungkinan gejala yang berkaitan dengan kecemasan atau depresi. Hasil ini bukan diagnosis, tetapi dapat menjadi tanda bahwa kondisi Anda perlu mendapatkan perhatian lebih.",
      recommendation:
        "Anda tidak perlu menghadapi semuanya sendirian. Pertimbangkan untuk berbicara dengan konselor atau tenaga profesional agar Anda mendapatkan dukungan dan pemahaman yang lebih sesuai dengan kondisi Anda.",
    };
  return {
    level: "Tidak melewati batas interpretasi",
    conclusion:
      "Berdasarkan skor yang diperoleh, hasil Anda berada pada atau di bawah batas interpretasi yang digunakan dalam sistem ini.",
    recommendation:
      "Terus jaga kesehatan mental dan keseimbangan aktivitas sehari-hari. Jika Anda tetap merasa tidak nyaman, terganggu, atau memiliki kekhawatiran tertentu, jangan ragu untuk berbicara dengan konselor.",
  };
}

/** BRS: rata-rata dari total skor (setelah reverse) dibagi jumlah item (default 6) */
export function brsMean(total: number, itemCount = 6): number {
  const n = itemCount > 0 ? itemCount : 6;
  return Math.round((total / n) * 100) / 100;
}

/**
 * Interpretasi berdasarkan JENIS TES (bukan nama kategori saja).
 * `total` = jumlah skor item (untuk BRS sudah termasuk reverse scoring).
 */
export function interpretScreening(
  kind: ScreeningKind | null,
  total: number,
  itemCount = 6
): Omit<ScreeningOutcome, "kind" | "rawScore"> | null {
  if (kind === "pss10") return { displayScore: String(total), ...pss10(total) };
  if (kind === "srq20") return { displayScore: String(total), ...srq20(total) };
  if (kind === "brs") {
    const mean = brsMean(total, itemCount);
    return { displayScore: mean.toFixed(2), ...brs(mean) };
  }
  return null;
}

/** Skor yang ditampilkan untuk daftar admin */
export function formatScore(kind: ScreeningKind | null, total: number, itemCount = 6): string {
  return kind === "brs" ? brsMean(total, itemCount).toFixed(2) : String(total);
}
