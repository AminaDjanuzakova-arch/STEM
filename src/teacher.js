/**
 * Панель учителя BIO QUIZ
 */
import { CATEGORIES, DIFFICULTIES } from './questions.js';
import {
  getTeacherPin,
  isSupabaseEnabled,
  createSession,
  listSessions,
  closeSession,
  getSessionResults,
  subscribeSessionResults,
  buildStudentJoinUrl,
  qrImageUrl,
  computeClassAnalytics,
} from './supabase.js';
import { playClick } from './audio.js';

const AUTH_KEY = 'bioquiz_teacher_auth';

/** @type {null | (() => void)} */
let unsubscribe = null;
let currentSessionCode = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

function setAuthed(value) {
  if (value) sessionStorage.setItem(AUTH_KEY, '1');
  else sessionStorage.removeItem(AUTH_KEY);
}

function medal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

function cleanup() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentSessionCode = null;
}

/**
 * @param {HTMLElement} app
 * @param {{ toast: Function, goHome: Function, goStudentWithCode?: Function }} deps
 */
export function mountTeacher(app, deps) {
  cleanup();
  if (!isAuthed()) {
    renderLogin(app, deps);
    return;
  }
  renderDashboard(app, deps);
}

export function unmountTeacher() {
  cleanup();
}

function renderLogin(app, deps) {
  app.innerHTML = `
    <section class="screen panel glass kids-card teacher-panel">
      <div class="panel-header">
        <h2>👩‍🏫 Вход учителя</h2>
        <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
      </div>
      <p class="teacher-lead">Введи PIN, чтобы открыть панель управления сессиями и аналитику класса.</p>
      <div class="name-form teacher-login">
        <input id="teacher-pin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN учителя" autocomplete="current-password" />
        <button class="btn btn-primary" id="teacher-login-btn">Войти</button>
      </div>
      <p class="sync-hint">PIN по умолчанию: <strong>1234</strong> (или VITE_TEACHER_PIN)</p>
      <p class="sync-hint">${isSupabaseEnabled() ? '☁️ Supabase подключён' : '💾 Локальный режим (без Supabase ключей)'}</p>
    </section>
  `;

  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    deps.goHome();
  };

  const login = () => {
    playClick();
    const pin = app.querySelector('#teacher-pin').value.trim();
    if (pin === getTeacherPin()) {
      setAuthed(true);
      deps.toast('👩‍🏫 Добро пожаловать!');
      renderDashboard(app, deps);
    } else {
      deps.toast('❌ Неверный PIN');
      app.querySelector('#teacher-pin').classList.add('shake-input');
      setTimeout(() => app.querySelector('#teacher-pin')?.classList.remove('shake-input'), 500);
    }
  };

  app.querySelector('#teacher-login-btn').onclick = login;
  app.querySelector('#teacher-pin').onkeydown = (e) => {
    if (e.key === 'Enter') login();
  };
}

