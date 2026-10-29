# app-poly-gitops-ui

Отдельный UI для [app-poly-gitops-fastapi](https://github.com/justgithubaccount/app-poly-gitops-fastapi):
проекты, быстрый чат, чат проекта, просмотр истории запросов и диагностика API.
Семантические дизайн-токены, общие компоненты, light/dark/system,
адаптивная раскладка и явные состояния данных.

## Локальный запуск

Нужны Node.js 24, npm 11.19.1 и запущенный FastAPI на `http://127.0.0.1:8000`.
В этом репозитории не нужны облачные ресурсы или LLM-ключи.

```bash
nvm use
npx --yes npm@11.19.1 ci
cp .env.example .env.local
npm run dev
```

Открыть [http://127.0.0.1:3100](http://127.0.0.1:3100).
`CHAT_API_URL` задаёт upstream на сервере UI; браузер использует только
ограниченный `/api/backend/...` proxy. `CHAT_API_TIMEOUT_MS` по умолчанию 70000.
LLM-провайдер, URL модели и ключ настраиваются в FastAPI, а не в браузере.

## Проверки

```bash
npm run check          # типы, ESLint, unit/contract tests
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e       # браузерные тесты с явно заданными API fixtures
```

Browser-тесты запускают production build на 3100. Бэкенд и провайдер для них
не нужны: эти проверки подтверждают UI-контракт, а не работу реального LLM.
`npm run start` также слушает только loopback; публикация требует отдельного
решения о доступе и настройке запуска.

Если Chromium уже установлен как Google Chrome, можно использовать
`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. CI ставит Chromium из Playwright.
Для отдельной полной локальной проверки есть
`tests/fixtures/llm-stub.py` и `tests/integration/real-backend.mjs`:
запустите fixture на 8131, настоящий FastAPI на 8130 с отдельной SQLite DB,
`OPENROUTER_API_URL=http://127.0.0.1:8131/chat/completions` и тестовым ключом,
а UI — с `CHAT_API_URL=http://127.0.0.1:8130`. Затем выполните
`node tests/integration/real-backend.mjs`. Эта проверка использует настоящий
FastAPI и proxy, но подменяет только провайдера, поэтому платных LLM-вызовов нет.

## Границы текущего бэка

Ответы текущего сеанса находятся в памяти вкладки. FastAPI сохраняет
снимки входных запросов перед вызовом модели, а не отдельные диалоги с
полной историей ответов. В UI они подписаны «История запросов».
Есть LLM-ошибки, которые бэк возвращает как HTTP 200 с текстовым `reply`;
надёжная классификация таких ошибок требует изменения API.

Настройки UI сейчас — тема и диагностика. API изменения модели/провайдера,
streaming, отдельные диалоги, auth и действия CrewAI не добавлены этим setup.
`/health` проверяет доступность сервиса, а не провайдера модели.

## Проектные правила

- [AGENTS.md](AGENTS.md) — единые инструкции Codex и Claude; [CLAUDE.md](CLAUDE.md) — тонкий совместимый вход.
- [docs/ui-foundation.md](docs/ui-foundation.md) — дизайн-профиль, архитектура, API-карта и критерии проверки.
- `src/components/ui/` — официальные shadcn/Radix-примитивы; feature-код использует семантический `AppIcon`.
- `src/lib/api/` — Zod-контракты и единый клиент; `src/lib/async/` — общая модель состояния чтения.

Репозитории backend, CrewAI, Helm, GitOps и provisioning остаются отдельными
частями стека. Этот репозиторий не поднимает кластер и не меняет их настройки.
