// Template email undangan Career Center PEDULI (inline CSS, email-safe).
// Dipakai oleh Edge Function invite-user. Tidak ada branding pihak ketiga.

export type InviteRole = "santri" | "alumni" | "admin";

const GREEN = "#0B5132";
const GREEN_DARK = "#08402A";
const GOLD = "#C99A2E";
const TEXT = "#374151";

type Copy = {
  subject: string;
  badge: string;
  title: string;
  paragraph: string;
  cta: string;
};

const COPY: Record<InviteRole, Copy> = {
  santri: {
    subject: "Undangan Bergabung sebagai Santri | Career Center PEDULI",
    badge: "UNDANGAN RESMI",
    title: "Selamat! Anda Telah Diundang sebagai Santri",
    paragraph:
      "Anda telah diundang untuk bergabung sebagai Santri di Career Center PEDULI. Aktifkan akun Anda untuk mengakses informasi karier, pelatihan, asesmen, lowongan, serta berbagai layanan pengembangan karier.",
    cta: "Aktifkan Akun Santri",
  },
  alumni: {
    subject: "Undangan Bergabung sebagai Alumni | Career Center PEDULI",
    badge: "UNDANGAN RESMI",
    title: "Selamat! Anda Telah Diundang sebagai Alumni",
    paragraph:
      "Anda telah diundang untuk bergabung sebagai Alumni di Career Center PEDULI. Aktifkan akun Anda untuk membangun profil profesional, mengakses peluang karier, berbagi pengalaman, dan terhubung dengan jejaring alumni.",
    cta: "Aktifkan Akun Alumni",
  },
  admin: {
    subject: "Undangan Akses Admin | Career Center PEDULI",
    badge: "AKSES RESMI",
    title: "Undangan Akses Admin Career Center PEDULI",
    paragraph:
      "Anda telah diberikan akses sebagai Admin Career Center PEDULI. Aktifkan akun Anda untuk mulai mengelola sistem sesuai dengan hak akses yang diberikan.",
    cta: "Aktifkan Akun Admin",
  },
};

const SECOND_PARAGRAPH: Record<InviteRole, string> = {
  santri: "Klik tombol di bawah ini untuk mengaktifkan akun dan mulai menjelajahi peluang karier Anda.",
  alumni: "Klik tombol di bawah ini untuk mengaktifkan akun dan mulai menggunakan layanan Career Center PEDULI.",
  admin: "Klik tombol di bawah ini untuk mengaktifkan akun Admin Anda.",
};

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const inviteSubject = (role: InviteRole) => COPY[role].subject;

export const renderInviteEmail = (opts: {
  role: InviteRole;
  fullName?: string | null;
  actionUrl: string;
  appUrl: string;
}) => {
  const c = COPY[opts.role];
  const name = (opts.fullName ?? "").trim();
  const greeting = name ? `Assalamu’alaikum, ${escapeHtml(name)}` : "Assalamu’alaikum";
  const logo = `${opts.appUrl}/favicon.png`;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(c.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="660" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:660px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);font-family:Arial,Helvetica,sans-serif;">

    <!-- Header -->
    <tr><td style="background-color:${GREEN};padding:26px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" style="vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:12px;vertical-align:middle;">
                <img src="${logo}" width="46" height="46" alt="Career Center PEDULI" style="display:block;width:46px;height:46px;border:0;" />
              </td>
              <td style="vertical-align:middle;">
                <div style="color:#FFFFFF;font-size:14px;line-height:18px;letter-spacing:0.2px;">Career Center</div>
                <div style="color:#FFFFFF;font-size:24px;line-height:28px;font-weight:bold;letter-spacing:1px;">PEDULI</div>
              </td>
            </tr></table>
          </td>
          <td align="right" style="vertical-align:middle;color:${GREEN_DARK};font-size:26px;line-height:26px;letter-spacing:2px;">&#9671;&#9671;&#9671;</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="background-color:${GOLD};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

    <!-- Body -->
    <tr><td align="center" style="padding:32px 34px 8px 34px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border:1px solid ${GOLD};border-radius:999px;padding:7px 18px;color:${GOLD};font-size:11px;font-weight:bold;letter-spacing:1.4px;">
          ${escapeHtml(c.badge)}
        </td>
      </tr></table>
    </td></tr>

    <tr><td align="center" style="padding:22px 34px 0 34px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="104" style="background-color:#EAF3EC;border-radius:52px;"><tr>
        <td align="center" height="104" style="height:104px;font-size:44px;line-height:44px;">&#9993;&#65039;</td>
      </tr></table>
    </td></tr>

    <tr><td align="center" style="padding:22px 34px 0 34px;">
      <h1 style="margin:0;color:${GREEN};font-size:25px;line-height:32px;font-weight:bold;">${escapeHtml(c.title)}</h1>
    </td></tr>

    <tr><td align="center" style="padding:16px 40px 0 40px;color:${TEXT};font-size:15px;line-height:24px;">
      <p style="margin:0 0 14px 0;font-weight:bold;color:${GREEN};">${greeting}</p>
      <p style="margin:0 0 14px 0;">${escapeHtml(c.paragraph)}</p>
      <p style="margin:0;">${escapeHtml(SECOND_PARAGRAPH[opts.role])}</p>
    </td></tr>

    <!-- CTA -->
    <tr><td align="center" style="padding:28px 34px 0 34px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="background-color:${GREEN};border-radius:10px;">
          <a href="${opts.actionUrl}" style="display:inline-block;padding:15px 34px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            ${escapeHtml(c.cta)} &nbsp;<span style="color:${GOLD};">&#8594;</span>
          </a>
        </td>
      </tr></table>
    </td></tr>

    <!-- Security note -->
    <tr><td style="padding:26px 34px 0 34px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDF7EF;border-radius:12px;"><tr>
        <td style="padding:14px 18px;color:#2F5F45;font-size:12.5px;line-height:20px;">
          &#128274;&nbsp; Tautan undangan ini hanya dapat digunakan oleh penerima dan berlaku selama 24 jam.
          Abaikan email ini jika Anda tidak merasa menerima undangan.
        </td>
      </tr></table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:26px 34px 30px 34px;">
      <div style="border-top:1px solid #E5E7EB;padding-top:18px;text-align:center;color:#6B7280;font-size:12px;line-height:20px;">
        <p style="margin:0 0 4px 0;">&#127911;&nbsp; Butuh bantuan? Hubungi <strong style="color:${GREEN};">Tim Career Center PEDULI</strong></p>
        <p style="margin:0 0 4px 0;">
          <a href="${opts.appUrl}" style="color:${GREEN};text-decoration:none;">pedulismartcareer-daarululuumlido.com</a>
        </p>
        <p style="margin:0;">&#169; ${year} Career Center PEDULI. Semua hak dilindungi.</p>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
};

export const inviteEmailText = (opts: {
  role: InviteRole;
  fullName?: string | null;
  actionUrl: string;
}) => {
  const c = COPY[opts.role];
  const name = (opts.fullName ?? "").trim();
  return [
    name ? `Assalamu'alaikum, ${name}` : "Assalamu'alaikum",
    "",
    c.paragraph,
    SECOND_PARAGRAPH[opts.role],
    "",
    `${c.cta}: ${opts.actionUrl}`,
    "",
    "Tautan undangan ini hanya dapat digunakan oleh penerima dan berlaku selama 24 jam.",
    "Career Center PEDULI",
  ].join("\n");
};
