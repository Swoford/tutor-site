// components/Layout.js
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function Layout({ children, activePage, title }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <Head>
        <title>{title || 'Репетитор — индивидуальные занятия онлайн'}</title>
      </Head>

      <header>
        <div className="container">
          <div className="header-content">
            <Link href="/" className="logo" onClick={closeMenu}>
              <div className="logo-icon">A+</div>
              <div className="logo-text">
                Учитель<span>Online</span>
              </div>
            </Link>

            <nav>
              <div className="menu-toggle" onClick={toggleMenu}>
                ☰
              </div>
              <ul className={menuOpen ? 'active' : ''}>
                <li>
                  <Link
                    href="/"
                    className={activePage === 'home' ? 'active' : ''}
                    onClick={closeMenu}
                  >
                    Главная
                  </Link>
                </li>
                <li>
                  <Link href="/#about" onClick={closeMenu}>
                    Обо мне
                  </Link>
                </li>
                <li>
                  <Link
                    href="/schedule"
                    className={activePage === 'schedule' ? 'active' : ''}
                    onClick={closeMenu}
                  >
                    Расписание
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" onClick={closeMenu}>
                    Контакты
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-column">
              <h3>УчительOnline</h3>
              <p>
                Индивидуальные онлайн‑занятия для школьников. Помогаю понять
                предмет, а не просто выучить формулы.
              </p>
            </div>
            <div className="footer-column">
              <h3>Навигация</h3>
              <Link href="/">Главная</Link>
              <Link href="/schedule">Расписание</Link>
              <a href="#contact">Записаться</a>
            </div>
            <div className="footer-column">
              <h3>Контакты</h3>
              <p>Телефон: +7 (999) 123‑45‑67</p>
              <p>Telegram: @your_tg</p>
              <div className="social-links">
                <a href="https://t.me/your_tg" target="_blank" rel="noreferrer">
                  T
                </a>
                <a href="mailto:you@example.com">✉</a>
              </div>
            </div>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} УчительOnline. Все права защищены.
          </div>
        </div>
      </footer>
    </>
  );
}
