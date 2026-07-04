const API_ROOT = "https://api.telegram.org";

export async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`${API_ROOT}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Telegram notify failed");
  }
}

// Mask email: "user@example.com" → "use***@example.com"
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

export function tgSignup(email: string, name: string) {
  return notifyTelegram(
    `🆕 <b>New Signup</b>\n👤 ${maskEmail(email)}\n📛 ${name}\n🕐 ${new Date().toUTCString()}`,
  );
}

export function tgDeposit(email: string, amount: number, newBalance: number) {
  return notifyTelegram(
    `💰 <b>Wallet Deposit</b>\n👤 ${maskEmail(email)}\n💵 +$${amount.toFixed(2)} USD\n💼 Balance: $${newBalance.toFixed(2)}`,
  );
}

export function tgToolOrder(
  email: string,
  productName: string,
  qty: number,
  totalUsd: number,
  orderId: string,
) {
  return notifyTelegram(
    `🛒 <b>New Tool Order</b>\n👤 ${maskEmail(email)}\n📦 ${productName} × ${qty}\n💵 $${totalUsd.toFixed(2)} USD\n🆔 #${orderId.slice(0, 8).toUpperCase()}\n🕐 ${new Date().toUTCString()}`,
  );
}
