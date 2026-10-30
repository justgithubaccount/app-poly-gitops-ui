# UI foundation

A standalone frontend for the Chat API: projects, quick/project chat,
request-history inspection and appearance/API diagnostics. This document
defines the local visual and coding conventions and the backend boundaries.

## Visual model

Keep a neutral, readable workspace with clear typography and bounded use of
semantic color. One OKLCH theme supports light/dark/system. Inter is hosted
locally through the font package. There is no marketing hero, decorative
dashboard chrome or invented operational metric.

Use semantic typography, spacing and component tokens. Feature code consumes
roles rather than raw values or route-specific aliases. Icon names are exposed
through `AppIcon`; feature code does not import the Lucide vendor directly.

| Role         | Size / line height | Weight |
| ------------ | ------------------ | ------ |
| Page display | 30 / 36px          | 650    |
| Section      | 20 / 28px          | 600    |
| Module       | 15 / 22px          | 600    |
| Body         | 14.5 / 23px        | 400    |
| Supporting   | 14 / 22px          | 400    |
| Caption      | 12 / 16px          | 400    |
| Data         | 12.5 / 18px        | 400    |
| Micro        | 11 / 14px          | 500    |

Desktop gutters are 32px, mobile 16px; section gap 40px, comfortable panel
padding 24px, compact padding 12px, default controls 36px. Single-line compact
rows are 40px; two-line rows have a 64px minimum and can grow with content.
The root font size stays at the browser default.

Hierarchy is page → section → module → item → metadata. A panel represents a
real work unit. Selection uses an accent surface, stronger text, visible focus
and an appropriate affordance without changing layout. Severity stays local to
status text; it does not paint entire containers. Mobile uses a focused single
pane and reachable navigation rather than a squeezed desktop sidebar.

Cover seven states by region: initial loading, empty, action pending,
background refresh, AI pending, recoverable error and no selection.
`resolveAsyncView` decides the four read phases plus refresh flags; action and
selection are separate interaction state. Keep last good data during a failed
refresh and say it is stale. Never turn a failed request into empty data,
invent zero counts, silently substitute fixtures or automatically retry POST.

## Backend contract

Inspected public backend:
[`app-poly-gitops-fastapi`](https://github.com/justgithubaccount/app-poly-gitops-fastapi)
at `276aa68a49c3aa740236e4f9528e5a9d984ced8b`.

| UI              | Method and path                     | Shape / boundary                                                  |
| --------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Projects        | `GET /api/v1/projects`              | `[{id, name}]`; no timestamps, counts or paging                   |
| Create project  | `POST /api/v1/projects`             | `{name}` → `{id, name}`, status 200                               |
| Quick chat      | `POST /api/v1/chat`                 | `{messages:[{role,content}]}` → `{reply}`                         |
| Project chat    | `POST /api/v1/projects/{id}/chat`   | same request/response; caller supplies conversation context       |
| Project history | `GET /api/v1/projects/{id}/history` | successful transcripts with timestamp and nullable trace/span IDs |
| Behavior        | `GET /api/v1/behavior/schema`       | optional read-only schema; 404 means not loaded                   |
| Connectivity    | `GET /health`, `GET /`              | liveness/service metadata, not provider readiness                 |

The backend currently has no separate Conversation entity, chat listing,
delete/rename, streaming, user/session ownership or writable settings API.
Project history is saved after a successful model call and contains the submitted
messages followed by the assistant reply. Provider failures are not persisted.
Each submission is still an independent transcript snapshot rather than a
Conversation entity; callers provide any preceding context with the next request.

Chat responses contain only `reply`; trace IDs and token usage are not returned
directly. Show trace/span IDs only when history actually supplies them.
Provider failures return HTTP 502 with a FastAPI `detail` payload. Other HTTP
errors and malformed successful responses are validated in the UI client.

The standard lifespan does not install `BehaviorManager`, so behavior 404 is
an expected unconfigured result. This does not prove chat failure. Settings
initially expose only local appearance preferences and API diagnostics.
Provider/model selection and credentials remain on FastAPI. This UI never
collects or persists the optional `userApiKey` field.

## CrewAI contract

Verified `app-poly-gitops-crewai@c64cdfa939058c6e763a3d6bfa46f64392f6cdb6`:
`GET /health`, `/flows`, `/agents`; `POST /run` and `/run/{flow_name}`.
The `/automation` workspace covers these endpoints through `/api/automation`.
Discovery/health use independent SWR keys and local read states.
Runs accept `namespace`, optional `app_name` and optional object `context`.
The UI/proxy reject context keys that override the visible target fields.

Results contain `final_answer`, `steps[{agent,task,output,duration_ms}]` and
`metadata`, optionally including `total_duration_ms` and `trace_id`. Outputs
are rendered as plain text, not executable HTML. The API returns steps only
after completion; it has no run listing, persistence, progress or cancellation.
Results remain only in the mounted UI, not a fabricated history.
Manual acknowledgement is mandatory for each submission and is invalidated
when form inputs change. Backend mutation policy and credentials remain in
CrewAI; the UI cannot claim that an arbitrary flow is read-only.

The source repository can be public; runtime access is a separate concern.
The current backend has no authentication/ownership boundary. Local startup
binds only to loopback. A public multi-user deployment requires an explicit
backend access contract. CrewAI remains a separate service with the verified
contract above; adding UI controls does not grant cluster access.

## Code and environment setup

Next.js App Router, strict TypeScript, Tailwind v4, official shadcn/Radix source
primitives, SWR reads and Zod boundary validation. Keep drafts in scoped component
state and route selection in the URL. Themes are local browser preferences.

```text
src/app/                    route composition, layouts and proxy
src/components/ui/          domain-free primitives
src/components/icons/       semantic icon adapter
src/components/layout/      responsive application shell
src/features/projects/      project list/create
src/features/chat/          composer, messages, request-history inspection
src/features/settings/      appearance and diagnostics
src/features/automation/    service catalog, manual runs and result inspection
src/lib/api/                schemas, client and proxy helpers
src/lib/async/              shared read-state resolver
```

`CHAT_API_URL` and `CHAT_API_TIMEOUT_MS` are server-only runtime variables.
CrewAI uses separate server-only `CREWAI_API_URL` (unset by default) and
`CREWAI_API_TIMEOUT_MS` (120000ms, allowed 1000–300000ms).
The browser uses `/api/backend/...`; the route has a fixed configured upstream
and a method/path allowlist. It never accepts arbitrary upstream URLs,
forwards browser credentials or follows redirects. FastAPI uses `detail` for
errors, including 422 arrays; validate that shape rather than assuming success.

The backend LLM timeout is 60 seconds; the proxy defaults to 70 seconds.
Aborting a browser fetch does not prove server/provider cancellation. Do not
offer a cancellation promise that the API cannot guarantee.

Use Node 24 and pinned npm 11.19.1. Exact dependency versions and the lockfile
are committed. Instructions live in `AGENTS.md`; `CLAUDE.md` is a compatibility
pointer. Host credentials, trust settings and permissions are not configured
by this repository. Third-party source notices are retained separately.

## Validation

Clean install, strict types, ESLint, contract/state/proxy tests, production
build, formatting and dependency audit. Browser checks cover project creation,
chat, history, HTTP failure/recovery, stale data, missing behavior, themes,
keyboard access and 320/390/1440px composition. Test fixtures never enter a
production fallback path. Local fixture evidence is separate from a real
provider call or deployed verification; see [validation.md](validation.md).

Initial bootstrap creates the source repository and CI. It does not create
cloud resources, change the backend or configure a deployment.
