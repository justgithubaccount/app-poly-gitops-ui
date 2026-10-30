# Chat API UI

Standalone Next.js frontend for
[app-poly-gitops-fastapi](https://github.com/justgithubaccount/app-poly-gitops-fastapi)
and its companion
[CrewAI service](https://github.com/justgithubaccount/app-poly-gitops-crewai).
It provides projects, chat, successful transcript inspection, API diagnostics,
and manual automation runs.

## Overview

The browser talks only to fixed, allowlisted Next.js proxy routes. Backend URLs
are server-only configuration; provider credentials and model selection remain
in FastAPI or CrewAI.

- Projects and chat use `/api/backend/...`.
- Automation discovery and runs use the separate `/api/automation/...` proxy.
- Project history contains successful submitted messages and assistant replies
  returned by the current FastAPI contract.
- FastAPI provider failures are surfaced as HTTP `502` errors.
- Automation is synchronous and has no run history, progress stream, or
  cancellation contract.

The source can be public, but the services do not implement a multi-user
authentication or ownership boundary. Local startup binds to loopback.

## Getting started

Requirements: Node.js 24, npm 11.19.1, and a running Chat API.

```bash
nvm use
npx --yes npm@11.19.1 ci
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3100](http://127.0.0.1:3100).

`CHAT_API_URL` defaults to `http://127.0.0.1:8000`. To enable the automation
workspace, set the CrewAI upstream on the UI server:

```dotenv
CREWAI_API_URL=http://127.0.0.1:8001
CREWAI_API_TIMEOUT_MS=120000
```

Every automation submission requires fresh acknowledgement. Changing parameters
or completing a submission clears it. A UI timeout or navigation does not cancel
upstream execution, and POST requests are never retried automatically.

## Development

```bash
npm run check
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:integration:automation
```

Browser tests use explicit fixtures and do not call a paid model. The optional
`npm run test:integration:backend` path runs against separately started UI and
FastAPI processes using the loopback provider in `tests/fixtures/llm-stub.py`.
It is intentionally not part of CI because it orchestrates sibling-repository
processes; it never needs a live provider key.

## Repository structure

- `src/app/` — routes, layouts, and fixed-upstream proxies
- `src/features/` — projects, chat, settings, and automation workspaces
- `src/lib/api/` — validated API schemas, clients, and proxy boundaries
- `src/components/` — shared UI primitives and application shell
- `tests/` — browser, integration, and provider fixtures

## Documentation

- [UI foundation](docs/ui-foundation.md) — visual model, code boundaries, and API contracts
- [Validation](docs/validation.md) — initial frontend and FastAPI integration evidence
- [Automation validation](docs/automation-validation.md) — CrewAI UI and proxy evidence
- [AGENTS.md](AGENTS.md) — repository working rules

## Related repositories

- [app-poly-gitops-fastapi](https://github.com/justgithubaccount/app-poly-gitops-fastapi) — chat backend
- [app-poly-gitops-crewai](https://github.com/justgithubaccount/app-poly-gitops-crewai) — automation backend
- [app-poly-gitops-k8s](https://github.com/justgithubaccount/app-poly-gitops-k8s) — GitOps desired state
- [app-mono-gitops](https://github.com/justgithubaccount/app-mono-gitops) — archived predecessor

## License

MIT
