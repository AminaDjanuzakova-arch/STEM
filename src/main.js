/**
 * BIO QUIZ — главная логика приложения
 */
import './style.css';
import { CATEGORIES, DIFFICULTIES, getQuestionsForGame, getTypeLabel } from './questions.js';
import {
  getSettings,
  saveSettings,
  getProfile,
  saveProfile,
  getLeaderboard,
  addLeaderboardEntry,
  getAllAchievements,
  unlockAchievement,
  saveGame,
  loadSavedGame,
  clearSavedGame,
} from './storage.js';
import {
  setSoundEnabled,
  playClick,
  playCorrect,
  playWrong,
  playTimeout,
  playFinish,
  playAchievement,
  playCombo,
  unlockAudio,
} from './audio.js';

const QUESTIONS_PER_GAME = 15;
const TIMER_SECONDS = 20;
const LETTERS = ['A', 'B', 'C', 'D'];

const app = document.getElementById('app');
const confettiContainer = document.getElementById('confetti-container');

/** @type {ReturnType<typeof getSettings>} */
let settings = getSettings();
/** @type {ReturnType<typeof getProfile>} */
let profile = getProfile();

/** Состояние текущей игры */
let game = null;
let timerId = null;
let timerLeft = TIMER_SECONDS;
let questionStartedAt = 0;
let answeringLocked = false;
let pendingScreen = null;

const TYPE_EMOJI = {
  multiple: '🧬',
  truefalse: '⚖️',
  statement: '📌',
  oddone: '🔍',
  image: '🖼️',
  whatif: '💥',
  match: '🔗',
  riddle: '🧩',
  whoami: '🎭',
  speed: '⚡',
};

/* ===== Init ===== */
applyTheme();
applyAnimationFlag();
setSoundEnabled(settings.sound);
createParticles();
document.addEventListener(
  'pointerdown',
  () => {
    unlockAudio();
  },
  { once: true },
);

const saved = loadSavedGame();
if (saved && saved.questions?.length && saved.currentIndex < saved.questions.length) {
  showResumeModal(saved);
} else {
  renderHome();
}

