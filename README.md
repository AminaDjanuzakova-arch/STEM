# 🧬 BIO QUIZ — Путешествие в мир биологии

Интерактивный образовательный квиз по биологии для школьников.  
Два интерфейса: **Ученик** и **Учитель** (сессии, QR, realtime-лидерборд, аналитика).

## Возможности

- Интерфейс ученика: имя + 4-значный код сессии / ссылка / QR
- Панель учителя: PIN, создание сессий, QR, таблица лидеров, карточка ученика
- 136 вопросов, 4 сложности, 10 категорий, анимации и детский UI
- Детальный лог ответов (верно/ошибка + правильный ответ)
- localStorage fallback без Supabase; опциональная синхронизация с облаком

## Запуск

```bash
npm install
npm run dev
```

Открой `http://localhost:4321`.

- Ученик: `#/student` или `#/student?code=4821`
- Учитель: `#/teacher` (PIN по умолчанию `1234`)

## Supabase

1. Скопируй `.env.example` → `.env`
2. Выполни SQL из `sql/schema.sql` в Supabase SQL Editor
3. Укажи `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, опционально `VITE_TEACHER_PIN`

Таблицы: `quiz_sessions`, `quiz_results` (JSONB `answers`), опционально `bio_quiz_scores`.

Без ключей всё работает локально (удобно для демо).

## Структура

```
index.html
sql/schema.sql
src/
  main.js       — квиз ученика + роутинг
  teacher.js    — панель учителя
  supabase.js   — Supabase REST + local fallback
  questions.js  — база вопросов
  media.js      — иллюстрации
  audio.js / storage.js / style.css
```
