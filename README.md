# 🧬 BIO QUIZ — два отдельных сайта

Интерактивный квиз по биологии: **сайт ученика** и **сайт учителя** — разные HTML-страницы, без общего экрана выбора роли.

## Сайты

| Сайт | Файл | URL |
|------|------|-----|
| Ученик | `index.html` | http://localhost:4321/ |
| Учитель | `teacher.html` | http://localhost:4321/teacher.html |

Ученик **не видит** ссылок и кнопок на панель учителя.

### Ученик (`/`)
- Имя + 4-значный код сессии
- Вход по QR / ссылке `/?code=4821`
- Полный игровой квиз (картинки, таймер, прогресс, анимации, конфетти)
- Автоотправка результата и лога ответов

### Учитель (`/teacher.html`)
- Вход по PIN (по умолчанию `1234`)
- Создание сессии → крупный код + QR на сайт ученика
- LIVE-лидерборд, карточка ученика, статистика класса

## Запуск

```bash
npm install
npm run dev
```

Сборка (в `dist/` появятся `index.html` и `teacher.html`):

```bash
npm run build
```

### Vercel

В корне есть `vercel.json`: `buildCommand` → `npm run build`, `outputDirectory` → `dist`.  
После деплоя:
- ученик: `https://your-app.vercel.app/`
- учитель: `https://your-app.vercel.app/teacher` (или `/teacher.html`)

## Supabase

1. `.env.example` → `.env`
2. Выполни `sql/schema.sql` в Supabase
3. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, опционально `VITE_TEACHER_PIN`

Без ключей работает локальный fallback (удобно для демо).

## Структура

```
index.html          — сайт ученика
teacher.html        — сайт учителя
sql/schema.sql
src/
  main.js           — ученик
  teacher-main.js   — точка входа учителя
  teacher.js        — панель учителя
  supabase.js       — API + local fallback
  questions.js, media.js, audio.js, storage.js, style.css
```
