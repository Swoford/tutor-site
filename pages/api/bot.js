// pages/api/bot.js
import { supabase } from '../../lib/supabase';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Telegram всё равно ожидает 200
    return res.status(200).json({ ok: true });
  }

  const update = req.body;
  const message = update.message;
  if (!message) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id.toString();
  const text = (message.text || '').trim();

  // Принимаем команды только от преподавателя
  if (chatId !== process.env.TEACHER_CHAT_ID) {
    return res.status(200).json({ ok: true });
  }

  try {
    if (text === '/start') {
      await sendMessage(
        chatId,
        'Привет! Я бот‑ежедневник.\n\n' +
          'Команды:\n' +
          '/add ДД.ММ ЧЧ:ММ Имя [комментарий] — добавить урок\n' +
          '/today — список уроков на сегодня'
      );
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith('/add')) {
      // /add 15.02 14:00 Маша алгебра
      const parts = text.split(' ');
      if (parts.length < 4) {
        await sendMessage(chatId, 'Формат: /add ДД.ММ ЧЧ:ММ Имя [комментарий]');
        return res.status(200).json({ ok: true });
      }

      const [, dateStr, timeStr, name, ...rest] = parts;
      const commentFull = rest.join(' ');

      const [dayStr, monthStr] = dateStr.split('.');
      const day = Number(dayStr);
      const month = Number(monthStr);

      const now = new Date();
      const year = now.getFullYear();

      if (!day || !month || !timeStr.match(/^\d{2}:\d{2}$/)) {
        await sendMessage(chatId, 'Неверный формат даты или времени');
        return res.status(200).json({ ok: true });
      }

      // Часовой пояс: +03:00 (Мск). При необходимости поменяй.
      const isoWithTz = new Date(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
          2,
          '0'
        )}T${timeStr}:00+03:00`
      ).toISOString();

      const { error } = await supabase.from('lessons').insert({
        start_time: isoWithTz,
        student_name: name,
        comment: commentFull || null,
        status: 'planned',
      });

      if (error) {
        console.error(error);
        await sendMessage(chatId, 'Ошибка при добавлении урока');
      } else {
        await sendMessage(chatId, `Добавлено: ${dateStr} ${timeStr} — ${name}`);
      }

      return res.status(200).json({ ok: true });
    }

    if (text === '/today') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .gte('start_time', start.toISOString())
        .lt('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error(error);
        await sendMessage(chatId, 'Ошибка при получении расписания');
        return res.status(200).json({ ok: true });
      }

      if (!data || data.length === 0) {
        await sendMessage(chatId, 'На сегодня уроков нет');
        return res.status(200).json({ ok: true });
      }

      const lines = data.map((l) => {
        const d = new Date(l.start_time);
        const time = d.toTimeString().slice(0, 5);
        const comment = l.comment ? ` (${l.comment})` : '';
        return `${time} — ${l.student_name}${comment}`;
      });

      await sendMessage(chatId, 'Сегодня:\n' + lines.join('\n'));
      return res.status(200).json({ ok: true });
    }

    await sendMessage(
      chatId,
      'Команда не распознана.\n\n' +
        'Доступно:\n' +
        '/add ДД.ММ ЧЧ:ММ Имя [комментарий]\n' +
        '/today'
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true });
  }
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
