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
    // 1) Обработка нажатий на кнопки "Принять / Отклонить"
    if (callback) {
      const data = callback.data || '';
      const chatId = callback.message.chat.id.toString();

      if (chatId !== process.env.TEACHER_CHAT_ID) {
        return res.status(200).json({ ok: true });
      }

      if (data.startsWith('req_accept:')) {
        const id = Number(data.split(':')[1]);
        await handleRequestDecision(id, true, callback);
      } else if (data.startsWith('req_reject:')) {
        const id = Number(data.split(':')[1]);
        await handleRequestDecision(id, false, callback);
      }

      // Снимаем "часики" на кнопке
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
          '/add ДД.ММ[.ГГГГ] ЧЧ:ММ Имя [комментарий] — добавить урок\n' +
          '/today — список уроков на сегодня\n\n' +
          'Заявки с сайта приходят с кнопками "Принять / Отклонить".'
      );
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith('/add')) {
      const parsed = parseAddCommand(text);
      if (parsed.error) {
        await sendMessage(chatId, parsed.error);
        return res.status(200).json({ ok: true });
      }

      const { iso, day, month, year, timePart, name, comment } = parsed;

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
        const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(
          2,
          '0'
        )}.${year}`;
        await sendMessage(chatId, `Добавлено: ${dateStr} ${timePart} — ${name}`);
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
        '/add ДД.ММ[.ГГГГ] ЧЧ:ММ Имя [комментарий]\n' +
        '/today'
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true });
  }
}

/** Разбор команды /add */
function parseAddCommand(text) {
  // /add 15.02 14:00 Маша коммент
  // /add 15.02.2025 14:00 Маша коммент
  const parts = text.split(' ');
  if (parts.length < 4) {
    return {
      error:
        'Формат: /add ДД.ММ[.ГГГГ] ЧЧ:ММ Имя [комментарий]\nПример: /add 15.02.2025 14:00 Маша алгебра',
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

  if (
    !day ||
    !month ||
    !year ||
    !timePart.match(/^\d{2}:\d{2}$/)
  ) {
    return {
      error:
        'Проверьте дату и время. Пример: /add 15.02.2025 14:00 Маша алгебра',
    };
  }

  const iso = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}T${timePart}:00${TZ_OFFSET}`
  ).toISOString();

  return { iso, day, month, year, timePart, name, comment };
}

/** Обработка "Принять" / "Отклонить" заявки */
async function handleRequestDecision(reqId, accept, callback) {
  const chatId = callback.message.chat.id.toString();

  const { data: req, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', reqId)
    .single();

  if (error || !req) {
    console.error(error);
    await sendMessage(chatId, `Не удалось найти заявку №${reqId}.`);
    return;
  }

  if (req.status !== 'pending') {
    await sendMessage(
      chatId,
      `Заявка №${reqId} уже была обработана (статус: ${req.status}).`
    );
    return;
  }

  if (accept) {
    // Создаём урок в lessons
    const { error: insErr } = await supabase.from('lessons').insert({
      start_time: req.desired_time,
      student_name: req.name,
      comment: (req.comment || '') + ` (контакт: ${req.contact})`,
      status: 'planned',
    });

    if (insErr) {
      console.error(insErr);
      await sendMessage(chatId, `Ошибка при добавлении урока по заявке №${reqId}`);
      return;
    }

    await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', reqId);

    const newText =
      callback.message.text + '\n\n✅ Заявка принята. Урок добавлен в расписание.';

    await editMessageText(chatId, callback.message.message_id, newText);
  } else {
    await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', reqId);

    const newText = callback.message.text + '\n\n❌ Заявка отклонена.';

    await editMessageText(chatId, callback.message.message_id, newText);
  }
}

/** Сервисные функции работы с Telegram API */

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