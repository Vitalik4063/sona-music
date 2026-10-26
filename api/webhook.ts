// Telegram Serverless Webhook Handler (Vercel / Cloudflare / Node.js)
// Назначается через BotFather или автоматически через кнопку в панели Sona (/bot)

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      service: "Sona Telegram Serverless Webhook",
      status: "online",
    });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || "https://your-sona-webapp.vercel.app";

  if (!TOKEN) {
    return res.status(500).json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" });
  }

  const update = req.body || {};
  const msg = update.message;
  if (!msg || !msg.chat) {
    return res.status(200).json({ ok: true });
  }

  const chatId = msg.chat.id;
  const text = String(msg.text || "").trim();

  let replyText =
    "Sona Music — твой музыкальный плеер, библиотека треков полной длительности (320 kbps), импорт из VK и Яндекс.Музыки и офлайн-кэш прямо внутри Telegram.";

  if (text.startsWith("/my_music")) {
    replyText = "Открой свою медиатеку и избранные треки в Sona Mini App:";
  } else if (text.startsWith("/recommend")) {
    replyText = "Твой персональный радар рекомендаций готов в Sona:";
  } else if (text && !text.startsWith("/")) {
    replyText = `Ищем «${text}» во всех мировых каталогах (Audius, Deezer, Apple Music). Открой плеер для прослушивания полной версии:`;
  }

  const targetUrl =
    text && !text.startsWith("/")
      ? `${WEBAPP_URL}/search?q=${encodeURIComponent(text)}`
      : WEBAPP_URL;

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Слушать в Sona Mini App",
                web_app: { url: targetUrl },
              },
            ],
          ],
        },
      }),
    });
  } catch (err) {
    console.error("Telegram sendMessage error:", err);
  }

  return res.status(200).json({ ok: true });
}
