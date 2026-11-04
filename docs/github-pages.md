# GitHub Pages review

Сборка ec0a684 опубликована в ветке gh-pages, commit 31acfb0. Корень ветки содержит неизменённые файлы исходного main (6400d89). Новая сборка находится только в v2/; .nojekyll отключает Jekyll. node_modules, video-assets и исходники новой версии не попадают в v2.

Локальная проверка именно статической сборки по /v2/: HTTP 200, форма «С возвращением», нет pageerror. Production-сборка прошла. main не изменён.

Для включения: https://github.com/vdk29/MemoraAI/settings/pages → Build and deployment → Source: Deploy from a branch → Branch: gh-pages → /(root) → Save.

Ожидаемый URL после успешного Pages deployment: https://vdk29.github.io/MemoraAI/v2/

Важно: создание ветки не включает Pages автоматически. В момент подготовки GitHub не сообщил ни одного deployment workflow run для коммита. Доступные инструменты не поддерживают изменение Pages settings; прямой GitHub API из среды блокируется. Не заявлять о доступности URL до успешной публикации GitHub.

Для email confirmation/recovery добавить https://vdk29.github.io/MemoraAI/v2/ в Supabase Auth Redirect URLs нового проекта. Существующие адреса других размещений сохранять. Настройки Auth не менялись.

## Trace / концепт B

Текущее место просмотра: https://vdk29.github.io/MemoraAI/v2/ . При переносе выбранного B обновляется только содержимое v2/ ветки gh-pages; исходный root-сайт, main и изолированные prototypes/ сохраняются. Сборка использует относительные URL, поэтому WebP, локальные шрифты и hash-маршруты работают в подпапке. Прямой HTTP-доступ к github.io в рабочей среде блокируется прокси; статус деплоя проверяется через GitHub Actions. Версия на Sites в рамках переноса B не обновлялась.
