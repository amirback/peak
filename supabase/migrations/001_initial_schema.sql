-- ============================================================
-- Peak LMS — полная схема базы данных
-- Запустить в Supabase SQL Editor
-- ============================================================

-- Расширения
create extension if not exists "uuid-ossp";

-- ============================================================
-- Профили пользователей
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('student', 'teacher', 'admin')) default 'student',
  full_name text not null default '',
  avatar_url text,
  locale text not null default 'ru' check (locale in ('ru', 'kz', 'en')),
  bio text,
  xp integer not null default 0,
  streak_count integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'locale', 'ru')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Курсы
-- ============================================================
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Уроки
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  order_index integer not null default 0,
  deadline timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Материалы к урокам
-- ============================================================
create table if not exists public.lesson_materials (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null
);

-- ============================================================
-- Записи на курсы
-- ============================================================
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique(student_id, course_id)
);

-- ============================================================
-- Прогресс по урокам
-- ============================================================
create table if not exists public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null check (status in ('not_started', 'in_progress', 'completed')) default 'not_started',
  time_spent_seconds integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  unique(student_id, lesson_id)
);

-- ============================================================
-- Тесты
-- ============================================================
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade unique,
  title text not null
);

create table if not exists public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  type text not null check (type in ('single', 'multiple', 'open')),
  options jsonb,
  correct_answer jsonb,
  order_index integer not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score numeric not null default 0,
  answers jsonb not null default '{}',
  attempted_at timestamptz not null default now()
);

-- ============================================================
-- Сообщения (чат)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Комментарии к урокам
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Уведомления
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_message','new_comment','new_lesson','badge_earned','deadline_reminder','course_completed')),
  content text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Бейджи
-- ============================================================
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_type)
);

-- ============================================================
-- Сертификаты
-- ============================================================
create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique(student_id, course_id)
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- profiles
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_select_all_authenticated" on public.profiles for select using (auth.role() = 'authenticated');

-- courses
alter table public.courses enable row level security;
create policy "courses_select_published" on public.courses for select using (is_published = true or teacher_id = auth.uid());
create policy "courses_insert_teacher" on public.courses for insert with check (teacher_id = auth.uid());
create policy "courses_update_teacher" on public.courses for update using (teacher_id = auth.uid());
create policy "courses_delete_teacher" on public.courses for delete using (teacher_id = auth.uid());

-- lessons
alter table public.lessons enable row level security;
create policy "lessons_select" on public.lessons for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.is_published = true or c.teacher_id = auth.uid()))
);
create policy "lessons_insert_teacher" on public.lessons for insert with check (
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);
create policy "lessons_update_teacher" on public.lessons for update using (
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);
create policy "lessons_delete_teacher" on public.lessons for delete using (
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);

-- lesson_materials
alter table public.lesson_materials enable row level security;
create policy "materials_select" on public.lesson_materials for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and (c.is_published = true or c.teacher_id = auth.uid()))
);
create policy "materials_insert_teacher" on public.lesson_materials for insert with check (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);
create policy "materials_delete_teacher" on public.lesson_materials for delete using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);

-- enrollments
alter table public.enrollments enable row level security;
create policy "enrollments_select_own" on public.enrollments for select using (student_id = auth.uid());
create policy "enrollments_select_teacher" on public.enrollments for select using (
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);
create policy "enrollments_insert_student" on public.enrollments for insert with check (student_id = auth.uid());
create policy "enrollments_delete" on public.enrollments for delete using (
  student_id = auth.uid() or
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);

-- lesson_progress
alter table public.lesson_progress enable row level security;
create policy "progress_select_own" on public.lesson_progress for select using (student_id = auth.uid());
create policy "progress_select_teacher" on public.lesson_progress for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);
create policy "progress_insert_own" on public.lesson_progress for insert with check (student_id = auth.uid());
create policy "progress_update_own" on public.lesson_progress for update using (student_id = auth.uid());

-- quizzes
alter table public.quizzes enable row level security;
create policy "quizzes_select" on public.quizzes for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and (c.is_published = true or c.teacher_id = auth.uid()))
);
create policy "quizzes_insert_teacher" on public.quizzes for insert with check (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);
create policy "quizzes_update_teacher" on public.quizzes for update using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);
create policy "quizzes_delete_teacher" on public.quizzes for delete using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.teacher_id = auth.uid())
);

-- quiz_questions
alter table public.quiz_questions enable row level security;
create policy "quiz_questions_select" on public.quiz_questions for select using (
  exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id where q.id = quiz_id and (c.is_published = true or c.teacher_id = auth.uid()))
);
create policy "quiz_questions_write_teacher" on public.quiz_questions for all using (
  exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id where q.id = quiz_id and c.teacher_id = auth.uid())
);

-- quiz_attempts
alter table public.quiz_attempts enable row level security;
create policy "attempts_select_own" on public.quiz_attempts for select using (student_id = auth.uid());
create policy "attempts_select_teacher" on public.quiz_attempts for select using (
  exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id where q.id = quiz_id and c.teacher_id = auth.uid())
);
create policy "attempts_insert_own" on public.quiz_attempts for insert with check (student_id = auth.uid());

-- messages
alter table public.messages enable row level security;
create policy "messages_select_participant" on public.messages for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "messages_insert_own" on public.messages for insert with check (sender_id = auth.uid());
create policy "messages_update_receiver" on public.messages for update using (receiver_id = auth.uid());

-- comments
alter table public.comments enable row level security;
create policy "comments_select" on public.comments for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and (c.is_published = true or c.teacher_id = auth.uid()))
);
create policy "comments_insert_enrolled" on public.comments for insert with check (user_id = auth.uid());
create policy "comments_delete_own" on public.comments for delete using (user_id = auth.uid());

-- notifications
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications for insert with check (true);

-- badges
alter table public.badges enable row level security;
create policy "badges_select" on public.badges for select using (user_id = auth.uid() or true);
create policy "badges_insert" on public.badges for insert with check (true);

-- certificates
alter table public.certificates enable row level security;
create policy "certificates_select_own" on public.certificates for select using (student_id = auth.uid() or true);
create policy "certificates_insert" on public.certificates for insert with check (true);

-- ============================================================
-- Индексы для производительности
-- ============================================================
create index if not exists idx_lessons_course_id on public.lessons(course_id);
create index if not exists idx_enrollments_student_id on public.enrollments(student_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_lesson_progress_student_id on public.lesson_progress(student_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress(lesson_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_comments_lesson_id on public.comments(lesson_id);

-- ============================================================
-- Storage бакеты
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('course-covers', 'course-covers', true),
  ('lesson-videos', 'lesson-videos', true),
  ('lesson-materials', 'lesson-materials', true)
on conflict (id) do nothing;

-- Storage policies
create policy "avatars_upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_select" on storage.objects for select using (bucket_id = 'avatars');

create policy "covers_upload" on storage.objects for insert with check (bucket_id = 'course-covers' and auth.role() = 'authenticated');
create policy "covers_select" on storage.objects for select using (bucket_id = 'course-covers');

create policy "videos_upload" on storage.objects for insert with check (bucket_id = 'lesson-videos' and auth.role() = 'authenticated');
create policy "videos_select" on storage.objects for select using (bucket_id = 'lesson-videos');

create policy "materials_upload" on storage.objects for insert with check (bucket_id = 'lesson-materials' and auth.role() = 'authenticated');
create policy "materials_select" on storage.objects for select using (bucket_id = 'lesson-materials');

-- ============================================================
-- Realtime: включить публикацию для realtime-чат и уведомлений
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;
