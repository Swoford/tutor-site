// pages/api/bot.js
import { supabase } from '../../lib/supabase';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TZ_OFFSET = '+03:00'; // часовой пояс репетитора

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  const update = req.body;
  const callback = update.callback_query;
  const message = update.message;

  try {
    // 1) Нажатия на кнопки "Принять / Отклонить" в заявке
    if (callback) {
      const chatId = callback.message.chat.id.toString();
      const data = callback.data || '';

      if (chatId !== process.env.TEACHER_CHAT_ID) {
        await answerCallbackQuery(callback.id);
        return res.status(200).json({ ok: true });
      }

      if (data === 'req_accept') {
        const parsed = parseRequestFromMessageText(callback.message.text);
        if (parsed.error) {
          await sendMessage(chatId, parsed.error);
        } else {
          const { iso, dateStr, timeStr, name, contact, comment } = parsed;

          const { error } = await supabase.from('lessons').insert({
            start_time: iso,
            student_name: name,
            comment:
              (comment ? `${comment} ` : '') +
              `(контакт: ${contact})`,
            status: 'planned',
          });

          if (error) {
            console.error(error);
            await sendMessage(
              chatId,
              'Ошибка при добавлении урока по заявке.'
            );
          } else {
            const newText =
              callback.message.text +
              `\n\n✅ Заявка принята. Урок добавлен в расписание (${dateStr} ${timeStr}).`;
            await editMessageText(chatId, callback.message.message_id, newText);
          }
        }
      } else if (data === 'req_reject') {
        const newText =
          callback.message.text + '\n\n❌ Заявка отклонена.';
        await editMessageText(chatId, callback.message.message_id, newText);
      }

      await answerCallbackQuery(callback.id);
      return res.status(200).json({ ok: true });
    }

    // 2) Обычные текстовые сообщения (команды)
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = (message.text || '').trim();

    if (chatId !== process.env.TEACHER_CHAT_ID) {
      return res.status(200).json({ ok: true });
    }

    if (text === '/start') {
      await sendMessage(
        chatId,
        'Привет! Я бот‑ежедневник.\n\n' +
          'Команды:\n' +
          '/add ДД.ММ[.ГГГГ] ЧЧ:00 Имя [комментарий] — добавить урок (только целые часы)\n' +
          '/today — список уроков на сегодня\n' +
          '/del ID — удалить урок по ID (ID видно в списке /today)\n\n' +
          'Заявки с сайта приходят с кнопками "Принять / Отклонить".'
      );
      return res.status(200).json({ ok: true });
    }

    // /add ДД.ММ[.ГГГГ] ЧЧ:00 Имя [комментарий]
    if (text.startsWith('/add')) {
      const parsed = parseAddCommand(text);
      if (parsed.error) {
        await sendMessage(chatId, parsed.error);
        return res.status(200).json({ ok: true });
      }

      const { iso, dateStr, timePart, name, comment } = parsed;

      const { error } = await supabase.from('lessons').insert({
        start_time: iso,
        student_name: name,
        comment: comment || null,
        status: 'planned',
      });

      if (error) {
        console.error(error);
        await sendMessage(chatId, 'Ошибка при добавлении урока');
      } else {
        await sendMessage(
          chatId,
          `Добавлено: ${dateStr} ${timePart} — ${name}`
        );
      }

      return res.status(200).json({ ok: true });
    }

    // /del ID — удалить урок
    if (text.startsWith('/del')) {
      const parts = text.split(' ');
      if (parts.length < 2) {
        await sendMessage(chatId, 'Формат: /del ID\nПример: /del 12');
        return res.status(200).json({ ok: true });
      }

      const id = Number(parts[1]);
      if (!Number.isInteger(id) || id <= 0) {
        await sendMessage(chatId, 'ID должен быть положительным числом.');
        return res.status(200).json({ ok: true });
      }

      const { data, error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        console.error(error);
        await sendMessage(chatId, `Урок с ID ${id} не найден.`);
      } else {
        const d = new Date(data.start_time);
        const dateStr = d.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        });
        const timeStr = d.toTimeString().slice(0, 5);
        await sendMessage(
          chatId,
          `Урок удалён: [${id}] ${dateStr} ${timeStr} — ${data.student_name}`
        );
      }

      return res.status(200).json({ ok: true });
    }

    // /today — список уроков на сегодня, отсортированный, с ID
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
        return `[#${l.id}] ${time} — ${l.student_name}${comment}`;
      });

      await sendMessage(chatId, 'Сегодня:\n' + lines.join('\n'));
      return res.status(200).json({ ok: true });
    }

    await sendMessage(
      chatId,
      'Команда не распознана.\n\n' +
        'Доступно:\n' +
        '/add ДД.ММ[.ГГГГ] ЧЧ:00 Имя [комментарий]\n' +
        '/today\n' +
        '/del ID'
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true });
  }
}