async function renderDashboard(app, deps) {
  cleanup();
  const sessions = await listSessions();

  app.innerHTML = `
    <section class="screen panel glass kids-card teacher-panel wide">
      <div class="panel-header">
        <h2>👩‍🏫 Панель учителя</h2>
        <div class="nav-row">
          <button class="btn btn-ghost btn-sm" data-action="logout">Выйти</button>
          <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
        </div>
      </div>

      <div class="teacher-create glass">
        <h3>✨ Создать новую сессию квиза</h3>
        <div class="teacher-create-grid">
          <label>Название
            <input id="session-title" maxlength="40" value="Классный квиз" />
          </label>
          <label>Сложность
            <select id="session-diff">
              ${Object.values(DIFFICULTIES)
                .map((d) => `<option value="${d.id}">${d.emoji} ${d.name}</option>`)
                .join('')}
            </select>
          </label>
          <label>Категория
            <select id="session-cat">
              ${CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
            </select>
          </label>
        </div>
        <button class="btn btn-primary btn-block" id="create-session">🎲 Создать сессию</button>
      </div>

      <h3 class="section-title">Активные и прошлые сессии</h3>
      <div class="list" id="sessions-list">
        ${
          sessions.length === 0
            ? `<div class="empty-state">Сессий пока нет — создай первую!</div>`
            : sessions
                .map(
                  (s) => `
            <div class="list-item session-row">
              <div class="rank">${s.status === 'active' ? '🟢' : '⚪'}</div>
              <div class="meta">
                <strong>${escapeHtml(s.title || 'Квиз')} · код ${s.code}</strong>
                <span>${DIFFICULTIES[s.difficulty]?.name || s.difficulty} · ${CATEGORIES.find((c) => c.id === s.category)?.name || s.category}</span>
              </div>
              <button class="btn btn-secondary btn-sm" data-open="${s.code}">Открыть</button>
            </div>`,
                )
                .join('')
        }
      </div>
    </section>
  `;

  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    cleanup();
    deps.goHome();
  };
  app.querySelector('[data-action="logout"]').onclick = () => {
    playClick();
    setAuthed(false);
    cleanup();
    renderLogin(app, deps);
  };

  app.querySelector('#create-session').onclick = async () => {
    playClick();
    const btn = app.querySelector('#create-session');
    btn.disabled = true;
    btn.textContent = '⏳ Создаём…';
    try {
      const session = await createSession({
        title: app.querySelector('#session-title').value.trim() || 'Классный квиз',
        difficulty: app.querySelector('#session-diff').value,
        category: app.querySelector('#session-cat').value,
      });
      deps.toast(`✅ Сессия ${session.code} создана!`);
      renderSessionLive(app, deps, session);
    } catch (err) {
      deps.toast(`❌ ${err.message || 'Ошибка создания'}`);
      btn.disabled = false;
      btn.textContent = '🎲 Создать сессию';
    }
  };

  app.querySelectorAll('[data-open]').forEach((btn) => {
    btn.onclick = async () => {
      playClick();
      const code = btn.dataset.open;
      const session = sessions.find((s) => s.code === code);
      if (session) renderSessionLive(app, deps, session);
    };
  });
}

async function renderSessionLive(app, deps, session) {
  cleanup();
  currentSessionCode = session.code;
  const joinUrl = buildStudentJoinUrl(session.code);
  const qr = qrImageUrl(joinUrl, 200);

  app.innerHTML = `
    <section class="screen panel glass kids-card teacher-panel wide">
      <div class="panel-header">
        <h2>📡 Сессия ${session.code}</h2>
        <div class="nav-row">
          <button class="btn btn-ghost btn-sm" data-action="back">← Назад</button>
          <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
        </div>
      </div>

      <div class="session-hero">
        <div class="session-code-card glass">
          <div class="session-code-label">Код для учеников</div>
          <div class="session-code-big">${session.code}</div>
          <div class="session-meta">${escapeHtml(session.title || '')} · ${session.status === 'active' ? 'активна' : 'закрыта'}</div>
          <div class="session-actions">
            <button class="btn btn-secondary btn-sm" id="copy-code">📋 Код</button>
            <button class="btn btn-secondary btn-sm" id="copy-link">🔗 Ссылка</button>
            ${session.status === 'active' ? '<button class="btn btn-danger btn-sm" id="close-session">Закрыть</button>' : ''}
          </div>
        </div>
        <div class="session-qr-card glass">
          <img src="${qr}" alt="QR код сессии" width="200" height="200" class="qr-img" />
          <p>Отсканируй QR или открой ссылку</p>
        </div>
      </div>

      <div class="class-stats" id="class-stats"></div>

      <div class="panel-header" style="margin-top:8px">
        <h3>🏆 Таблица лидеров <span class="live-dot" title="Обновление в реальном времени">LIVE</span></h3>
        <button class="btn btn-ghost btn-sm" id="refresh-lb">🔄</button>
      </div>
      <div id="leaderboard-live" class="list"></div>
      <div id="student-detail"></div>
    </section>
  `;

  const paint = (results) => {
    paintAnalytics(app, results);
    paintLeaderboard(app, deps, results);
  };

  unsubscribe = subscribeSessionResults(session.code, paint, 2000);

  app.querySelector('[data-action="back"]').onclick = () => {
    playClick();
    cleanup();
    renderDashboard(app, deps);
  };
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    cleanup();
    deps.goHome();
  };
  app.querySelector('#copy-code').onclick = async () => {
    playClick();
    await navigator.clipboard?.writeText(session.code);
    deps.toast('📋 Код скопирован');
  };
  app.querySelector('#copy-link').onclick = async () => {
    playClick();
    await navigator.clipboard?.writeText(joinUrl);
    deps.toast('🔗 Ссылка скопирована');
  };
  app.querySelector('#refresh-lb').onclick = async () => {
    playClick();
    paint(await getSessionResults(session.code));
  };
  const closeBtn = app.querySelector('#close-session');
  if (closeBtn) {
    closeBtn.onclick = async () => {
      playClick();
      await closeSession(session.code);
      deps.toast('Сессия закрыта');
      session.status = 'closed';
      renderSessionLive(app, deps, session);
    };
  }
}

