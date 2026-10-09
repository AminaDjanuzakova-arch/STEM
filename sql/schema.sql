-- BIO QUIZ — схема Supabase (сессии + результаты с логом ответов)
-- Выполни в SQL Editor проекта Supabase.

-- Сессии, которые создаёт учитель
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text default 'Классный квиз',
  status text not null default 'active' check (status in ('active', 'closed')),
  difficulty text default 'easy',
  category text default 'all',
  created_at timestamptz not null default now()
);

create index if not exists quiz_sessions_code_idx on public.quiz_sessions (code);
create index if not exists quiz_sessions_status_idx on public.quiz_sessions (status);

-- Результаты учеников (детальный лог в answers JSONB)
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  session_code text not null references public.quiz_sessions (code) on delete cascade,
  student_name text not null,
  score integer not null default 0,
  accuracy integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  max_streak integer not null default 0,
  avg_time numeric(6,1) default 0,
  total_time numeric(8,1) default 0,
  difficulty text,
  category text,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_results_session_idx on public.quiz_results (session_code);
create index if not exists quiz_results_score_idx on public.quiz_results (score desc);

-- Совместимость со старой таблицей рекордов (опционально)
create table if not exists public.bio_quiz_scores (
  id uuid primary key default gen_random_uuid(),
  name text,
  score integer,
  accuracy integer,
  difficulty text,
  max_streak integer,
  created_at timestamptz default now()
);

-- Realtime: включи репликацию для quiz_results в Dashboard → Database → Replication
alter table public.quiz_results replica identity full;

-- RLS (демо: открытый доступ по anon key; для продакшена ужесточи политики)
alter table public.quiz_sessions enable row level security;
alter table public.quiz_results enable row level security;

drop policy if exists "sessions_read" on public.quiz_sessions;
drop policy if exists "sessions_write" on public.quiz_sessions;
drop policy if exists "results_read" on public.quiz_results;
drop policy if exists "results_write" on public.quiz_results;

create policy "sessions_read" on public.quiz_sessions for select using (true);
create policy "sessions_write" on public.quiz_sessions for insert with check (true);
create policy "sessions_update" on public.quiz_sessions for update using (true);
create policy "results_read" on public.quiz_results for select using (true);
create policy "results_write" on public.quiz_results for insert with check (true);
