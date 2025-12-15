// pages/api/request.js
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TZ_OFFSET = '+03:00'; // часовой пояс репетитора

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, time, comment, website } = req.body || {};

    // Honeypot: если поле заполнено — это бот, просто игнорируем
    if (website) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !phone || !time) {
      return res
        .status(400)
        .json({ error: 'Имя, контакт и время обязательны' });
    }

    // Определяем IP
    const ip = getClientIp(req);

    // time приходит как "YYYY-MM-DDTHH:MM"
    const { displayDate, displayTime } = normalizeTimeToFullHour(time);

    let text =
      `Новая заявка с сайта:\n` +
      `Имя: ${name}\n` +
      `Контакт: ${phone}\n` +
      `Желаемая дата и время: ${displayDate} ${displayTime}\n`;

    if (comment) {
      text += `Комментарий: ${comment}\n`;
    }
    if (ip) {
      text += `IP: ${ip}\n`;
    }

    text += `\nВыберите действие:`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TEACHER_CHAT_ID,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Принять', callback_data: 'req_accept' },
              { text: '❌ Отклонить', callback_data: 'req_reject' },
            ],
          ],
        },
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// Нормализуем к целому часу и подготавливаем строку для отображения
function normalizeTimeToFullHour(timeStr) {
  // "2025-02-15T18:30" -> "2025-02-15T18:00:00+03:00"
  const [datePart, hm] = String(timeStr).split('T');
  if (!datePart || !hm) {
    throw new Error('Неверный формат времени');
  }

  const [hourStr] = hm.split(':');
  const hour = Number(hourStr);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Неверный час');
  }

  const isoWithTz = new Date(
    `${datePart}T${String(hour).padStart(2, '0')}:00:00${TZ_OFFSET}`
  );

  const displayDate = isoWithTz.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const displayTime = isoWithTz.toTimeString().slice(0, 5); // "HH:MM"

  return { displayDate, displayTime };
}

// Получаем IP клиента из заголовков / сокета
function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0].split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return req.socket?.remoteAddress || null;
}