/* ===== Particles background ===== */
function createParticles() {
  const box = document.getElementById('bg-particles');
  if (!box) return;
  box.innerHTML = '';
  const symbols = ['🧬', '🍃', '💧', '🔬', '🦠', '✨', '🫧', '🌿', '⚛️', '🧪'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = symbols[i % symbols.length];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${14 + Math.random() * 18}s`;
    el.style.animationDelay = `${-Math.random() * 20}s`;
    el.style.fontSize = `${1 + Math.random() * 1.4}rem`;
    box.appendChild(el);
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.darkTheme ? 'dark' : 'light');
}

function applyAnimationFlag() {
  document.body.classList.toggle('no-anim', !settings.animations);
}

/* ===== Helpers ===== */
function toast(message) {
  const box = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRankTitle(accuracy) {
  if (accuracy >= 90) return '🧬 ГЕНИЙ БИОЛОГИИ';
  if (accuracy >= 75) return '🔬 ОТЛИЧНЫЙ РЕЗУЛЬТАТ';
  if (accuracy >= 50) return '🌱 ХОРОШИЙ РЕЗУЛЬТАТ';
  if (accuracy >= 30) return '🧪 ЕСТЬ ЧТО ПОВТОРИТЬ';
  return '🌱 НАЧНИ НОВОЕ БИОЛОГИЧЕСКОЕ ПУТЕШЕСТВИЕ';
}

function persistGame() {
  if (!game || game.finished) return;
  saveGame({
    ...game,
    timerLeft,
    savedAt: Date.now(),
  });
}

function createGameState({ difficulty, category }) {
  const questions = getQuestionsForGame({ difficulty, category, count: QUESTIONS_PER_GAME });
  return {
    difficulty,
    category,
    questions,
    currentIndex: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    maxStreak: 0,
    lives: 3,
    continueWithoutLives: false,
    hints: { fifty: true, tip: true, time: true },
    answerTimes: [],
    usedQuestionIds: questions.map((q) => q.id),
    paused: false,
    finished: false,
    hadFastAnswer: false,
    feedback: null,
    removedAnswers: [],
  };
}

/* ===== Screens ===== */
function renderHome() {
  stopTimer();
  pendingScreen = null;
  app.innerHTML = `
    <section class="screen home glass">
      <div class="logo-mark" aria-hidden="true">🧬</div>
      <div class="brand">BIO QUIZ</div>
      <h1>Проверь свои знания о живом мире!</h1>
      <p class="subtitle">От клетки до человека — сколько ты знаешь о биологии?</p>
      <div class="home-actions">
        <button class="btn btn-primary" data-action="start">▶ НАЧАТЬ КВИЗ</button>
        <button class="btn btn-secondary" data-action="settings">⚙ НАСТРОЙКИ</button>
        <button class="btn btn-secondary" data-action="leaderboard">🏆 ТАБЛИЦА РЕКОРДОВ</button>
      </div>
      <div class="home-links">
        <button class="btn btn-ghost btn-sm" data-action="profile">👤 Профиль</button>
        <button class="btn btn-ghost btn-sm" data-action="how">ℹ️ Как играть</button>
      </div>
    </section>
  `;

  app.querySelector('[data-action="start"]').onclick = () => {
    playClick();
    renderSetup();
  };
  app.querySelector('[data-action="settings"]').onclick = () => {
    playClick();
    renderSettings();
  };
  app.querySelector('[data-action="leaderboard"]').onclick = () => {
    playClick();
    renderLeaderboard();
  };
  app.querySelector('[data-action="profile"]').onclick = () => {
    playClick();
    renderProfile();
  };
  app.querySelector('[data-action="how"]').onclick = () => {
    playClick();
    renderHowTo();
  };
}

function renderHowTo() {
  app.innerHTML = `
    <section class="screen panel glass">
      <div class="panel-header">
        <h2>ℹ️ Как играть</h2>
        <button class="btn btn-ghost btn-sm" data-action="home">🏠 Главная</button>
      </div>
      <div class="list">
        <div class="list-item"><div class="meta"><strong>15 вопросов</strong><span>Случайный набор без повторов в одной игре</span></div></div>
        <div class="list-item"><div class="meta"><strong>⏱ 20 секунд</strong><span>Успей ответить — за скорость есть бонус</span></div></div>
        <div class="list-item"><div class="meta"><strong>🔥 Серии и комбо</strong><span>Правильные ответы подряд дают множители</span></div></div>
        <div class="list-item"><div class="meta"><strong>💡 Подсказки</strong><span>50/50, подсказка по теме и +10 секунд — по одному разу</span></div></div>
        <div class="list-item"><div class="meta"><strong>❤️ Жизни</strong><span>Можно отключить в настройках и дойти до конца</span></div></div>
        <div class="list-item"><div class="meta"><strong>📚 Факты</strong><span>После ответа читай биологическое объяснение</span></div></div>
      </div>
      <div style="margin-top:18px">
        <button class="btn btn-primary btn-block" data-action="start">▶ НАЧАТЬ</button>
      </div>
    </section>
  `;
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    renderHome();
  };
  app.querySelector('[data-action="start"]').onclick = () => {
    playClick();
    renderSetup();
  };
}

function renderSetup() {
  const diffs = Object.values(DIFFICULTIES);
  app.innerHTML = `
    <section class="screen panel glass">
      <div class="panel-header">
        <h2>Выбор сложности</h2>
        <div class="nav-row">
          <button class="btn btn-ghost btn-sm" data-action="back">← Назад</button>
          <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
        </div>
      </div>
      <div class="grid-2" id="diff-grid">
        ${diffs
          .map(
            (d) => `
          <button class="choice-card" data-diff="${d.id}">
            <span class="emoji">${d.emoji}</span>
            <span class="title">${d.name}</span>
            <span class="desc">${d.description}</span>
          </button>`,
          )
          .join('')}
      </div>
      <h2 style="margin:22px 0 12px;font-family:var(--font-display);font-size:1.35rem">Категория</h2>
      <div class="grid-cats" id="cat-grid">
        ${CATEGORIES.map(
          (c) => `
          <button class="choice-card" data-cat="${c.id}">
            <span class="emoji">${c.emoji}</span>
            <span class="title">${c.name}</span>
          </button>`,
        ).join('')}
      </div>
      <div style="margin-top:20px">
        <button class="btn btn-primary btn-block" id="begin-btn" disabled>▶ НАЧАТЬ ИГРУ</button>
      </div>
    </section>
  `;

  let selectedDiff = null;
  let selectedCat = 'all';

  const beginBtn = app.querySelector('#begin-btn');
  const updateBegin = () => {
    beginBtn.disabled = !selectedDiff;
  };

  app.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.onclick = () => {
      playClick();
      selectedDiff = btn.dataset.diff;
      app.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('selected', b === btn));
      updateBegin();
    };
  });

  const allCatBtn = app.querySelector('[data-cat="all"]');
  if (allCatBtn) allCatBtn.classList.add('selected');

  app.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.onclick = () => {
      playClick();
      selectedCat = btn.dataset.cat;
      app.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('selected', b === btn));
    };
  });

  app.querySelector('[data-action="back"]').onclick = () => {
    playClick();
    renderHome();
  };
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    confirmLeave(() => renderHome());
  };

  beginBtn.onclick = () => {
    playClick();
    startGame(selectedDiff, selectedCat);
  };
}

function startGame(difficulty, category) {
  game = createGameState({ difficulty, category });
  clearSavedGame();
  persistGame();
  renderQuestion();
}

function renderQuestion() {
  if (!game) return renderHome();
  stopTimer();
  answeringLocked = false;
  game.feedback = null;
  game.removedAnswers = [];
  game.paused = false;

  const q = game.questions[game.currentIndex];
  const progress = ((game.currentIndex) / game.questions.length) * 100;
  const livesHtml = settings.lives
    ? `<div class="stat-pill lives">${'❤️'.repeat(Math.max(0, game.lives))}${'🖤'.repeat(Math.max(0, 3 - game.lives))}</div>`
    : '';

  app.innerHTML = `
    <section class="screen game glass">
      <div class="hud">
        <div class="hud-left">
          <div class="stat-pill">🏆 ${game.score}</div>
          ${livesHtml}
        </div>
        <div class="stat-pill timer-pill" id="timer-display">⏱ ${settings.timer ? TIMER_SECONDS : '∞'}</div>
        <div class="hud-right">
          <button class="btn btn-ghost btn-sm" data-action="pause">⏸</button>
          <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="progress-label">
          <span>Вопрос № ${game.currentIndex + 1} из ${game.questions.length}</span>
          <span>🔥 серия: ${game.streak}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      </div>

      <div class="question-card glass" id="q-card">
        <div class="type-badge">${TYPE_EMOJI[q.type] || '🧬'} ${getTypeLabel(q.type)}</div>
        ${q.image ? `<div class="question-image">${q.image}</div>` : ''}
        <div class="question-text">${escapeHtml(q.question)}</div>
        <div class="answers" id="answers"></div>
        <div class="hints">
          <button class="btn btn-secondary btn-sm hint-btn" data-hint="fifty" ${game.hints.fifty ? '' : 'disabled'}>💡 50/50</button>
          <button class="btn btn-secondary btn-sm hint-btn" data-hint="tip" ${game.hints.tip ? '' : 'disabled'}>🔬 ПОДСКАЗКА</button>
          <button class="btn btn-secondary btn-sm hint-btn" data-hint="time" ${game.hints.time && settings.timer ? '' : 'disabled'}>⏱ +10 СЕК</button>
        </div>
        <div id="feedback-slot"></div>
      </div>
    </section>
  `;

  renderAnswers(q);

  app.querySelector('[data-action="pause"]').onclick = () => {
    playClick();
    togglePause();
  };
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    confirmLeave(() => {
      persistGame();
      renderHome();
    });
  };

  app.querySelectorAll('[data-hint]').forEach((btn) => {
    btn.onclick = () => {
      if (answeringLocked || game.paused) return;
      playClick();
      useHint(btn.dataset.hint);
    };
  });

  questionStartedAt = Date.now();
  if (settings.timer) {
    timerLeft = TIMER_SECONDS;
    updateTimerUI();
    timerId = setInterval(onTimerTick, 1000);
  }
  persistGame();
}

function renderAnswers(q) {
  const box = app.querySelector('#answers');
  if (!box) return;
  box.innerHTML = q.answers
    .map((answer, i) => {
      const hidden = game.removedAnswers.includes(i);
      return `
        <button class="answer-btn ${hidden ? 'dimmed' : ''}" data-index="${i}" ${hidden || answeringLocked ? 'disabled' : ''}>
          <span class="letter">${LETTERS[i] || i + 1}</span>
          <span>${escapeHtml(answer)}</span>
        </button>`;
    })
    .join('');

  box.querySelectorAll('.answer-btn').forEach((btn) => {
    btn.onclick = () => {
      if (answeringLocked || game.paused) return;
      selectAnswer(Number(btn.dataset.index));
    };
  });
}

function updateTimerUI() {
  const el = app.querySelector('#timer-display');
  if (!el) return;
  el.textContent = `⏱ ${timerLeft}`;
  el.classList.toggle('warning', timerLeft <= 5);
}

function onTimerTick() {
  if (!game || game.paused || answeringLocked) return;
  timerLeft -= 1;
  updateTimerUI();
  persistGame();
  if (timerLeft <= 0) {
    stopTimer();
    handleTimeout();
  }
}

function togglePause() {
  if (!game || answeringLocked) return;
  game.paused = !game.paused;
  if (game.paused) {
    showModal({
      title: '⏸ Пауза',
      text: 'Игра на паузе. Прогресс сохранён.',
      actions: [
        { label: '▶ Продолжить', primary: true, onClick: () => {
          game.paused = false;
          closeModal();
        }},
        { label: '🏠 На главную', onClick: () => {
          persistGame();
          closeModal();
          renderHome();
        }},
        { label: '🔄 Начать заново', danger: true, onClick: () => {
          closeModal();
          confirmRestart();
        }},
      ],
    });
  }
}

function useHint(type) {
  const q = game.questions[game.currentIndex];
  if (type === 'fifty' && game.hints.fifty) {
    game.hints.fifty = false;
    const wrong = q.answers
      .map((_, i) => i)
      .filter((i) => i !== q.correctAnswer);
    const shuffled = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    game.removedAnswers = shuffled;
    renderAnswers(q);
    app.querySelector('[data-hint="fifty"]').disabled = true;
    toast('💡 Убраны 2 неверных варианта');
  } else if (type === 'tip' && game.hints.tip) {
    game.hints.tip = false;
    app.querySelector('[data-hint="tip"]').disabled = true;
    toast(`🔬 ${q.hint || 'Подумай о ключевых терминах в вопросе'}`);
  } else if (type === 'time' && game.hints.time && settings.timer) {
    game.hints.time = false;
    timerLeft += 10;
    updateTimerUI();
    app.querySelector('[data-hint="time"]').disabled = true;
    toast('⏱ +10 секунд!');
  }
  persistGame();
}

function selectAnswer(index) {
  if (answeringLocked) return;
  answeringLocked = true;
  stopTimer();

  const q = game.questions[game.currentIndex];
  const elapsed = (Date.now() - questionStartedAt) / 1000;
  game.answerTimes.push(elapsed);
  const isCorrect = index === q.correctAnswer;

  const buttons = app.querySelectorAll('.answer-btn');
  buttons.forEach((btn) => {
    btn.disabled = true;
    const i = Number(btn.dataset.index);
    if (i === q.correctAnswer) btn.classList.add('correct');
    if (i === index && !isCorrect) btn.classList.add('wrong');
  });

  const card = app.querySelector('#q-card');
  if (isCorrect) {
    card?.classList.add('flash-ok');
    handleCorrect(elapsed);
  } else {
    card?.classList.add('flash-bad');
    handleWrong(q, false);
  }

  showFeedback(isCorrect, q, false);
  persistGame();
}

function handleCorrect(elapsedSec) {
  playCorrect();
  game.correct += 1;
  game.streak += 1;
  game.maxStreak = Math.max(game.maxStreak, game.streak);

  let gained = 100;
  let comboMul = 1;
  if (game.streak >= 10) comboMul = 3;
  else if (game.streak >= 5) comboMul = 2;

  if (game.streak > 1) gained += 50;
  gained *= comboMul;

  let speedBonus = 0;
  if (elapsedSec <= 5) {
    speedBonus = 50;
    game.hadFastAnswer = true;
  } else if (elapsedSec <= 10) {
    speedBonus = 25;
  }
  gained += speedBonus;
  game.score += gained;

  if (comboMul > 1) {
    playCombo();
    showComboBanner(comboMul);
  }

  game.lastGain = { gained, comboMul, speedBonus, streakBonus: game.streak > 1 };
}

function handleWrong(q, isTimeout) {
  if (isTimeout) playTimeout();
  else playWrong();

  game.wrong += 1;
  game.streak = 0;
  game.lastGain = null;

  if (settings.lives && !game.continueWithoutLives) {
    game.lives -= 1;
  }
}

function showFeedback(isCorrect, q, isTimeout) {
  const slot = app.querySelector('#feedback-slot');
  if (!slot) return;

  let title = '';
  let cls = '';
  if (isTimeout) {
    title = '⏰ ВРЕМЯ ВЫШЛО!';
    cls = 'bad';
  } else if (isCorrect) {
    title = '✅ ПРАВИЛЬНО!';
    cls = 'ok';
  } else {
    title = '❌ НЕПРАВИЛЬНО';
    cls = 'bad';
  }

  const gain = game.lastGain;
  const pointsHtml = gain
    ? `<p class="points-gain">+${gain.gained} очков${gain.comboMul > 1 ? ` (COMBO x${gain.comboMul})` : ''}${gain.speedBonus ? ` · ⚡+${gain.speedBonus}` : ''}${gain.streakBonus ? ' · 🔥 серия' : ''}</p>`
    : '';

  const correctText = !isCorrect || isTimeout
    ? `<p>Правильный ответ: <strong>${escapeHtml(q.answers[q.correctAnswer])}</strong></p>`
    : '';

  slot.innerHTML = `
    <div class="feedback ${cls}">
      <h3>${title}</h3>
      ${pointsHtml}
      ${correctText}
      <div class="fact-box">📚 <strong>БИОЛОГИЧЕСКИЙ ФАКТ</strong><br>${escapeHtml(q.explanation)}</div>
      <div style="margin-top:12px">
        <button class="btn btn-primary btn-block" id="next-btn">Дальше →</button>
      </div>
    </div>
  `;

  const next = () => maybeAfterAnswer();
  slot.querySelector('#next-btn').onclick = () => {
    playClick();
    next();
  };

  if (isTimeout) {
    setTimeout(() => {
      if (game && answeringLocked) next();
    }, 2800);
  }
}

function showComboBanner(mul) {
  const card = app.querySelector('#q-card');
  if (!card) return;
  const el = document.createElement('div');
  el.className = 'combo-banner';
  el.textContent = mul >= 3 ? '🔥🔥 COMBO x3' : '🔥 COMBO x2';
  card.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function maybeAfterAnswer() {
  if (settings.lives && !game.continueWithoutLives && game.lives <= 0) {
    showLivesOutModal();
    return;
  }
  goNextQuestion();
}

function goNextQuestion() {
  game.currentIndex += 1;
  if (game.currentIndex >= game.questions.length) {
    finishGame();
    return;
  }
  // Update progress fill visually to full for last answered
  renderQuestion();
}

function showLivesOutModal() {
  showModal({
    title: '💔 Жизни закончились',
    text: 'Можно продолжить без жизней до конца квиза или завершить игру сейчас.',
    actions: [
      {
        label: 'Продолжить игру',
        primary: true,
        onClick: () => {
          game.continueWithoutLives = true;
          closeModal();
          goNextQuestion();
        },
      },
      {
        label: 'Завершить игру',
        danger: true,
        onClick: () => {
          closeModal();
          finishGame();
        },
      },
    ],
  });
}

function handleTimeout() {
  if (answeringLocked) return;
  answeringLocked = true;
  const q = game.questions[game.currentIndex];
  const elapsed = TIMER_SECONDS;
  game.answerTimes.push(elapsed);

  app.querySelectorAll('.answer-btn').forEach((btn) => {
    btn.disabled = true;
    if (Number(btn.dataset.index) === q.correctAnswer) btn.classList.add('correct');
  });

  app.querySelector('#q-card')?.classList.add('flash-bad');
  handleWrong(q, true);
  showFeedback(false, q, true);
  persistGame();
}

function finishGame() {
  stopTimer();
  game.finished = true;
  clearSavedGame();
  playFinish();

  const totalAnswered = game.correct + game.wrong;
  const accuracy = totalAnswered ? Math.round((game.correct / game.questions.length) * 100) : 0;
  const avgTime =
    game.answerTimes.length > 0
      ? (game.answerTimes.reduce((a, b) => a + b, 0) / game.answerTimes.length).toFixed(1)
      : '0';

  // Profile update
  profile.totalGames += 1;
  profile.correctAnswers += game.correct;
  profile.bestScore = Math.max(profile.bestScore, game.score);
  profile.bestStreak = Math.max(profile.bestStreak, game.maxStreak);
  saveProfile(profile);

  // Achievements
  const newAchievements = [];
  const tryUnlock = (id) => {
    const a = unlockAchievement(id);
    if (a) newAchievements.push(a);
  };
  tryUnlock('first_quiz');
  if (game.maxStreak >= 5) tryUnlock('streak_5');
  if (accuracy >= 90) tryUnlock('accuracy_90');
  if (game.hadFastAnswer) tryUnlock('fast_answer');
  if (game.score >= 1000) tryUnlock('score_1000');
  if (game.difficulty === 'expert') tryUnlock('expert');

  newAchievements.forEach((a, i) => {
    setTimeout(() => {
      playAchievement();
      toast(`${a.emoji} Достижение: ${a.name}`);
    }, 400 + i * 500);
  });

  if (accuracy >= 75 && settings.animations) {
    launchConfetti();
  }

  renderResults({ accuracy, avgTime });
}

function renderResults({ accuracy, avgTime }) {
  const rank = getRankTitle(accuracy);
  app.innerHTML = `
    <section class="screen results glass">
      <div class="trophy">🎉</div>
      <h2>КВИЗ ЗАВЕРШЁН!</h2>
      <div class="rank-title">${rank}</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">🏆 Итоговый счёт</div><div class="value">${game.score}</div></div>
        <div class="stat-card"><div class="label">✅ Правильных</div><div class="value">${game.correct}</div></div>
        <div class="stat-card"><div class="label">❌ Неправильных</div><div class="value">${game.wrong}</div></div>
        <div class="stat-card"><div class="label">🎯 Точность</div><div class="value">${accuracy}%</div></div>
        <div class="stat-card"><div class="label">⏱ Среднее время</div><div class="value">${avgTime} с</div></div>
        <div class="stat-card"><div class="label">🔥 Макс. серия</div><div class="value">${game.maxStreak}</div></div>
      </div>
      <div class="name-form">
        <input id="player-name" maxlength="20" placeholder="Твоё имя" value="${escapeHtml(profile.name)}" />
        <button class="btn btn-primary" id="save-score">💾 Сохранить рекорд</button>
      </div>
      <div class="results-actions">
        <button class="btn btn-primary" data-action="again">🔄 Ещё раз</button>
        <button class="btn btn-secondary" data-action="leaderboard">🏆 Рекорды</button>
        <button class="btn btn-secondary" data-action="home">🏠 Главная</button>
      </div>
    </section>
  `;

  let savedOnce = false;
  app.querySelector('#save-score').onclick = () => {
    playClick();
    const name = app.querySelector('#player-name').value.trim() || 'Игрок';
    profile.name = name;
    saveProfile(profile);
    if (!savedOnce) {
      addLeaderboardEntry({
        name,
        score: game.score,
        accuracy,
        difficulty: game.difficulty,
      });
      savedOnce = true;
      toast('🏆 Результат сохранён!');
      app.querySelector('#save-score').textContent = '✓ Сохранено';
      app.querySelector('#save-score').disabled = true;
    }
  };

  app.querySelector('[data-action="again"]').onclick = () => {
    playClick();
    renderSetup();
  };
  app.querySelector('[data-action="leaderboard"]').onclick = () => {
    playClick();
    renderLeaderboard();
  };
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    renderHome();
  };
}

function renderLeaderboard() {
  const list = getLeaderboard();
  app.innerHTML = `
    <section class="screen panel glass">
      <div class="panel-header">
        <h2>🏆 Таблица рекордов</h2>
        <div class="nav-row">
          <button class="btn btn-ghost btn-sm" data-action="home">🏠 Главная</button>
        </div>
      </div>
      ${
        list.length === 0
          ? `<div class="empty-state">Пока нет результатов.<br>Пройди квиз и стань первым!</div>`
          : `<div class="list">
              ${list
                .map(
                  (item, i) => `
                <div class="list-item">
                  <div class="rank">${i + 1}</div>
                  <div class="meta">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${DIFFICULTIES[item.difficulty]?.name || item.difficulty} · ${item.accuracy || 0}%</span>
                  </div>
                  <div class="score">${item.score}</div>
                </div>`,
                )
                .join('')}
            </div>`
      }
    </section>
  `;
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    renderHome();
  };
}

function renderProfile() {
  const ach = getAllAchievements();
  app.innerHTML = `
    <section class="screen panel glass">
      <div class="panel-header">
        <h2>👤 Профиль игрока</h2>
        <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
      </div>
      <div class="name-form" style="margin-bottom:16px">
        <input id="profile-name" maxlength="20" value="${escapeHtml(profile.name)}" />
        <button class="btn btn-secondary" id="save-name">Сохранить имя</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">🏆 Лучший результат</div><div class="value">${profile.bestScore}</div></div>
        <div class="stat-card"><div class="label">🎯 Всего игр</div><div class="value">${profile.totalGames}</div></div>
        <div class="stat-card"><div class="label">✅ Правильных ответов</div><div class="value">${profile.correctAnswers}</div></div>
        <div class="stat-card"><div class="label">🔥 Лучшая серия</div><div class="value">${profile.bestStreak}</div></div>
      </div>
      <h3 style="font-family:var(--font-display);margin-top:8px">Достижения</h3>
      <div class="achievements">
        ${ach
          .map(
            (a) => `
          <div class="ach-card ${a.unlocked ? 'unlocked' : ''}">
            <div class="emoji">${a.emoji}</div>
            <strong>${a.name}</strong>
            <span>${a.description}</span>
          </div>`,
          )
          .join('')}
      </div>
    </section>
  `;
  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    renderHome();
  };
  app.querySelector('#save-name').onclick = () => {
    playClick();
    profile.name = app.querySelector('#profile-name').value.trim() || 'Игрок';
    saveProfile(profile);
    toast('👤 Имя сохранено');
  };
}

function renderSettings() {
  const row = (key, title, desc) => `
    <div class="setting-row">
      <div class="info"><strong>${title}</strong><span>${desc}</span></div>
      <button class="toggle ${settings[key] ? 'on' : ''}" data-key="${key}" aria-label="${title}"></button>
    </div>`;

  app.innerHTML = `
    <section class="screen panel glass">
      <div class="panel-header">
        <h2>⚙ Настройки</h2>
        <button class="btn btn-ghost btn-sm" data-action="home">🏠</button>
      </div>
      <div class="settings-list">
        ${row('sound', '🔊 Звук', 'Звуковые эффекты ON/OFF')}
        ${row('darkTheme', '🌙 Тёмная тема', 'Тёмная / светлая тема')}
        ${row('timer', '⏱ Таймер', 'Ограничение 20 секунд на вопрос')}
        ${row('lives', '❤️ Режим жизней', '3 жизни за неправильные ответы')}
        ${row('animations', '🎨 Анимации', 'Микроанимации и эффекты')}
      </div>
    </section>
  `;

  app.querySelector('[data-action="home"]').onclick = () => {
    playClick();
    renderHome();
  };

  app.querySelectorAll('.toggle').forEach((btn) => {
    btn.onclick = () => {
      playClick();
      const key = btn.dataset.key;
      settings[key] = !settings[key];
      saveSettings(settings);
      setSoundEnabled(settings.sound);
      applyTheme();
      applyAnimationFlag();
      btn.classList.toggle('on', settings[key]);
    };
  });
}

/* ===== Modals ===== */
function showModal({ title, text, actions }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal glass">
      <h3>${title}</h3>
      <p>${text}</p>
      <div class="modal-actions"></div>
    </div>
  `;
  const actionsBox = overlay.querySelector('.modal-actions');
  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-secondary'}`;
    btn.textContent = a.label;
    btn.onclick = () => {
      playClick();
      a.onClick();
    };
    actionsBox.appendChild(btn);
  });
  document.body.appendChild(overlay);
}

