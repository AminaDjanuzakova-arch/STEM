/**
 * Опциональная отправка результатов в Supabase.
 * Работает, если заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.
 * Без ключей локальная логика (localStorage) продолжает работать как раньше.
 */

const TABLE = 'bio_quiz_scores';

function getConfig() {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key, enabled: Boolean(url && key) };
}

export function isSupabaseEnabled() {
  return getConfig().enabled;
}

/**
 * Сохранить результат в таблицу bio_quiz_scores.
 * Ожидаемые колонки: name, score, accuracy, difficulty, max_streak, created_at
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function saveScoreToSupabase(entry) {
  const { url, key, enabled } = getConfig();
  if (!enabled) {
    return { ok: true, skipped: true };
  }

  const payload = {
    name: entry.name || 'Игрок',
    score: Number(entry.score) || 0,
    accuracy: Number(entry.accuracy) || 0,
    difficulty: entry.difficulty || 'medium',
    max_streak: Number(entry.maxStreak) || 0,
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${url}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'network error' };
  }
}

/**
 * Загрузить топ результатов из Supabase (если настроено).
 */
export async function fetchLeaderboardFromSupabase(limit = 10) {
  const { url, key, enabled } = getConfig();
  if (!enabled) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/${TABLE}?select=name,score,accuracy,difficulty,created_at&order=score.desc&limit=${limit}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map((r) => ({
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
