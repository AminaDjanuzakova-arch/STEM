/**
 * Backend для BIO QUIZ: Supabase REST или локальный fallback (localStorage).
 * Без ключей приложение полностью работает офлайн — удобно для демо и E2E.
 */

const SESSIONS_TABLE = 'quiz_sessions';
const RESULTS_TABLE = 'quiz_results';
const LEGACY_SCORES = 'bio_quiz_scores';

const LOCAL_KEYS = {
  sessions: 'bioquiz_v2_sessions',
  results: 'bioquiz_v2_results',
};

function getConfig() {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key, enabled: Boolean(url && key) };
}

export function isSupabaseEnabled() {
  return getConfig().enabled;
}

export function getTeacherPin() {
  return String(import.meta.env.VITE_TEACHER_PIN || '1234');
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function localWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('bioquiz-data', { detail: { key } }));
}

async function sbFetch(path, options = {}) {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Генерирует уникальный 4-значный код сессии */
export async function generateSessionCode() {
  for (let i = 0; i < 30; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const existing = await getSessionByCode(code);
    if (!existing) return code;
  }
  return String(Date.now()).slice(-4);
}

export async function createSession({ title, difficulty, category } = {}) {
  const code = await generateSessionCode();
  const row = {
    id: uuid(),
    code,
    title: title || 'Классный квиз',
    status: 'active',
    difficulty: difficulty || 'easy',
    category: category || 'all',
    created_at: new Date().toISOString(),
  };

  if (!getConfig().enabled) {
    const list = localRead(LOCAL_KEYS.sessions, []);
    list.unshift(row);
    localWrite(LOCAL_KEYS.sessions, list);
    return row;
  }

  const data = await sbFetch(SESSIONS_TABLE, {
    method: 'POST',
    body: JSON.stringify({
      code: row.code,
      title: row.title,
      status: row.status,
      difficulty: row.difficulty,
      category: row.category,
    }),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function getSessionByCode(code) {
  const normalized = String(code || '').trim();
  if (!/^\d{4}$/.test(normalized)) return null;

  if (!getConfig().enabled) {
    const list = localRead(LOCAL_KEYS.sessions, []);
    return list.find((s) => s.code === normalized && s.status === 'active') || null;
  }

  const data = await sbFetch(
    `${SESSIONS_TABLE}?code=eq.${normalized}&status=eq.active&select=*&limit=1`,
  );
  return data?.[0] || null;
}

export async function listSessions() {
  if (!getConfig().enabled) {
    return localRead(LOCAL_KEYS.sessions, []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }
  return (
    (await sbFetch(`${SESSIONS_TABLE}?select=*&order=created_at.desc`)) || []
  );
}

export async function closeSession(code) {
  if (!getConfig().enabled) {
    const list = localRead(LOCAL_KEYS.sessions, []);
    const next = list.map((s) => (s.code === code ? { ...s, status: 'closed' } : s));
    localWrite(LOCAL_KEYS.sessions, next);
    return true;
  }
  await sbFetch(`${SESSIONS_TABLE}?code=eq.${code}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'closed' }),
    prefer: 'return=minimal',
  });
  return true;
}

/**
 * Сохранить результат ученика с логом ответов.
 */
export async function saveQuizResult(entry) {
  const payload = {
    id: uuid(),
    session_code: entry.sessionCode || null,
    student_name: entry.studentName || entry.name || 'Ученик',
    score: Number(entry.score) || 0,
    accuracy: Number(entry.accuracy) || 0,
    correct_count: Number(entry.correctCount ?? entry.correct) || 0,
    wrong_count: Number(entry.wrongCount ?? entry.wrong) || 0,
    max_streak: Number(entry.maxStreak) || 0,
    avg_time: Number(entry.avgTime) || 0,
    total_time: Number(entry.totalTime) || 0,
    difficulty: entry.difficulty || 'medium',
    category: entry.category || 'all',
    answers: entry.answers || [],
    created_at: new Date().toISOString(),
  };

  // Локальный лидерборд (всегда)
  try {
    const legacyKey = 'bioquiz_leaderboard';
    const list = localRead(legacyKey, []);
    list.push({
      name: payload.student_name,
      score: payload.score,
      accuracy: payload.accuracy,
      difficulty: payload.difficulty,
      date: payload.created_at,
    });
    list.sort((a, b) => b.score - a.score);
    localWrite(legacyKey, list.slice(0, 10));
  } catch {
    /* ignore */
  }

  if (!payload.session_code) {
    // Одиночная игра без сессии — legacy scores если есть Supabase
    if (getConfig().enabled) {
      try {
        await sbFetch(LEGACY_SCORES, {
          method: 'POST',
          body: JSON.stringify({
            name: payload.student_name,
            score: payload.score,
            accuracy: payload.accuracy,
            difficulty: payload.difficulty,
            max_streak: payload.max_streak,
          }),
          prefer: 'return=minimal',
        });
      } catch {
        /* ignore legacy errors */
      }
    }
    return { ok: true, skippedSession: true, result: payload };
  }

  if (!getConfig().enabled) {
    const list = localRead(LOCAL_KEYS.results, []);
    list.push(payload);
    localWrite(LOCAL_KEYS.results, list);
    return { ok: true, local: true, result: payload };
  }

  try {
    const data = await sbFetch(RESULTS_TABLE, {
      method: 'POST',
      body: JSON.stringify({
        session_code: payload.session_code,
        student_name: payload.student_name,
        score: payload.score,
        accuracy: payload.accuracy,
        correct_count: payload.correct_count,
        wrong_count: payload.wrong_count,
        max_streak: payload.max_streak,
        avg_time: payload.avg_time,
        total_time: payload.total_time,
        difficulty: payload.difficulty,
        category: payload.category,
        answers: payload.answers,
      }),
    });
    return { ok: true, result: Array.isArray(data) ? data[0] : data };
  } catch (err) {
    // fallback local
    const list = localRead(LOCAL_KEYS.results, []);
    list.push(payload);
    localWrite(LOCAL_KEYS.results, list);
    return { ok: true, local: true, warning: err.message, result: payload };
  }
}

export async function getSessionResults(sessionCode) {
  const code = String(sessionCode || '').trim();
  if (!code) return [];

  if (!getConfig().enabled) {
    return localRead(LOCAL_KEYS.results, [])
      .filter((r) => r.session_code === code)
      .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
  }

  const data = await sbFetch(
    `${RESULTS_TABLE}?session_code=eq.${code}&select=*&order=score.desc`,
  );
  return data || [];
}

/** @deprecated совместимость со старым API */
export async function saveScoreToSupabase(entry) {
  const res = await saveQuizResult({
    ...entry,
    studentName: entry.name,
    correctCount: entry.correct,
    wrongCount: entry.wrong,
    answers: entry.answers || [],
  });
  return { ok: res.ok, skipped: res.skippedSession, error: res.warning };
}

/** @deprecated */
export async function fetchLeaderboardFromSupabase(limit = 10) {
  if (!getConfig().enabled) {
    const list = localRead('bioquiz_leaderboard', []);
    return list.slice(0, limit);
  }
  try {
    const data = await sbFetch(
      `${LEGACY_SCORES}?select=name,score,accuracy,difficulty,created_at&order=score.desc&limit=${limit}`,
    );
    return (data || []).map((r) => ({
      name: r.name,
      score: r.score,
      accuracy: r.accuracy,
      difficulty: r.difficulty,
      date: r.created_at,
    }));
  } catch {
    return null;
  }
}

/**
 * Подписка на обновления результатов сессии (polling + local events).
 * @returns {() => void} unsubscribe
 */
export function subscribeSessionResults(sessionCode, onUpdate, intervalMs = 2000) {
  let stopped = false;
  let timer = null;

  const pull = async () => {
    if (stopped) return;
    try {
      const rows = await getSessionResults(sessionCode);
      onUpdate(rows);
    } catch {
      /* ignore */
    }
  };

  pull();
  timer = setInterval(pull, intervalMs);

  const onLocal = (e) => {
    if (e.detail?.key === LOCAL_KEYS.results || e.key === LOCAL_KEYS.results) {
      pull();
    }
  };
  window.addEventListener('bioquiz-data', onLocal);
  window.addEventListener('storage', onLocal);

  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener('bioquiz-data', onLocal);
    window.removeEventListener('storage', onLocal);
  };
}

/** Ссылка на отдельный сайт ученика (index.html), не на панель учителя */
export function buildStudentJoinUrl(code) {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('code', String(code));
  return url.toString();
}

export function qrImageUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

/** Классная аналитика по результатам */
export function computeClassAnalytics(results) {
  if (!results.length) {
    return {
      averageScore: 0,
      averageAccuracy: 0,
      hardestQuestion: null,
      totalStudents: 0,
    };
  }

  const avgScore = Math.round(
    results.reduce((s, r) => s + (r.score || 0), 0) / results.length,
  );
  const avgAcc = Math.round(
    results.reduce((s, r) => s + (r.accuracy || 0), 0) / results.length,
  );

  /** @type {Map<string|number, { wrong: number, total: number, question: string, correctText: string }>} */
  const qStats = new Map();
  for (const r of results) {
    const answers = Array.isArray(r.answers) ? r.answers : [];
    for (const a of answers) {
      const key = a.questionId ?? a.question;
      if (!qStats.has(key)) {
        qStats.set(key, {
          wrong: 0,
          total: 0,
          question: a.question || String(key),
          correctText: a.correctText || '',
        });
      }
      const st = qStats.get(key);
      st.total += 1;
      if (!a.isCorrect) st.wrong += 1;
    }
  }

  let hardest = null;
  for (const st of qStats.values()) {
    const rate = st.total ? st.wrong / st.total : 0;
    if (!hardest || rate > hardest.rate) {
      hardest = { ...st, rate };
    }
  }

  return {
    averageScore: avgScore,
    averageAccuracy: avgAcc,
    hardestQuestion: hardest,
    totalStudents: results.length,
  };
}
