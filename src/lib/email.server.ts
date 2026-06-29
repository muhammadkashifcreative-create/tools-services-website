const FROM = "Social Padu <noreply@socialpadu.my>";
const FROM_SUPPORT = "Social Padu Support <noreply@socialpadu.my>";
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

// ─── Master layout ─────────────────────────────────────────────────────────────

function layout(preheader: string, accentLabel: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Social Padu</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f0f2f5;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:40px 16px 56px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <!-- ── Logo bar ── -->
  <tr><td align="center" style="padding-bottom:24px;">
    <a href="${BASE_URL}" style="text-decoration:none;">
      <img src="${LOGO_URL}" alt="Social Padu" width="160" height="auto" style="display:block;border:0;max-width:160px;" />
    </a>
  </td></tr>

  <!-- ── Card ── -->
  <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- Orange top stripe -->
      <tr><td style="height:4px;background:linear-gradient(90deg,#e07b2e,#f59e0b);border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Dark header band -->
      <tr><td style="background:#0f172a;padding:28px 44px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <img src="${FAVICON_URL}" alt="" width="20" height="20" style="display:inline-block;vertical-align:middle;border-radius:4px;border:0;margin-right:8px;"/>
              <span style="color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;vertical-align:middle;">${accentLabel}</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:40px 44px 36px;">${body}</td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 44px;"><div style="height:1px;background:#f1f5f9;font-size:0;line-height:0;">&nbsp;</div></td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 44px 28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6;">
          &copy; ${new Date().getFullYear()} Social Padu &middot;
          <a href="${BASE_URL}" style="color:#e07b2e;text-decoration:none;font-weight:600;">socialpadu.my</a>
        </p>
        <p style="margin:0;font-size:11px;color:#cbd5e1;">
          You're receiving this because you have a Social Padu account. &middot;
          <a href="${BASE_URL}/privacy" style="color:#94a3b8;text-decoration:none;">Privacy Policy</a>
        </p>
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
    <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:${bg};line-height:72px;font-size:32px;text-align:center;">${emoji}</div>
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
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e07b2e 0%,#c8621f 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.02em;padding:16px 40px;border-radius:50px;box-shadow:0 4px 16px rgba(224,123,46,0.4);">${label}</a>
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
      ${featureRow("⚡", "Instant delivery", "Orders start processing in under 60 seconds.")}
      ${featureRow("🔒", "Wallet-secured", "Top up once, spend on any service. No card stored.")}
      ${featureRow("📊", "Live order tracking", "Watch your order progress in real time.")}
      ${featureRow("🌐", "16+ platforms", "Instagram, TikTok, YouTube, Spotify and more.")}
    </table>
    ${cta("Go to Dashboard →", `${BASE_URL}/dashboard`)}
  `;
  await sendEmail(to, "Welcome to Social Padu 🎉", layout("Your account is ready to use", "Welcome", body));
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
    ${cta("Start Placing Orders →", `${BASE_URL}/dashboard/new-order`)}
  `;
  await sendEmail(to, `✅ Payment confirmed — ${localAmount} ${localCurrency} added to wallet`, layout(`${localAmount} ${localCurrency} added to your Social Padu wallet`, "Payment Confirmed", body));
}

export async function sendOrderConfirmationEmail(
  to: string, name: string, orderId: string,
  serviceName: string, quantity: number, charge: number, link: string,
) {
  const body = `
    ${heroIcon("🚀", "#eff6ff")}
    ${h1("Your order is processing")}
    ${subtitle(`Hi <strong>${name || "there"}</strong>, your order has been placed successfully and will start very soon.`)}
    ${infoCard([
      ["Order ID", `#${orderId.slice(0, 8).toUpperCase()}`],
      ["Service", serviceName],
      ["Quantity", quantity.toLocaleString()],
      ["Amount charged", `$${charge.toFixed(2)} USD`],
      ["Target link", `<span style="font-size:11px;word-break:break-all;">${link}</span>`],
      ["Status", `<span style="color:#2563eb;font-weight:700;">⚡ Processing</span>`],
    ])}
    ${alertBox("Orders typically start within <strong>60 seconds</strong> and complete within <strong>72 hours</strong>.", "info")}
    ${cta("Track Order Live →", `${BASE_URL}/dashboard/orders`)}
  `;
  await sendEmail(to, `🚀 Order confirmed — ${serviceName}`, layout(`Your order for ${serviceName} is being processed`, "Order Placed", body));
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