function paintAnalytics(app, results) {
  const box = app.querySelector('#class-stats');
  if (!box) return;
  const a = computeClassAnalytics(results);
  const hard = a.hardestQuestion;
  box.innerHTML = `
    <div class="stats-grid teacher-stats">
      <div class="stat-card"><div class="label">👥 Учеников</div><div class="value">${a.totalStudents}</div></div>
      <div class="stat-card"><div class="label">📊 Средний балл</div><div class="value">${a.averageScore}</div></div>
      <div class="stat-card"><div class="label">🎯 Средняя точность</div><div class="value">${a.averageAccuracy}%</div></div>
      <div class="stat-card hard-q">
        <div class="label">🪨 Самый сложный вопрос</div>
        <div class="hard-q-text">${
          hard
            ? `${escapeHtml(hard.question)} <span>(ошибок ${Math.round(hard.rate * 100)}%)</span>`
            : 'Пока нет данных'
        }</div>
      </div>
    </div>
  `;
}

function paintLeaderboard(app, deps, results) {
  const box = app.querySelector('#leaderboard-live');
  const detail = app.querySelector('#student-detail');
  if (!box) return;

  if (!results.length) {
    box.innerHTML = `<div class="empty-state">Ждём первых учеников…</div>`;
    if (detail) detail.innerHTML = '';
    return;
  }

  box.innerHTML = results
    .map(
      (r, i) => `
    <button class="list-item leader-row pop-in" style="--delay:${Math.min(i, 8) * 0.04}s" data-student="${escapeHtml(r.id || `${r.student_name}-${i}`)}">
      <div class="rank medal">${medal(i + 1)}</div>
      <div class="meta">
        <strong>${escapeHtml(r.student_name)}</strong>
        <span>✅ ${r.correct_count} · ❌ ${r.wrong_count} · 🎯 ${r.accuracy}% · ⏱ ${r.avg_time ?? 0}с</span>
      </div>
      <div class="score">${r.score}</div>
    </button>`,
    )
    .join('');

  box.querySelectorAll('[data-student]').forEach((btn, idx) => {
    btn.onclick = () => {
      playClick();
      showStudentCard(app, results[idx]);
    };
  });
}

function showStudentCard(app, result) {
  const detail = app.querySelector('#student-detail');
  if (!detail || !result) return;
  const answers = Array.isArray(result.answers) ? result.answers : [];
  detail.innerHTML = `
    <div class="student-card glass screen-slide">
      <div class="panel-header">
        <h3>👤 ${escapeHtml(result.student_name)}</h3>
        <button class="btn btn-ghost btn-sm" id="close-detail">✕</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">🏆 Баллы</div><div class="value">${result.score}</div></div>
        <div class="stat-card"><div class="label">🎯 Точность</div><div class="value">${result.accuracy}%</div></div>
        <div class="stat-card"><div class="label">⏱ Среднее время</div><div class="value">${result.avg_time ?? 0} с</div></div>
        <div class="stat-card"><div class="label">⌛ Всего времени</div><div class="value">${result.total_time ?? 0} с</div></div>
      </div>
      <h4 class="section-title">Ответы по вопросам</h4>
      <div class="answer-log">
        ${
          answers.length === 0
            ? '<div class="empty-state">Нет детального лога</div>'
            : answers
                .map(
                  (a, i) => `
            <div class="log-item ${a.isCorrect ? 'ok' : 'bad'}">
              <div class="log-head">
                <span>${a.isCorrect ? '✅' : '❌'} Вопрос ${i + 1}</span>
                <span>⏱ ${Number(a.timeSpent || 0).toFixed(1)} с</span>
              </div>
              <div class="log-q">${escapeHtml(a.question || '')}</div>
              <div class="log-a">Ответ ученика: <strong>${escapeHtml(a.selectedText ?? '—')}</strong></div>
              ${
                a.isCorrect
                  ? ''
                  : `<div class="log-correct">Правильно: <strong>${escapeHtml(a.correctText || '')}</strong></div>`
              }
            </div>`,
                )
                .join('')
        }
      </div>
    </div>
  `;
  detail.querySelector('#close-detail').onclick = () => {
    playClick();
    detail.innerHTML = '';
  };
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
