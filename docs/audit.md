# Аудит MEMORA

Исходный commit: 6400d8918bc51af3be1923f3457c7811f172b0e2

Все 28 файлов проверены статически. Браузерные ошибки старой базы не проверены: старый проект не затрагивался.

- `README.md`: 2 строк.
- `app.js`: 618 строк.
- `calendar.css`: 1210 строк.
- `calendar.html`: 291 строк.
- `calendar.js`: 967 строк.
- `chat.css`: 6743 строк.
- `chat.html`: 639 строк.
- `chat.js`: 3230 строк.
- `events.css`: 1427 строк.
- `events.html`: 428 строк.
- `events.js`: 1139 строк.
- `icons/calendar.svg`: 43 строк.
- `icons/events.svg`: 30 строк.
- `icons/memories.svg`: 32 строк.
- `icons/profile.svg`: 37 строк.
- `index.html`: 414 строк.
- `notifications.js`: 386 строк.
- `online-status.js`: 218 строк.
- `presence.js`: 93 строк.
- `profile.css`: 1268 строк.
- `profile.html`: 448 строк.
- `profile.js`: 1303 строк.
- `settings.html`: 31 строк.
- `style.css`: 1379 строк.
- `supabase/config.toml`: 1 строк.
- `welcome/auth.js`: 544 строк.
- `welcome/welcome.css`: 1041 строк.
- `welcome/welcome.html`: 207 строк.

Критические проблемы: chat.css содержит JavaScript с строки 2754; chat.js дважды объявляет openConversation (931,1119). calendar/events дважды загружают SDK. Уведомления реализованы независимо в chat.js и notifications.js, нет общего lifecycle. presence.js и online-status.js дублируют запись статуса. app.js вызывает неопределённый redirectToWelcome. Auth хранит memoraAuth и перенаправляет на другой GitHub Pages. settings — заглушка. Календарь и events используют memories вместо событий. Все модули повторяют конфигурацию старой базы. Профиль скрывает чужие поля лишь CSS/JS; SQL-политик в репозитории нет, безопасность старой базы не установлена. Нет миграций, сборки, тестов. Большие CSS, бесконечные анимации и глобальные обработчики.

План: Vite/React/TS; один SDK; Auth как источник сессии; отдельные notes/events/social; единая навигация/ошибки; новая схема с RLS, private avatars и серверными уведомлениями; автоматические проверки и PR без merge.
