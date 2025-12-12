// pages/api/reminder.js
import { supabase } from '../../lib/supabase';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  try {
    const now = new Date();
    const plus59 = new Date(now.getTime() + 59 * 60 * 1000);
    const plus61 = new Date(now.getTime() + 61 * 60 * 1000);

    // Напоминания за час до занятия
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('status', 'planned')
      .eq('reminder_sent', false)
      .gte('start_time', plus59.toISOString())
      .lte('start_time', plus61.toISOString());

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'DB error' });
    }

    const chatId = process.env.TEACHER_CHAT_ID;

    for (const l of data || []) {
      const d = new Date(l.start_time);
      const dateStr = d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      });
      const timeStr = d.toTimeString().slice(0, 5);

      const text =
        `Напоминание: через час занятие\n` +
        `Дата: ${dateStr}\n` +
        `Время: ${timeStr}\n` +
        `Ученик: ${l.student_name}\n` +
        (l.comment ? `Комментарий: ${l.comment}` : '');

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      await supabase
        .from('lessons')
        .update({ reminder_sent: true })
        .eq('id', l.id);
    }

    // Удаляем уроки, которые закончились больше часа назад
    const cutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await supabase.from('lessons').delete().lt('start_time', cutoff);

    return res.status(200).json({ ok: true, count: (data || []).length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
