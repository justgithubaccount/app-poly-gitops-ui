# Initial foundation validation — 2026-10-29

Self-check of the initial UI implementation. Cloud deployment and real-provider
requests are outside this record.

| Check                                                               | Result                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `npx --yes npm@11.19.1 ci`                                          | PASS: clean install from a lockfile generated without existing node_modules |
| `npm run check`                                                     | PASS: strict route/types, zero-warning ESLint and 11 unit/contract tests    |
| `npm run build`                                                     | PASS: production build                                                      |
| `npm run format:check`                                              | PASS                                                                        |
| `npm audit --audit-level=high`                                      | PASS: zero vulnerabilities in the resolved tree                             |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`                        | PASS: eight scenarios without retries                                       |
| `PLAYWRIGHT_CHANNEL=chrome node tests/integration/real-backend.mjs` | PASS: actual FastAPI with a deterministic loopback provider                 |

Browser coverage: project creation, request/response, request history, failure
vs empty, manual recovery, stale data after refresh failure, draft preservation,
no automatic POST retry, keyboard theme selection and persisted dark mode.
Geometry is checked at 320, 390 and 1440 CSS pixels. Local runs use installed
Chrome through the documented channel option; CI installs Playwright Chromium.

## Full stack check

Browser → Next route handler → public backend
`app-poly-gitops-fastapi@6686997d9c4e8d6815886790341d5e185f86bf1a`
→ loopback HTTP provider fixture. The backend source is unchanged, telemetry
is disabled and its SQLite database is disposable. There are no browser API
mocks in this check and no real provider credentials are used.

The UI creates a project, displays a reply and reloads the saved input request
after reopening the route. It explicitly verifies that the assistant response
does not reappear after reload, matching the backend's current persistence
contract. Health 200 and optional behavior 404 are also checked.

A regression covers Next's internal hostname differing from the browser Host.
The proxy accepts valid same-origin POSTs while rejecting cross-origin writes.
The lockfile is generated from an empty installation context so optional
native dependencies are represented during clean CI installation.

## Visual inspection

Local synthetic-data captures at 1440×1000 light/dark and 390×844 dark were
opened and inspected. They remain ignored under `test-results/actual-stack/`.
Checks include neutral semantic surfaces, heading/body hierarchy, accent
selection without rails, bounded reading width, unclipped mobile navigation,
shared controls and clear empty/error/request-evidence text.

This record is a self-check, not independent review or evidence of a deployed
service. Backend provider-error and persistence limitations are documented
in [ui-foundation.md](ui-foundation.md).
