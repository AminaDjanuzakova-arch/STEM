/**
 * Работа с localStorage: настройки, профиль, рекорды, сохранение игры
 */

const KEYS = {
  settings: 'bioquiz_settings',
  profile: 'bioquiz_profile',
  leaderboard: 'bioquiz_leaderboard',
  achievements: 'bioquiz_achievements',
  savedGame: 'bioquiz_saved_game',
};

const DEFAULT_SETTINGS = {
  sound: true,
  darkTheme: true,
  timer: true,
  lives: true,
  animations: true,
};

const DEFAULT_PROFILE = {
  name: 'Игрок',
  bestScore: 0,
  totalGames: 0,
  correctAnswers: 0,
  bestStreak: 0,
};

const ALL_ACHIEVEMENTS = [
  { id: 'first_quiz', name: 'Первый квиз', emoji: '🏅', description: 'Заверши первую игру' },
  { id: 'streak_5', name: 'Серия из 5', emoji: '🔥', description: '5 правильных подряд' },
  { id: 'accuracy_90', name: '90% правильных', emoji: '🧬', description: 'Набери 90% и выше' },
  { id: 'fast_answer', name: 'Быстрый ответ', emoji: '⚡', description: 'Ответь быстрее 5 секунд' },
  { id: 'score_1000', name: '1000 очков', emoji: '🏆', description: 'Набери 1000+ очков за игру' },
  { id: 'expert', name: 'Эксперт', emoji: '👑', description: 'Пройди режим Эксперт' },
];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return { ...structuredClone(fallback), ...JSON.parse(raw) };
  } catch {
    return structuredClone(fallback);
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
}

export function getSettings() {
  return read(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings) {
  write(KEYS.settings, { ...DEFAULT_SETTINGS, ...settings });
}

export function getProfile() {
  return read(KEYS.profile, DEFAULT_PROFILE);
}

export function saveProfile(profile) {
  write(KEYS.profile, { ...DEFAULT_PROFILE, ...profile });
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(KEYS.leaderboard);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(entry) {
  const list = getLeaderboard();
  list.push({
    name: entry.name || 'Игрок',
    score: entry.score || 0,
    accuracy: entry.accuracy || 0,
    difficulty: entry.difficulty || 'medium',
    date: new Date().toISOString(),
  });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  write(KEYS.leaderboard, top);
  return top;
}

export function getAchievements() {
  try {
    const raw = localStorage.getItem(KEYS.achievements);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function unlockAchievement(id) {
  const unlocked = getAchievements();
  if (unlocked.includes(id)) return null;
  unlocked.push(id);
  write(KEYS.achievements, unlocked);
  return ALL_ACHIEVEMENTS.find((a) => a.id === id) || null;
}

export function getAllAchievements() {
  const unlocked = getAchievements();
  return ALL_ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: unlocked.includes(a.id),
  }));
}

export function saveGame(state) {
  write(KEYS.savedGame, state);
}

export function loadSavedGame() {
  try {
    const raw = localStorage.getItem(KEYS.savedGame);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(KEYS.savedGame);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_SETTINGS, DEFAULT_PROFILE, ALL_ACHIEVEMENTS };