/** Разбор заявки из текста сообщения (для кнопки "Принять") */
function parseRequestFromMessageText(text) {
  try {
    const lines = String(text).split('\n');

    const nameLine = lines.find((l) => l.startsWith('Имя: ')) || '';
    const contactLine = lines.find((l) => l.startsWith('Контакт: ')) || '';
    const dtLine =
      lines.find((l) => l.startsWith('Желаемая дата и время: ')) || '';
    const commentLine = lines.find((l) => l.startsWith('Комментарий: '));

    if (!dtLine) {
      return { error: 'Не удалось прочитать дату и время заявки.' };
    }

    const name = nameLine.replace('Имя: ', '').trim() || 'Без имени';
    const contact = contactLine.replace('Контакт: ', '').trim() || 'нет';
    const comment = commentLine
      ? commentLine.replace('Комментарий: ', '').trim()
      : '';

    const dtStr = dtLine.replace('Желаемая дата и время: ', '').trim();
    // "15.02.2025 09:00"
    const [dateStr, timeStr] = dtStr.split(' ');
    const [dayStr, monthStr, yearStr] = dateStr.split('.');
    const [hourStr] = timeStr.split(':');

    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    const hour = Number(hourStr);

    if (
      !day ||
      !month ||
      !year ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23
    ) {
      return { error: 'Неверный формат даты или времени в заявке.' };
    }

    const iso = new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
        2,
        '0'
      )}T${String(hour).padStart(2, '0')}:00:00${TZ_OFFSET}`
    ).toISOString();

    return { iso, dateStr, timeStr, name, contact, comment };
  } catch (e) {
    console.error(e);
    return { error: 'Ошибка при разборе текста заявки.' };
  }
}

/** Разбор команды /add */
function parseAddCommand(text) {
  // /add 15.02[.2025] 09:00 Имя коммент
  const parts = text.split(' ');
  if (parts.length < 4) {
    return {
      error:
        'Формат: /add ДД.ММ[.ГГГГ] ЧЧ:00 Имя [комментарий]\nПример: /add 15.02 09:00 Маша алгебра',
    };
  }

  const [, datePart, timePart, name, ...rest] = parts;
  const comment = rest.join(' ');

  const datePieces = datePart.split('.');
  let day, month, year;
  if (datePieces.length === 2) {
    [day, month] = datePieces.map(Number);
    year = new Date().getFullYear();
  } else if (datePieces.length === 3) {
    [day, month, year] = datePieces.map(Number);
  } else {
    return { error: 'Неверная дата. Используйте ДД.ММ или ДД.ММ.ГГГГ' };
  }

  const [hStr, mStr] = timePart.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);

  if (
    !day ||
    !month ||
    !year ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute !== 0
  ) {
    return {
      error:
        'Неверное время. Используйте только целые часы (минуты должны быть 00).\nПример: /add 15.02 09:00 Маша',
    };
  }

  const iso = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}T${String(hour).padStart(2, '0')}:00:00${TZ_OFFSET}`
  ).toISOString();

  const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(
    2,
    '0'
  )}.${year}`;

  return { iso, dateStr, timePart, name, comment };
}

/** Сервисные функции Telegram API */

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function editMessageText(chatId, messageId, text) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: { inline_keyboard: [] }, // убираем кнопки
    }),
  });
}

async function answerCallbackQuery(callbackId) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId }),
  });
}
