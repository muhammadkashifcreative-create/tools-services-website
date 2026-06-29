import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function base(content: string, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Social Padu</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#e07b2e,#c8621f);border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:left;">
              <span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:10px;padding:6px 14px;">
                <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">SP</span>
                <span style="color:#fff;font-size:18px;font-weight:600;margin-left:6px;">Social Padu</span>
              </span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
          © ${new Date().getFullYear()} Social Padu · All rights reserved<br/>
          You received this email because you have an account at Social Padu.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e07b2e,#c8621f);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;margin-top:24px;">${label}</a>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;"/>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;color:#6b7280;font-size:13px;width:40%;">${label}</td>
    <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:600;">${value}</td>
  </tr>`;
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = base(`
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#111827;">Welcome to Social Padu! 🎉</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi ${name || "there"}, your account is ready.</p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
      You now have access to <strong>5,786+ social media services</strong> across 16 platforms — Instagram, TikTok, YouTube, Spotify and more. Top up your wallet and start boosting today.
    </p>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:12px;text-align:center;background:#fff7ed;border-radius:10px;margin:4px;">
          <div style="font-size:22px;">⚡</div>
          <div style="font-size:12px;color:#c2410c;font-weight:600;margin-top:4px;">Starts in &lt;60s</div>
        </td>
        <td width="4%"></td>
        <td width="33%" style="padding:12px;text-align:center;background:#fff7ed;border-radius:10px;">
          <div style="font-size:22px;">🔒</div>
          <div style="font-size:12px;color:#c2410c;font-weight:600;margin-top:4px;">No password needed</div>
        </td>
        <td width="4%"></td>
        <td width="33%" style="padding:12px;text-align:center;background:#fff7ed;border-radius:10px;">
          <div style="font-size:22px;">📊</div>
          <div style="font-size:12px;color:#c2410c;font-weight:600;margin-top:4px;">Real-time tracking</div>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">${btn("Go to Dashboard →", "https://www.socialpadu.my/dashboard")}</div>
  `, "Your Social Padu account is ready!");

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Welcome to Social Padu 🎉",
    html,
  });
}

export async function sendPaymentConfirmationEmail(to: string, name: string, usdAmount: number, localAmount: string, localCurrency: string, newBalance: number) {
  const html = base(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">✅</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;text-align:center;">Payment Confirmed</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;text-align:center;">Hi ${name || "there"}, your wallet has been topped up successfully.</p>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Amount paid", `${localAmount} ${localCurrency} (~$${usdAmount.toFixed(2)} USD)`)}
      ${row("Credits added", `$${usdAmount.toFixed(2)} USD`)}
      ${row("New balance", `$${newBalance.toFixed(2)} USD`)}
      ${row("Date", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" }))}
    </table>
    ${divider()}
    <p style="margin:0;color:#374151;font-size:14px;">Your wallet is ready to use. Start placing orders now!</p>
    <div style="text-align:center;">${btn("Place an Order →", "https://www.socialpadu.my/dashboard/new-order")}</div>
  `, `$${usdAmount.toFixed(2)} USD added to your wallet`);

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: `✅ Payment confirmed — $${usdAmount.toFixed(2)} USD added to wallet`,
    html,
  });
}

