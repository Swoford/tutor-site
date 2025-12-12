// pages/index.js
import { useState } from 'react';
import Layout from '../components/Layout';

export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null); // 'ok' | 'error' | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus(null);

    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Ошибка отправки');
      }

      setFormStatus('ok');
      e.target.reset();
    } catch (err) {
      console.error(err);
      setFormStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout activePage="home" title="Онлайн‑репетитор — УчительOnline">
      {/* Hero */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Онлайн‑репетитор по{' '}
                <span>математике и русскому языку</span>
              </h1>
              <p>
                Помогаю школьникам с 4 по 11 класс понять сложные темы,
                подтянуть оценки и уверенно чувствовать себя на уроках.{' '}
                <span className="highlight">
                  Индивидуальный подход и комфортная атмосфера.
                </span>
              </p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <a href="#contact" className="btn">
                  Записаться на занятие
                </a>
                <a href="/schedule" className="btn btn-outline">
                  Посмотреть расписание
                </a>
              </div>
            </div>
            <div className="hero-image">
              <div className="image-frame float">A+</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Почему ученикам комфортно на моих занятиях</h2>
          <p className="section-subtitle">
            Задача занятий — не зубрёжка, а понимание. Объясняю простым языком,
            поддерживаю и помогаю поверить в свои силы.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Индивидуальный подход</h3>
              <p>
                Учитываю уровень, темп и особенности каждого ученика. Строю
                программу так, чтобы заниматься было понятно и не страшно.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Удобный график</h3>
              <p>
                Занятия онлайн с гибким расписанием. Всю актуальную запись и
                ближайшие уроки можно посмотреть прямо на сайте.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Подготовка к контрольным и экзаменам</h3>
              <p>
                Разбираем типовые задания, сложные темы, тренируемся на реальных
                вариантах ОГЭ/ЕГЭ и школьных контрольных.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Всегда на связи</h3>
              <p>
                Напоминаю о занятиях в Telegram, отвечаю на вопросы между
                уроками и поддерживаю ученика в учебном процессе.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="subjects" id="subjects">
        <div className="container">
          <h2 className="section-title">Предметы и направления</h2>
          <p className="section-subtitle">
            Работаю по школьной программе и готовлю к важным экзаменам.
          </p>

          <div className="subjects-grid">
            <div className="subject-card">
              <div className="subject-icon">➗</div>
              <h3>Математика</h3>
              <p>
                Арифметика, алгебра, геометрия. Помощь с домашним заданием,
                подготовка к контрольным и углублённое изучение.
              </p>
              <div className="price-tag">от 1000 ₽ / 60 минут</div>
            </div>

            <div className="subject-card">
              <div className="subject-icon">🔤</div>
              <h3>Русский язык</h3>
              <p>
                Орфография, пунктуация, разбор ошибок, сочинения и изложения.
                Плавно и понятно объясняю сложные правила.
              </p>
              <div className="price-tag">от 1000 ₽ / 60 минут</div>
            </div>

            <div className="subject-card">
              <div className="subject-icon">🎓</div>
              <h3>Подготовка к ОГЭ / ЕГЭ</h3>
              <p>
                Работаем по кодификатору, решаем типовые задания, разбираем
                стратегии и учимся не бояться экзамена.
              </p>
              <div className="price-tag">по индивидуальному плану</div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about" id="about">
        <div className="container">
          <div className="about-content">
            <div className="about-image">
              <div className="image-frame pulse">✎</div>
            </div>
            <div className="about-text">
              <h3>О преподавателе</h3>
              <p>
                Я — частный преподаватель с опытом работы с учениками разных
                возрастов и уровней подготовки. Помогаю не только подтянуть
                оценки, но и перестать бояться предмета.
              </p>
              <p>
                На занятиях создаю атмосферу, в которой не страшно задавать
                вопросы и ошибаться. Объясняю до тех пор, пока ученик не
                скажет: «Всё, я понял!».
              </p>
              <div className="stats">
                <div className="stat-item">
                  <div className="stat-number">5+</div>
                  <div className="stat-label">лет опыта преподавания</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">довольных учеников</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">90%</div>
                  <div className="stat-label">
                    учеников улучшают оценки за 1 семестр
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Поможем сделать учёбу понятной и спокойной</h2>
            <p>
              Оставьте заявку — обсудим цели, уровень и подберём удобное время
              для занятий.
            </p>
            <a href="#contact" className="btn">
              Записаться на пробное занятие
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="contact" id="contact">
        <div className="container">
          <h2 className="section-title">Записаться на занятие</h2>
          <p className="section-subtitle">
            Заполните форму — я свяжусь с вами в Telegram или по телефону, чтобы
            уточнить детали и подобрать удобное время.
          </p>

          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">📞</div>
                <div className="contact-details">
                  <h4>Связаться напрямую</h4>
                  <p>Телефон: +7 (999) 123‑45‑67</p>
                  <p>Telegram: @your_tg</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">⏰</div>
                <div className="contact-details">
                  <h4>Напоминания о занятиях</h4>
                  <p>
                    За час до начала урока придёт напоминание в Telegram —
                    ничего не пропустите.
                  </p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">💻</div>
                <div className="contact-details">
                  <h4>Формат занятий</h4>
                  <p>Онлайн‑уроки в Zoom/Discord. Все материалы отправляю после занятия.</p>
                </div>
              </div>
            </div>

            <div className="contact-form">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Имя ученика или родителя</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Телефон или Telegram</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
  <label htmlFor="time">Желаемая дата и время первого занятия</label>
  <input
    type="datetime-local"
    id="time"
    name="time"
    className="form-control"
    required
    step="3600" // шаг 1 час
  />
</div>

                <div className="form-group">
                  <label htmlFor="comment">Комментарий</label>
                  <textarea
                    id="comment"
                    name="comment"
                    className="form-control"
                    rows="4"
                    placeholder="Класс, предмет, цель занятий или любые вопросы"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
                </button>

                {formStatus === 'ok' && (
                  <p className="form-status success">
                    Заявка отправлена! Я свяжусь с вами в ближайшее время.
                  </p>
                )}
                {formStatus === 'error' && (
                  <p className="form-status error">
                    Не удалось отправить заявку. Попробуйте ещё раз или
                    напишите в Telegram.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
