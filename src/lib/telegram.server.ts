const API_ROOT = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Sends a Telegram message. Throws with Telegram's own error description on
 * failure (bad token, bad chat id, bot not a member of the chat, etc.) —
 * callers already do `.catch(console.error)`, so this makes real failures
 * show up in server logs instead of vanishing silently.
 */
export async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Telegram notify skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
    return;
  }

  const res = await fetch(`${API_ROOT}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { description?: string }).description ?? `HTTP ${res.status}`;
    console.error(`Telegram notify failed: ${detail}`);
    throw new Error(`Telegram notify failed: ${detail}`);
  }
}

// Mask email: "user@example.com" → "use***@example.com"
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

// Escape user-provided text so it can't break Telegram's HTML parse mode
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function tgSignup(email: string, name: string) {
  return notifyTelegram(
    `🆕 <b>New Signup</b>\n👤 ${maskEmail(email)}\n📛 ${esc(name)}\n🕐 ${new Date().toUTCString()}`,
  );
}

export function tgCaseOpened(
  email: string,
  subject: string,
  category: string,
  priority: string,
  caseId: string,
) {
  return notifyTelegram(
    `🎫 <b>New Support Case</b>\n👤 ${maskEmail(email)}\n📋 ${esc(subject)}\n🏷 ${esc(category)} · ${esc(priority)}\n🆔 #${caseId.slice(0, 8).toUpperCase()}`,
  );
}

export function tgCaseReply(email: string, subject: string, caseId: string) {
  return notifyTelegram(
    `💬 <b>Customer Replied to Case</b>\n👤 ${maskEmail(email)}\n📋 ${esc(subject)}\n🆔 #${caseId.slice(0, 8).toUpperCase()}`,
  );
}
