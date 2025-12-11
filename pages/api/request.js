// pages/api/request.js
import { supabase } from '../../lib/supabase';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// часовой пояс репетитора — Москва (+03:00). Если другой, поправь на свой.
const TZ_OFFSET = '+03:00';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, time, comment } = req.body || {};

    if (!name || !phone || !time) {
      return res.status(400).json({ error: 'Имя, контакт и время обязательны' });
    }

    // time приходит как "YYYY-MM-DDTHH:MM"
    // Добавляем секунды и часовой пояс, чтобы получить корректный timestamptz
    const desiredIso = new Date(`${time}:00${TZ_OFFSET}`).toISOString();

    // 1) Сохраняем заявку в таблицу requests
    const { data, error } = await supabase
      .from('requests')
      .insert({
        name,
        contact: phone,
        desired_time: desiredIso,
        comment: comment || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: 'DB error' });
    }

    const reqId = data.id;
    const d = new Date(data.desired_time);
    const dateStr = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = d.toTimeString().slice(0, 5);

    // 2) Отправляем преподу сообщение с кнопками "Принять / Отклонить"
    const text =
      `Новая заявка с сайта (№${reqId}):\n` +
      `Имя: ${name}\n` +
      `Контакт: ${phone}\n` +
      `Желаемая дата и время: ${dateStr} ${timeStr}\n` +
      (comment ? `Комментарий: ${comment}\n` : '') +
      `\nВыберите действие:`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TEACHER_CHAT_ID,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Принять', callback_data: `req_accept:${reqId}` },
              { text: '❌ Отклонить', callback_data: `req_reject:${reqId}` },
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