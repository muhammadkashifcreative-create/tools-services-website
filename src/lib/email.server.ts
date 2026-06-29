import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.GMAIL_USER ?? "socialpadu@gmail.com";
const BASE_URL = "https://www.socialpadu.my";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function send(to: string, subject: string, html: string, fromLabel = "Social Padu") {
  return getTransporter().sendMail({ from: `"${fromLabel}" <${FROM_EMAIL}>`, to, subject, html });
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(preheader: string, headerTag: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Social Padu</title>
</head>
<body style="margin:0;padding:0;background:#f1f3f5;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f1f3f5;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f3f5;">
<tr><td align="center" style="padding:32px 16px 48px;">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

  <!-- Logo bar -->
  <tr><td align="center" style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#e07b2e;border-radius:8px;width:30px;height:30px;text-align:center;vertical-align:middle;">
          <span style="color:#ffffff;font-size:13px;font-weight:900;display:block;line-height:30px;">SP</span>
        </td>
        <td style="padding-left:8px;vertical-align:middle;">
          <span style="color:#111827;font-size:16px;font-weight:700;">Social </span><span style="color:#e07b2e;font-size:16px;font-weight:700;">Padu</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Card wrapper -->
  <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- Dark header -->
      <tr><td style="background:#0f172a;padding:32px 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="display:inline-block;background:#e07b2e;border-radius:4px;padding:4px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">${headerTag}</span>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:2px solid #e07b2e;width:40px;"></td>
                  <td style="border-top:1px solid rgba(255,255,255,0.1);width:200px;padding-left:8px;"></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">${body}</td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8f9fb;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} Social Padu &middot; <a href="${BASE_URL}" style="color:#e07b2e;text-decoration:none;">socialpadu.my</a>
        </p>
        <p style="margin:0;font-size:11px;color:#d1d5db;">You received this because you have a Social Padu account.</p>
      </td></tr>

    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function cta(label: string, url: string) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;">
      <tr><td align="center">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e07b2e,#c8621f);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.01em;padding:16px 40px;border-radius:50px;box-shadow:0 4px 16px rgba(224,123,46,0.45);">${label}</a>
      </td></tr>
    </table>`;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#9ca3af;width:38%;vertical-align:top;">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:600;vertical-align:top;">${value}</td>
    </tr>`;
}

function heroIcon(emoji: string, bg: string) {
  return `<div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;width:68px;height:68px;border-radius:50%;background:${bg};line-height:68px;font-size:30px;text-align:center;">${emoji}</div>
  </div>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2;">${text}</h1>`;
}

function subtext(text: string) {
  return `<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #f0f0f0;margin:28px 0;"/>`;
}

function noteBox(text: string, type: "warning" | "info" | "success" = "info") {
  const colors = {
    warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
    info:    { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
    success: { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  }[type];
  return `<div style="background:${colors.bg};border:1px solid ${colors.border};border-radius:12px;padding:16px 20px;margin:24px 0;font-size:13px;color:${colors.text};line-height:1.6;">${text}</div>`;
}

// ─── Email templates ───────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const body = `
    ${heroIcon("✉️", "#fff7ed")}
    ${h1("Verify your email address")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, thanks for joining Social Padu! One quick step — please verify your email address to activate your account.`)}
    ${noteBox("⏳ &nbsp;This link expires in <strong>24 hours</strong>. If it expires, simply sign up again.", "warning")}
    ${cta("✓ &nbsp;Verify Email Address", verifyUrl)}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">Didn't create an account? You can safely ignore this email.</p>
  `;
  const html = layout("Verify your email to activate your Social Padu account", "Email verification", body);
  await send(to, "Verify your Social Padu email address", html);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const body = `
    ${heroIcon("🔑", "#fef3c7")}
    ${h1("Reset your password")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, we received a request to reset your Social Padu password. Click below to choose a new one.`)}
    ${noteBox("⏳ &nbsp;This link expires in <strong>1 hour</strong> and can only be used once.", "warning")}
    ${cta("Reset Password →", resetUrl)}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">Didn't request this? Your password is safe — just ignore this email.</p>
  `;
  const html = layout("Reset your Social Padu password", "Password reset", body);
  await send(to, "Reset your Social Padu password", html);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const body = `
    ${heroIcon("🎉", "#f0fdf4")}
    ${h1(`Welcome aboard, ${name || "there"}!`)}
    ${subtext("Your Social Padu account is ready. You now have access to thousands of social media growth services — ready to use in seconds.")}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
      <tr>
        <td width="31%" style="background:#fff7ed;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">⚡</div>
          <div style="font-size:12px;font-weight:700;color:#c2410c;">Starts in &lt;60s</div>
        </td>
        <td width="4%"></td>
        <td width="31%" style="background:#fff7ed;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">🔒</div>
          <div style="font-size:12px;font-weight:700;color:#c2410c;">Wallet-secured</div>
        </td>
        <td width="4%"></td>
        <td width="31%" style="background:#fff7ed;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">📊</div>
          <div style="font-size:12px;font-weight:700;color:#c2410c;">Live tracking</div>
        </td>
      </tr>
    </table>
    ${cta("Explore Dashboard →", `${BASE_URL}/dashboard`)}
  `;
  const html = layout("Your Social Padu account is ready!", "Welcome", body);
  await send(to, "Welcome to Social Padu 🎉", html);
}

export async function sendPaymentConfirmationEmail(to: string, name: string, usdAmount: number, localAmount: string, localCurrency: string, newBalance: number) {
  const body = `
    ${heroIcon("✅", "#f0fdf4")}
    ${h1("Payment confirmed")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, your wallet has been topped up successfully and is ready to use.`)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin:24px 0;">
      <tr><td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow("Amount paid", `${localAmount} ${localCurrency}`)}
          ${infoRow("Credits added", `$${usdAmount.toFixed(2)} USD`)}
          ${infoRow("New balance", `$${newBalance.toFixed(2)} USD`)}
          ${infoRow("Date", new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }))}
        </table>
      </td></tr>
    </table>
    ${cta("Place an Order →", `${BASE_URL}/dashboard/new-order`)}
  `;
  const html = layout(`$${usdAmount.toFixed(2)} USD added to your wallet`, "Payment confirmed", body);
  await send(to, `✅ Payment confirmed — $${usdAmount.toFixed(2)} USD`, html);
}

export async function sendOrderConfirmationEmail(to: string, name: string, orderId: string, serviceName: string, quantity: number, charge: number, link: string) {
  const body = `
    ${heroIcon("🚀", "#eff6ff")}
    ${h1("Your order is being processed")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, your order has been placed and will start in under 60 seconds.`)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin:24px 0;">
      <tr><td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow("Order ID", `#${orderId.slice(0, 8).toUpperCase()}`)}
          ${infoRow("Service", serviceName)}
          ${infoRow("Quantity", quantity.toLocaleString())}
          ${infoRow("Charged", `$${charge.toFixed(2)} USD`)}
          ${infoRow("Status", `<span style="color:#2563eb;font-weight:700;">Processing</span>`)}
        </table>
      </td></tr>
    </table>
    ${noteBox("Orders typically start within 60 seconds and complete within 72 hours.", "info")}
    ${cta("Track Order →", `${BASE_URL}/dashboard/orders`)}
  `;
  const html = layout(`Your order for ${serviceName} is processing`, "Order placed", body);
  await send(to, `🚀 Order placed — ${serviceName}`, html);
}

export async function sendCaseOpenedEmail(to: string, name: string, caseId: string, subject: string) {
  const body = `
    ${heroIcon("🎫", "#f5f3ff")}
    ${h1("Support case opened")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, we've received your support request. Our team will respond within 24 hours.`)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin:24px 0;">
      <tr><td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow("Case ID", `#${caseId.slice(0, 8).toUpperCase()}`)}
          ${infoRow("Subject", subject)}
          ${infoRow("Status", `<span style="color:#2563eb;font-weight:700;">Open</span>`)}
          ${infoRow("Opened", new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }))}
        </table>
      </td></tr>
    </table>
    ${cta("View Case →", `${BASE_URL}/dashboard/support/${caseId}`)}
  `;
  const html = layout("We received your support request", "Support case", body);
  await send(to, `Support case opened: ${subject}`, html, "Social Padu Support");
}

export async function sendCaseReplyEmail(to: string, name: string, caseId: string, subject: string, replyBody: string) {
  const body = `
    ${h1("New reply from support")}
    ${subtext(`Hi <strong>${name || "there"}</strong>, our support team has replied to your case.`)}
    <div style="background:#f8f9fb;border-left:4px solid #e07b2e;border-radius:0 12px 12px 0;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Support Team</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${replyBody}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin:0 0 8px;">
      <tr><td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow("Case", `#${caseId.slice(0, 8).toUpperCase()}`)}
          ${infoRow("Subject", subject)}
        </table>
      </td></tr>
    </table>
    ${cta("Reply in Dashboard →", `${BASE_URL}/dashboard/support/${caseId}`)}
  `;
  const html = layout("Support team replied to your case", "Support reply", body);
  await send(to, `Re: ${subject}`, html, "Social Padu Support");
}
