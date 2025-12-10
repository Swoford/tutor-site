// pages/api/request.js
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, time, comment } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    const text =
      `Новая заявка с сайта:\n` +
      `Имя: ${name}\n` +
      `Контакт: ${phone}\n` +
      (time ? `Удобное время: ${time}\n` : '') +
      (comment ? `Комментарий: ${comment}` : '');

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TEACHER_CHAT_ID,
        text,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
