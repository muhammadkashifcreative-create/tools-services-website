// EMAIL_FROM must be an address on a domain verified in Resend
// (Resend dashboard → Domains). Falls back to the site domain.
const FROM = process.env.EMAIL_FROM ?? "Social Padu <noreply@socialpadu.my>";
const FROM_SUPPORT = process.env.EMAIL_FROM_SUPPORT ?? process.env.EMAIL_FROM ?? "Social Padu Support <noreply@socialpadu.my>";
const BASE_URL = "https://www.socialpadu.my";
const LOGO_URL = "https://www.socialpadu.my/logo.png";
const FAVICON_URL = "https://www.socialpadu.my/favicon.png";

async function sendEmail(to: string, subject: string, html: string, from = FROM) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Master layout — matches auth page theme ──────────────────────────────────

function layout(preheader: string, accentLabel: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Social Padu</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#fff8f3;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<!-- Warm peach background matching auth page -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:linear-gradient(160deg,#fff3e8 0%,#fff8f3 40%,#fef9f5 70%,#fff3e8 100%);">
<tr><td align="center" style="padding:44px 16px 60px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

  <!-- Logo -->
  <tr><td align="center" style="padding-bottom:28px;">
    <a href="${BASE_URL}" style="text-decoration:none;">
      <img src="${LOGO_URL}" alt="Social Padu" width="150" height="auto" style="display:block;border:0;max-width:150px;"/>
    </a>
  </td></tr>

  <!-- Card glow ring (fake with a coloured table behind the card) -->
  <tr><td style="background:linear-gradient(135deg,#e07b2e,#c8621f);border-radius:24px;padding:2px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#ffffff;border-radius:22px;overflow:hidden;">

      <!-- Orange stripe top -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#e07b2e,#f59e0b,#e07b2e);font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Dark header matching auth page card top -->
      <tr><td style="background:#1a1a2e;padding:22px 40px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <img src="${FAVICON_URL}" alt="" width="18" height="18" style="display:inline-block;vertical-align:middle;border-radius:4px;border:0;margin-right:8px;"/>
              <span style="color:#e07b2e;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;vertical-align:middle;">${accentLabel}</span>
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <span style="color:#334155;font-size:11px;">socialpadu.my</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:40px 40px 32px;background:#ffffff;">${body}</td></tr>

      <!-- Footer -->
      <tr><td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;border-radius:0 0 22px 22px;">
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
          &copy; ${new Date().getFullYear()} Social Padu &middot;
          <a href="${BASE_URL}" style="color:#e07b2e;text-decoration:none;font-weight:600;">socialpadu.my</a>
          &middot; <a href="${BASE_URL}/privacy" style="color:#94a3b8;text-decoration:none;">Privacy</a>
        </p>
        <p style="margin:0;font-size:11px;color:#cbd5e1;">You received this because you have a Social Padu account.</p>
      </td></tr>

    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Components ────────────────────────────────────────────────────────────────

function heroIcon(emoji: string, bg: string) {
  return `<div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;width:76px;height:76px;border-radius:50%;background:${bg};line-height:76px;font-size:34px;text-align:center;box-shadow:0 4px 20px rgba(224,123,46,0.15);">${emoji}</div>
  </div>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.25;">${text}</h1>`;
}

function subtitle(text: string) {
  return `<p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.7;">${text}</p>`;
}

function cta(label: string, url: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e07b2e 0%,#c8621f 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;letter-spacing:0.02em;padding:17px 44px;border-radius:50px;box-shadow:0 6px 24px rgba(224,123,46,0.45);">${label}</a>
    </td></tr>
  </table>`;
}

function alertBox(text: string, type: "warning" | "info" | "success") {
  const styles = {
    warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "⚠️" },
    info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", icon: "ℹ️" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "✅" },
  }[type];
  return `<div style="background:${styles.bg};border:1px solid ${styles.border};border-left:3px solid ${styles.border};border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:${styles.text};line-height:1.6;">
    <span style="margin-right:6px;">${styles.icon}</span>${text}
  </div>`;
}

function infoCard(rows: [string, string][]) {
  const rowsHtml = rows.map(([label, value], i) => `
    <tr>
      <td style="padding:12px 20px;background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};font-size:13px;color:#64748b;width:38%;border-bottom:1px solid #f1f5f9;">${label}</td>
      <td style="padding:12px 20px;background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${value}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">${rowsHtml}</table>`;
}

function featureRow(emoji: string, title: string, desc: string) {
  return `<tr>
    <td style="padding:12px 0;vertical-align:top;width:44px;">
      <div style="width:36px;height:36px;border-radius:8px;background:#fff7ed;text-align:center;line-height:36px;font-size:18px;">${emoji}</div>
    </td>
    <td style="padding:12px 0 12px 12px;vertical-align:top;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">${title}</p>
      <p style="margin:0;font-size:13px;color:#64748b;">${desc}</p>
    </td>
  </tr>`;
}

// ─── Templates ─────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const body = `
    ${heroIcon("✉️", "#fff7ed")}
    ${h1("Verify your email address")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, thanks for joining Social Padu! Click the button below to activate your account and get started.`)}
    ${alertBox("<strong>Link expires in 24 hours.</strong> If it expires, simply sign up again to receive a new one.", "warning")}
    ${cta("✓ &nbsp;Verify Email Address", verifyUrl)}
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Or copy this link into your browser:<br/>
    <span style="color:#64748b;word-break:break-all;">${verifyUrl}</span></p>
  `;
  await sendEmail(to, "Verify your Social Padu email address", layout("Please verify your email to activate your account", "Email Verification", body));
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const body = `
    ${heroIcon("🔐", "#fef9c3")}
    ${h1("Reset your password")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, we received a request to reset your Social Padu password. Click the button below to choose a new one.`)}
    ${alertBox("<strong>This link expires in 1 hour</strong> and can only be used once for security.", "warning")}
    ${cta("Reset My Password →", resetUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Didn't request a password reset? No action is needed — your account is safe.</p>
  `;
  await sendEmail(to, "Reset your Social Padu password", layout("Password reset requested for your account", "Security", body));
}

export async function sendWelcomeEmail(to: string, name: string) {
  const body = `
    ${heroIcon("🎉", "#f0fdf4")}
    ${h1(`Welcome to Social Padu, ${name || "there"}!`)}
    ${subtitle("Your account is ready. Here's everything you can do — starting right now.")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
      ${featureRow("📚", "Guide books", "Step-by-step PDF books for Excel, Photoshop, Python, AI tools and more.")}
      ${featureRow("⚡", "Instant download", "Your book is ready the second payment clears.")}
      ${featureRow("🔒", "Secure checkout", "Card payments handled end-to-end by Stripe. No card stored.")}
      ${featureRow("♾️", "Yours for life", "Every book stays in your library — re-download any time.")}
    </table>
    ${cta("Browse the Library →", `${BASE_URL}/books`)}
  `;
  await sendEmail(to, "Welcome to Social Padu 🎉", layout("Your account is ready to use", "Welcome", body));
}

export async function sendBookPurchaseEmail(to: string, name: string, bookTitle: string, amountUsd: number, delivered: boolean) {
  if (!delivered) {
    const body = `
      ${heroIcon("📦", "#fff7ed")}
      ${h1("Payment received — delivery on the way")}
      ${subtitle(`Hi <strong>${name || "there"}</strong>, thanks for your purchase! Your book is being prepared and will appear in your library shortly. We'll email you the moment it's ready to download.`)}
      ${infoCard([
        ["Book", bookTitle],
        ["Amount paid", `$${amountUsd.toFixed(2)} USD`],
        ["Delivery", `<span style="color:#b45309;font-weight:700;">Being prepared</span>`],
        ["Date & time", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" })],
      ])}
      ${cta("View My Library →", `${BASE_URL}/dashboard/library`)}
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Questions? Open a support case from your dashboard and we'll help right away.</p>
    `;
    await sendEmail(to, `📦 Order received — "${bookTitle}" is being prepared`, layout(`We're preparing "${bookTitle}" for you`, "Order Received", body));
    return;
  }
  const body = `
    ${heroIcon("📚", "#f0fdf4")}
    ${h1("Your book is ready!")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, thanks for your purchase. Your guide book is waiting in your library — download it any time, as often as you like.`)}
    ${infoCard([
      ["Book", bookTitle],
      ["Amount paid", `$${amountUsd.toFixed(2)} USD`],
      ["Delivery", "PDF download"],
      ["Date & time", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" })],
    ])}
    ${cta("Download from My Library →", `${BASE_URL}/dashboard/library`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Problem with your download? Open a support case from your dashboard and we'll fix it fast.</p>
  `;
  await sendEmail(to, `📚 Your book "${bookTitle}" is ready to download`, layout(`"${bookTitle}" is waiting in your library`, "Purchase Confirmed", body));
}

export async function sendBookDeliveredEmail(to: string, name: string, bookTitle: string) {
  const body = `
    ${heroIcon("📚", "#f0fdf4")}
    ${h1("Your book has been delivered!")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, good news — <strong>${bookTitle}</strong> is now in your library, ready to download. It's yours for life, so come back for it any time.`)}
    ${cta("Download from My Library →", `${BASE_URL}/dashboard/library`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Problem with your download? Open a support case from your dashboard and we'll fix it fast.</p>
  `;
  await sendEmail(to, `📚 "${bookTitle}" has been delivered — download it now`, layout(`"${bookTitle}" is ready in your library`, "Book Delivered", body));
}

export async function sendPaymentConfirmationEmail(
  to: string, name: string, usdAmount: number,
  localAmount: string, localCurrency: string, newBalance: number,
) {
  const body = `
    ${heroIcon("✅", "#f0fdf4")}
    ${h1("Payment confirmed")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, your wallet has been topped up and is ready to use.`)}
    ${infoCard([
      ["Amount paid", `${localAmount} ${localCurrency}`],
      ["USD credits added", `$${usdAmount.toFixed(2)} USD`],
      ["New wallet balance", `$${newBalance.toFixed(2)} USD`],
      ["Date & time", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" })],
    ])}
    ${cta("Browse the Library →", `${BASE_URL}/books`)}
  `;
  await sendEmail(to, `✅ Payment confirmed — ${localAmount} ${localCurrency} added to wallet`, layout(`${localAmount} ${localCurrency} added to your Social Padu wallet`, "Payment Confirmed", body));
}

export async function sendCaseOpenedEmail(to: string, name: string, caseId: string, subject: string) {
  const body = `
    ${heroIcon("🎫", "#faf5ff")}
    ${h1("We received your request")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, your support case has been opened. Our team will respond within <strong>24 hours</strong>.`)}
    ${infoCard([
      ["Case ID", `#${caseId.slice(0, 8).toUpperCase()}`],
      ["Subject", subject],
      ["Status", `<span style="color:#2563eb;font-weight:700;">Open</span>`],
      ["Opened at", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" })],
    ])}
    ${cta("View Your Case →", `${BASE_URL}/dashboard/support/${caseId}`)}
    <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center;">You can reply and track updates directly from your dashboard.</p>
  `;
  await sendEmail(to, `Support case opened: ${subject}`, layout("We've received your support request", "Support", body), FROM_SUPPORT);
}

export async function sendCaseReplyEmail(to: string, name: string, caseId: string, subject: string, replyBody: string) {
  const body = `
    ${h1("New reply from our team")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, the Social Padu support team has replied to your case.`)}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #e07b2e;border-radius:0 10px 10px 0;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">Support Team Reply</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.75;white-space:pre-wrap;">${replyBody}</p>
    </div>
    ${infoCard([
      ["Case", `#${caseId.slice(0, 8).toUpperCase()}`],
      ["Subject", subject],
    ])}
    ${cta("Reply in Dashboard →", `${BASE_URL}/dashboard/support/${caseId}`)}
  `;
  await sendEmail(to, `Re: ${subject}`, layout("Support team replied to your case", "Support Reply", body), FROM_SUPPORT);
}