export async function sendOrderConfirmationEmail(to: string, name: string, orderId: string, serviceName: string, quantity: number, charge: number, link: string) {
  const html = base(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">🚀</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;text-align:center;">Order Placed!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;text-align:center;">Hi ${name || "there"}, your order is being processed and will start shortly.</p>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Order ID", `#${orderId.slice(0, 8).toUpperCase()}`)}
      ${row("Service", serviceName)}
      ${row("Quantity", quantity.toLocaleString())}
      ${row("Charged", `$${charge.toFixed(2)} USD`)}
      ${row("Link", `<span style="word-break:break-all;font-size:11px;">${link}</span>`)}
      ${row("Status", `<span style="color:#2563eb;font-weight:700;">Processing</span>`)}
    </table>
    ${divider()}
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Orders typically start within 60 seconds and complete within 72 hours. You can track real-time progress in your dashboard.</p>
    <div style="text-align:center;">${btn("Track Order →", "https://www.socialpadu.my/dashboard/orders")}</div>
  `, `Your order for ${serviceName} is processing`);

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: `🚀 Order placed — ${serviceName}`,
    html,
  });
}

export async function sendCaseOpenedEmail(to: string, name: string, caseId: string, subject: string) {
  const html = base(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Support case opened</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Hi ${name || "there"}, we've received your support request and will respond within 24 hours.</p>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Case ID", `#${caseId.slice(0, 8).toUpperCase()}`)}
      ${row("Subject", subject)}
      ${row("Status", `<span style="color:#2563eb;font-weight:700;">Open</span>`)}
      ${row("Created", new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" }))}
    </table>
    ${divider()}
    <p style="margin:0;color:#374151;font-size:14px;">You can view and update your case at any time from your dashboard.</p>
    <div style="text-align:center;">${btn("View Case →", `https://www.socialpadu.my/dashboard/support/${caseId}`)}</div>
  `, "We received your support request");

  await getTransporter().sendMail({
    from: `"Social Padu Support" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Support case opened: ${subject}`,
    html,
  });
}

export async function sendCaseReplyEmail(to: string, name: string, caseId: string, subject: string, replyBody: string) {
  const html = base(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">New reply on your case</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${name || "there"}, our support team has replied to your case.</p>
    <div style="background:#f9fafb;border-left:4px solid #e07b2e;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Support Team Reply</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${replyBody}</p>
    </div>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Case", `#${caseId.slice(0, 8).toUpperCase()}`)}
      ${row("Subject", subject)}
    </table>
    <div style="text-align:center;">${btn("Reply in Dashboard →", `https://www.socialpadu.my/dashboard/support/${caseId}`)}</div>
  `, "Support team replied to your case");

  await getTransporter().sendMail({
    from: `"Social Padu Support" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Re: ${subject}`,
    html,
  });
}

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const html = base(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Verify your email</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${name || "there"}, welcome! Please verify your email address to activate your Social Padu account.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#92400e;font-weight:600;">Click the button below to verify</p>
      <p style="margin:0;font-size:12px;color:#b45309;">This link expires in 24 hours</p>
    </div>
    <div style="text-align:center;">${btn("✓ Verify Email Address", verifyUrl)}</div>
    ${divider()}
    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't create an account, you can safely ignore this email.</p>
  `, "Verify your email to get started");

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your Social Padu email address",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = base(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">🔑</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;text-align:center;">Reset your password</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;text-align:center;">Hi ${name || "there"}, we received a request to reset your password.</p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;margin:0 0 20px;">
      <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">⏰ This link expires in <strong>1 hour</strong></p>
    </div>
    <div style="text-align:center;">${btn("Reset Password →", resetUrl)}</div>
    ${divider()}
    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
  `, "Reset your Social Padu password");

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your Social Padu password",
    html,
  });
}

export async function sendOrderConfirmationEmail(to: string, name: string, orderId: string, serviceName: string, quantity: number, charge: number, link: string) {
  const html = base(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">🚀</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;text-align:center;">Order Placed!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;text-align:center;">Hi ${name || "there"}, your order is being processed and will start shortly.</p>
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Order ID", `#${orderId.slice(0, 8).toUpperCase()}`)}
      ${row("Service", serviceName)}
      ${row("Quantity", quantity.toLocaleString())}
      ${row("Charged", `$${charge.toFixed(2)} USD`)}
      ${row("Link", `<span style="word-break:break-all;font-size:11px;">${link}</span>`)}
      ${row("Status", `<span style="color:#2563eb;font-weight:700;">Processing</span>`)}
    </table>
    ${divider()}
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Orders typically start within 60 seconds and complete within 72 hours.</p>
    <div style="text-align:center;">${btn("Track Order →", "https://www.socialpadu.my/dashboard/orders")}</div>
  `, `Your order for ${serviceName} is processing`);

  await getTransporter().sendMail({
    from: `"Social Padu" <${process.env.GMAIL_USER}>`,
    to,
    subject: `🚀 Order placed — ${serviceName}`,
    html,
  });
}
