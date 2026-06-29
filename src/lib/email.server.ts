const FROM = "Social Padu <noreply@socialpadu.my>";
const FROM_SUPPORT = "Social Padu Support <noreply@socialpadu.my>";
const BASE_URL = "https://www.socialpadu.my";

async function sendEmail(to: string, subject: string, html: string, from = FROM) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Layout ───────────────────────────────────────────────────────────────────

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

  <!-- Logo -->
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

  <!-- Card -->
  <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- Dark header -->
      <tr><td style="background:#0f172a;padding:28px 40px 22px;">
        <span style="display:inline-block;background:#e07b2e;border-radius:4px;padding:4px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">${headerTag}</span>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
          <tr>
            <td style="border-top:2px solid #e07b2e;width:40px;line-height:0;">&nbsp;</td>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-left:8px;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">${body}</td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8f9fb;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} Social Padu &middot;
          <a href="${BASE_URL}" style="color:#e07b2e;text-decoration:none;">socialpadu.my</a>
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

// ─── Shared components ────────────────────────────────────────────────────────

function h1(text: string) {
  return `<h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2;">${text}</h1>`;
}

function sub(text: string) {
  return `<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">${text}</p>`;
}

function cta(label: string, url: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e07b2e,#c8621f);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 36px;border-radius:50px;letter-spacing:0.01em;">${label}</a>
    </td></tr>
  </table>`;
}

function note(text: string, type: "warning" | "info" | "success" = "info") {
  const c = { warning: ["#fffbeb","#fcd34d","#92400e"], info: ["#eff6ff","#93c5fd","#1e40af"], success: ["#f0fdf4","#86efac","#166534"] }[type];
  return `<div style="background:${c[0]};border:1px solid ${c[1]};border-radius:10px;padding:14px 18px;margin:20px 0;font-size:13px;color:${c[2]};line-height:1.6;">${text}</div>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>`;
}

function icon(emoji: string, bg: string) {
  return `<div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:${bg};line-height:64px;font-size:28px;text-align:center;">${emoji}</div></div>`;
}

function infoTable(rows: [string, string][]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #f0f0f0;border-radius:10px;overflow:hidden;margin:20px 0;">
    <tr><td style="padding:0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:11px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#9ca3af;width:38%;vertical-align:top;">${l}</td>
          <td style="padding:11px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#111827;font-weight:600;vertical-align:top;">${v}</td>
        </tr>`).join("")}
      </table>
    </td></tr>
  </table>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const html = layout(
    "Verify your email to activate your Social Padu account",
    "Email verification",
    `${icon("✉️", "#fff7ed")}
     ${h1("Verify your email address")}
     ${sub(`Hi <strong>${name || "there"}</strong>, thanks for joining! One quick step — verify your email to activate your account.`)}
     ${note("⏳ &nbsp;This link expires in <strong>24 hours</strong>. If it expires, sign up again to get a new one.", "warning")}
     ${cta("✓ &nbsp;Verify Email Address", verifyUrl)}
     ${divider()}
     <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">Didn't create an account? You can safely ignore this email.</p>`
  );
  await sendEmail(to, "Verify your Social Padu email address", html);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = layout(
    "Reset your Social Padu password",
    "Password reset",
    `${icon("🔑", "#fef3c7")}
     ${h1("Reset your password")}
     ${sub(`Hi <strong>${name || "there"}</strong>, we received a request to reset your Social Padu password.`)}
     ${note("⏳ &nbsp;This link expires in <strong>1 hour</strong> and can only be used once.", "warning")}
     ${cta("Reset Password →", resetUrl)}
     ${divider()}
     <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">Didn't request this? Your password is safe — ignore this email.</p>`
  );
  await sendEmail(to, "Reset your Social Padu password", html);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = layout(
    "Your Social Padu account is ready!",
    "Welcome",
    `${icon("🎉", "#f0fdf4")}
     ${h1(`Welcome aboard, ${name || "there"}!`)}
     ${sub("Your Social Padu account is ready. You now have access to thousands of social media growth services — ready to use in seconds.")}
     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
       <tr>
         <td width="31%" style="background:#fff7ed;border-radius:10px;padding:14px;text-align:center;">
           <div style="font-size:22px;margin-bottom:6px;">⚡</div>
           <div style="font-size:12px;font-weight:700;color:#c2410c;">Starts in &lt;60s</div>
         </td>
         <td width="4%"></td>
         <td width="31%" style="background:#fff7ed;border-radius:10px;padding:14px;text-align:center;">
           <div style="font-size:22px;margin-bottom:6px;">🔒</div>
           <div style="font-size:12px;font-weight:700;color:#c2410c;">Wallet secured</div>
         </td>
         <td width="4%"></td>
         <td width="31%" style="background:#fff7ed;border-radius:10px;padding:14px;text-align:center;">
           <div style="font-size:22px;margin-bottom:6px;">📊</div>
           <div style="font-size:12px;font-weight:700;color:#c2410c;">Live tracking</div>
         </td>
       </tr>
     </table>
     ${cta("Explore Dashboard →", `${BASE_URL}/dashboard`)}`
  );
  await sendEmail(to, "Welcome to Social Padu 🎉", html);
}

