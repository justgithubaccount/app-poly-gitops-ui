# app-poly-gitops-ui

Standalone frontend for `justgithubaccount/app-poly-gitops-fastapi`.
Read [README.md](README.md) and [docs/ui-foundation.md](docs/ui-foundation.md) before implementation.
The latter records the visual profile, code structure,
the backend limitations and the verification matrix.

## Structure and boundaries

- Next.js App Router, React, strict TypeScript, Tailwind v4, shadcn/Radix.
- Server Components by default; put interaction and browser state at client leaves.
- `src/components/ui/`: domain-free, vendored primitives. Use the official shadcn CLI for upstream changes.
- `src/components/icons/`: semantic `AppIcon` facade. Feature code never imports the icon vendor.
- `src/features/`: project, chat and settings composition and hooks.
- `src/lib/api/`: backend schemas and one browser client. Validate JSON at this boundary.
- `src/lib/async/`: shared async-state decisions. A failed request never becomes empty or zero.
- `src/app/api/backend/`: fixed-upstream, allowlisted proxy; no arbitrary URLs, cookies or credential forwarding.
- LLM calls, storage, model/provider selection and secrets belong to FastAPI.

## Visual and interaction rules

- Use the semantic typography, space and component tokens in `globals.css`.
  Feature surfaces consume roles, never primitives or route-specific token aliases.
- One effective OKLCH theme, light/dark/system. Semantic color only.
- Hierarchy: page → section → module → item → metadata. Panels represent real work units.
- Selection: accent surface + stronger text + appropriate affordance + visible focus, stable geometry.
  No colored selection rails, decorative status dots or tinted severity containers.
- Seven states: initial loading, empty, action pending, background refresh, AI pending,
  recoverable error, no selection. Partial failures are local to their data region.
- Never show mock data as a fallback or invented counts while loading.
- Desktop workspace becomes focused single-pane navigation on mobile. Test at 320/390/1440px.
- Semantic HTML, named controls, keyboard and focus recovery, AA contrast, reduced motion.
- Named component exports and explicit props; use `cn`, composition and primitive variants.
- Backend errors use FastAPI `detail`, including 422 arrays. Validate the actual response contract.
- No automatic retry of POST: the backend has no idempotency contract.
- No fake streaming, persistent-chat claims, model settings, authentication or writable behavior settings.
  Check the actual backend contract before adding a control.

## Checks and delivery

Use Node 24 and the pinned npm via `npx --yes npm@11.19.1 ci`. `npm run check`, `npm run build`, `npm run test:e2e`
and `npm run format:check` are the delivery checks. Run relevant checks after changes.
Browser fixtures stay in tests and must never be a production fallback.
See README for the explicit local backend setup; no cloud cluster is required.

Keep dependencies exact and commit the lockfile. Do not add proprietary assets,
unrelated product domains, global client config, credential setup,
permission bypasses or automation hooks. Repository instructions do not grant
standing delegation, merge, release, deployment or infrastructure permission.
Self-check is not independent review. Report local/fixture evidence separately
from real-provider and deployed evidence.
