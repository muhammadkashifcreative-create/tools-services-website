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
    console.error("Telegram notify failed:", e);
  }
}

export function tgSignup(email: string, name: string) {
  return notifyTelegram(
    `🆕 <b>New Signup</b>\n👤 ${email}\n📛 ${name}\n🕐 ${new Date().toUTCString()}`,
  );
}

export function tgDeposit(email: string, amount: number, newBalance: number) {
  return notifyTelegram(
    `💰 <b>Wallet Deposit</b>\n👤 ${email}\n💵 +$${amount.toFixed(2)} USD\n💼 Balance: $${newBalance.toFixed(2)}`,
  );
}

export function tgOrder(email: string, serviceName: string, quantity: number, charge: number, link: string, method: "wallet" | "card" = "wallet") {
  const icon = method === "card" ? "💳" : "👛";
  return notifyTelegram(
    `📦 <b>New Order</b> ${icon}\n👤 ${email}\n🛒 ${serviceName} × ${quantity.toLocaleString()}\n💵 $${charge.toFixed(2)}\n🔗 ${link}`,
  );
}