function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

function showResumeModal(saved) {
  showModal({
    title: '💾 Незавершённая игра',
    text: `Найти продолжение? Вопрос ${saved.currentIndex + 1} из ${saved.questions.length}, счёт ${saved.score}.`,
    actions: [
      {
        label: '▶ Продолжить',
        primary: true,
        onClick: () => {
          game = saved;
          timerLeft = saved.timerLeft || TIMER_SECONDS;
          closeModal();
          if (game.feedback) {
            // resume mid-feedback roughly by re-showing question flow
            game.feedback = null;
          }
          renderQuestion();
        },
      },
      {
        label: 'Новая игра',
        onClick: () => {
          clearSavedGame();
          closeModal();
          renderHome();
        },
      },
    ],
  });
}

function confirmLeave(onConfirm) {
  if (!game || game.finished) {
    onConfirm();
    return;
  }
  showModal({
    title: 'Выйти из игры?',
    text: 'Прогресс будет сохранён — можно продолжить позже.',
    actions: [
      {
        label: 'Сохранить и выйти',
        primary: true,
        onClick: () => {
          persistGame();
          closeModal();
          stopTimer();
          onConfirm();
        },
      },
      {
        label: 'Отмена',
        onClick: () => closeModal(),
      },
    ],
  });
}

function confirmRestart() {
  showModal({
    title: 'Начать заново?',
    text: 'Текущий прогресс этой игры будет сброшен.',
    actions: [
      {
        label: '🔄 Да, заново',
        danger: true,
        onClick: () => {
          clearSavedGame();
          closeModal();
          const { difficulty, category } = game;
          startGame(difficulty, category);
        },
      },
      {
        label: 'Отмена',
        onClick: () => {
          closeModal();
          if (game) game.paused = false;
        },
      },
    ],
  });
}

/* ===== Confetti ===== */
function launchConfetti() {
  const colors = ['#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#fbbf24', '#f97316'];
  for (let i = 0; i < 48; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

/* beforeunload hint */
window.addEventListener('beforeunload', () => {
  if (game && !game.finished) persistGame();
});
