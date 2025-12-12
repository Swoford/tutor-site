// pages/schedule.js
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export default function SchedulePage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/schedule');
        if (!res.ok) throw new Error('Ошибка загрузки расписания');
        const data = await res.json();
        setLessons(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <Layout activePage="schedule" title="Расписание занятий — УчительOnline">
      <section className="schedule">
        <div className="container">
          <h1 className="section-title">Расписание занятий</h1>
          <p className="section-subtitle">
            Здесь отображаются все запланированные уроки. Расписание
            автоматически обновляется, когда преподаватель добавляет занятия
            через Telegram‑бота.
          </p>

          <div className="schedule-card">
            {loading && <p>Загрузка расписания…</p>}
            {error && <p className="form-status error">{error}</p>}

            {!loading && !error && lessons.length === 0 && (
              <p>Пока нет запланированных занятий.</p>
            )}

            {!loading && !error && lessons.length > 0 && (
              <div className="schedule-table-wrapper">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Время</th>
                      <th>Ученик</th>
                      <th>Комментарий</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => {
                      const d = new Date(lesson.start_time);
                      const date = d.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });
                      const time = d.toTimeString().slice(0, 5);

                      let statusText = lesson.status;
                      if (lesson.status === 'planned') statusText = 'Запланировано';
                      if (lesson.status === 'done') statusText = 'Проведено';
                      if (lesson.status === 'canceled') statusText = 'Отменено';

                      return (
                        <tr key={lesson.id}>
                          <td>{date}</td>
                          <td>{time}</td>
                          <td>{lesson.student_name}</td>
                          <td>{lesson.comment}</td>
                          <td>{statusText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
