# Peak — Образовательная платформа

Современный LMS для учеников и преподавателей Казахстана. Курсы, тесты, чат в реальном времени, прогресс, геймификация, сертификаты.

## Что внутри

- **Роли:** ученик / учитель / администратор
- **Учитель:** создаёт курсы и уроки (текст, видео, файлы), drag-and-drop порядок, тесты с автопроверкой, аналитика учеников
- **Ученик:** каталог курсов, прохождение уроков, трекинг прогресса, тесты, комментарии
- **Чат:** личные сообщения в реальном времени (Supabase Realtime)
- **Геймификация:** XP, уровни, серия дней, бейджи, лидерборд
- **Уведомления:** realtime в шапке сайта
- **Сертификат:** автоматически при 100% прохождении курса
- **3 языка:** русский, казахский, английский

## Технологии

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Tailwind CSS
- TipTap (rich-text редактор)
- dnd-kit (drag-and-drop)
- Recharts (графики)
- next-intl (i18n)
- React Hook Form + Zod

## Как запустить

### 1. Создайте проект в Supabase

Зайдите на [supabase.com](https://supabase.com), создайте новый проект. Скопируйте:
- `Project URL` — это `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` — это `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` — это `SUPABASE_SERVICE_ROLE_KEY`

### 2. Создайте таблицы в базе данных

В Supabase откройте **SQL Editor** и выполните весь SQL из файла:
```
supabase/migrations/001_initial_schema.sql
```

Это создаст все таблицы, RLS-политики, триггер для автосоздания профиля и Storage бакеты.

### 3. Настройте переменные окружения

Скопируйте файл и заполните своими ключами:
```bash
cp .env.local.example .env.local
```

Файл `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
```

### 4. Установите зависимости и запустите

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Как создать первого учителя

1. Зарегистрируйтесь на сайте, выбрав роль «Учиться» или «Преподавать»
2. Если нужно назначить кого-то администратором — зайдите в Supabase → Table Editor → profiles, найдите нужного пользователя и измените поле `role` на `admin` или `teacher`

## Как создать администратора

В Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'uuid-пользователя';
```

## Структура проекта

```
src/
├── app/                    # Страницы (Next.js App Router)
│   ├── login/              # Авторизация
│   ├── register/           # Регистрация
│   ├── dashboard/          # Главная для роли
│   ├── courses/            # Каталог и прохождение курсов
│   ├── teacher/courses/    # Управление курсами (учитель)
│   ├── messages/           # Чат
│   ├── notifications/      # Уведомления
│   ├── leaderboard/        # Рейтинг
│   ├── profile/            # Профиль
│   ├── admin/              # Панель администратора
│   └── certificate/[id]/   # Сертификат
├── components/             # React-компоненты
│   ├── ui/                 # Базовые UI-компоненты (Button, Input, Card...)
│   ├── layout/             # Шапка, шелл
│   ├── courses/            # Курсы, каталог, редактор
│   ├── lessons/            # Просмотр урока, rich-text редактор
│   ├── quiz/               # Тест (прохождение и редактирование)
│   ├── chat/               # Чат
│   ├── gamification/       # Лидерборд
│   ├── analytics/          # Аналитика для учителя
│   ├── notifications/      # Уведомления
│   ├── certificate/        # Сертификат
│   ├── admin/              # Панель администратора
│   └── profile/            # Профиль
├── lib/
│   ├── supabase/           # Клиенты Supabase (browser/server/middleware)
│   ├── utils.ts            # Утилиты (cn, форматирование, XP, уровни)
│   └── validations/        # Zod-схемы форм
├── i18n/
│   └── messages/           # Переводы ru.json / kz.json / en.json
├── hooks/                  # use-toast
├── types/                  # TypeScript типы
└── middleware.ts            # Защита роутов
```

## Деплой на Vercel

1. Пушьте репозиторий на GitHub
2. Зайдите на [vercel.com](https://vercel.com) и импортируйте репозиторий
3. Добавьте переменные окружения в настройках проекта Vercel
4. Deploy