export async function sendPaymentConfirmationEmail(
  to: string, name: string, usdAmount: number,
  localAmount: string, localCurrency: string, newBalance: number,
) {
  const html = layout(
    `${localAmount} ${localCurrency} added to your wallet`,
    "Payment confirmed",
    `${icon("✅", "#f0fdf4")}
     ${h1("Payment confirmed")}
     ${sub(`Hi <strong>${name || "there"}</strong>, your wallet has been topped up successfully.`)}
     ${infoTable([
       ["Amount paid", `${localAmount} ${localCurrency}`],
       ["Credits added", `$${usdAmount.toFixed(2)} USD`],
       ["New balance", `$${newBalance.toFixed(2)} USD`],
       ["Date", new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })],
     ])}
     ${cta("Place an Order →", `${BASE_URL}/dashboard/new-order`)}`
  );
  await sendEmail(to, `✅ Payment confirmed — ${localAmount} ${localCurrency}`, html);
}

export async function sendOrderConfirmationEmail(
  to: string, name: string, orderId: string,
  serviceName: string, quantity: number, charge: number, link: string,
) {
  const html = layout(
    `Your order for ${serviceName} is processing`,
    "Order placed",
    `${icon("🚀", "#eff6ff")}
     ${h1("Your order is being processed")}
     ${sub(`Hi <strong>${name || "there"}</strong>, your order has been placed and will start in under 60 seconds.`)}
     ${infoTable([
       ["Order ID", `#${orderId.slice(0, 8).toUpperCase()}`],
       ["Service", serviceName],
       ["Quantity", quantity.toLocaleString()],
       ["Charged", `$${charge.toFixed(2)} USD`],
       ["Link", `<span style="font-size:11px;word-break:break-all;">${link}</span>`],
       ["Status", `<span style="color:#2563eb;font-weight:700;">Processing</span>`],
     ])}
     ${note("Orders typically start within 60 seconds and complete within 72 hours.", "info")}
     ${cta("Track Your Order →", `${BASE_URL}/dashboard/orders`)}`
  );
  await sendEmail(to, `🚀 Order placed — ${serviceName}`, html);
}

export async function sendCaseOpenedEmail(to: string, name: string, caseId: string, subject: string) {
  const html = layout(
    "We received your support request",
    "Support case",
    `${icon("🎫", "#f5f3ff")}
     ${h1("Support case opened")}
     ${sub(`Hi <strong>${name || "there"}</strong>, we've received your request. Our team will respond within 24 hours.`)}
     ${infoTable([
       ["Case ID", `#${caseId.slice(0, 8).toUpperCase()}`],
       ["Subject", subject],
       ["Status", `<span style="color:#2563eb;font-weight:700;">Open</span>`],
       ["Opened", new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })],
     ])}
     ${cta("View Case →", `${BASE_URL}/dashboard/support/${caseId}`)}`
  );
  await sendEmail(to, `Support case opened: ${subject}`, html, FROM_SUPPORT);
}

export async function sendCaseReplyEmail(to: string, name: string, caseId: string, subject: string, replyBody: string) {
  const html = layout(
    "Support team replied to your case",
    "Support reply",
    `${h1("New reply from support")}
     ${sub(`Hi <strong>${name || "there"}</strong>, our support team has replied to your case.`)}
     <div style="background:#f8f9fb;border-left:4px solid #e07b2e;border-radius:0 10px 10px 0;padding:18px 22px;margin:20px 0;">
       <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Support Team</p>
       <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${replyBody}</p>
     </div>
     ${infoTable([
       ["Case", `#${caseId.slice(0, 8).toUpperCase()}`],
       ["Subject", subject],
     ])}
     ${cta("Reply in Dashboard →", `${BASE_URL}/dashboard/support/${caseId}`)}`
  );
  await sendEmail(to, `Re: ${subject}`, html, FROM_SUPPORT);
}
