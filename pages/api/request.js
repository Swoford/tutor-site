// pages/api/request.js
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TZ_OFFSET = '+03:00'; // часовой пояс репетитора

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, date, time, comment, website } = req.body || {};

    // Honeypot – если поле заполнено, считаем, что это бот, и молча игнорируем
    if (website) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !phone || !date || !time) {
      return res
        .status(400)
        .json({ error: 'Имя, контакт, дата и время обязательны' });
    }

    const ip = getClientIp(req);

    const { displayDate, displayTime } = buildDateTime(date, time);

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

// Формируем человекочитаемые дату/время и проверяем, что только целый час
function buildDateTime(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  const [yearStr, monthStr, dayStr] = String(dateStr).split('-');
  const [hStr, mStr] = String(timeStr).split(':');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hStr);
  const minute = Number(mStr);

  if (
    !year ||
    !month ||
    !day ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute !== 0
  ) {
    throw new Error('Неверная дата или время');
  }

  const isoWithTz = new Date(
    `${yearStr}-${monthStr}-${dayStr}T${String(hour).padStart(
      2,
      '0'
    )}:00:00${TZ_OFFSET}`
  );

  const displayDate = isoWithTz.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const displayTime = isoWithTz.toTimeString().slice(0, 5); // HH:MM

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
