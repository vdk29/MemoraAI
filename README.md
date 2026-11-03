# MEMORA 2.0

Личное пространство заметок, планирования и общения. Переработка находится в `memora-rebuild`; действующая версия в `main` не изменена.

## Запуск

Node.js 22.12+ (или 24). `npm ci`, скопировать `.env.example` в `.env.local`, `npm run dev`.
`npm run build` проверяет TypeScript и создаёт `dist/`. `npm test` запускает Playwright (в этой среде используется `/usr/bin/chromium`; для другой машины задайте свой executablePath или установите браузер через Playwright).

В браузере используется только publishable key. Переменные VITE публичны. Никогда не добавлять service_role/secret keys.

## База

Единственный проект: `ewsqrqzabahjtmorrqhh`. Миграции `supabase/migrations/20261103142726_memora_v2.sql`  , `20261103144639_conversation_summaries.sql` и `20261103145038_note_search.sql` уже применены к нему. Повторно их не выполнять. Старый Supabase не используется и не затронут. Данные не переносились.

Схема и доступ описаны в [docs/schema.md](docs/schema.md), результаты проверок и ограничения — в [docs/testing.md](docs/testing.md), исходный аудит — в [docs/audit.md](docs/audit.md).

## Публикация после приёмки

1. В Supabase Auth URL Configuration указать Site URL и разрешённые Redirect URLs для выбранного сайта (например `https://vdk29.github.io/MemoraAI/`) и `http://localhost:5173/` для разработки. Не отключать подтверждение email ради тестов.
2. Проверить доставку email, восстановление пароля и ограничения бесплатного email-провайдера. Настройки email не менялись инструментом базы.
3. Собрать `npm run build` с переменными из `.env.example`. Опубликовать содержимое `dist/` через GitHub Pages artifact или любой статический HTTPS-хостинг. Относительный base и hash-навигация поддерживают вложенный путь Pages.
4. Хешированные assets кешировать на год с immutable; index.html отдавать с revalidation. Для хостинга настроить CSP с connect-src HTTPS/WSS только нового Supabase, img-src self blob: и новый Supabase. Сторонние CDN в runtime не нужны.
5. Пройти список live-проверок из docs/testing.md и согласовать merge. Автопубликация и merge не включены.

## Архитектура

React + TypeScript + Vite, Supabase Auth/Postgres/Storage/Realtime; lucide-react для SVG. Один клиент в src/lib/supabase.ts. Страницы в src/pages, общие элементы в src/components. Общие токены и responsive CSS. Пользовательский контент рендерится React как текст, без HTML-инъекций. Заметки сохраняются явно; при ошибке редактор остаётся открыт.
