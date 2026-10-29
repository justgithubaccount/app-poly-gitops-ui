# Automation validation — 2026-10-29

## Scope and evidence

UI integration of the existing CrewAI HTTP contract. Only the UI repository
changed; no real CrewAI flow, cluster operation or paid LLM call was executed.

| Check                                                           | Result                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Clean pinned `npm ci`                                           | PASS; existing baseline 11 unit tests pass                           |
| `npm run check`                                                 | PASS: strict TypeScript, zero-warning ESLint, 21 unit/contract tests |
| `npm run build`                                                 | PASS: production routes including `/automation` and its proxy        |
| `npm run format:check`                                          | PASS                                                                 |
| `npm audit --audit-level=high`                                  | PASS: zero vulnerabilities                                           |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`                    | PASS: 19 scenarios, no retries                                       |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:integration:automation` | PASS: real Next proxy with an explicit loopback HTTP fixture         |

Tests were observed failing before implementation: the new contract modules
and the Automation workspace were missing on the baseline.

## Covered behavior

- Independent flows/agents/health discovery; error versus empty; stale catalog
  remains visible after failed refresh; missing CrewAI does not break projects.
- Selected-flow and server-default execution; namespace/app name/JSON context;
  reserved target overrides and malformed/non-object JSON rejected.
- Acknowledgement is mandatory, resets after input changes/submission and does
  not automatically re-arm after failures. Pending prevents duplicate submits.
- Returned final answer, step output, agents/tasks, duration and trace metadata.
  No fake live steps, run persistence or cancellation claim.
- Timeout preserves form parameters, warns that execution may continue and
  never automatically repeats POST.
- Real Next route forwards only validated body to the fixed destination, does
  not forward browser cookies, and rejects cross-origin/target-override writes.
- Desktop/mobile screenshots were opened and inspected at 1440px and 390px.
  Long names, output and metadata fit at 320/390/1440px; navigation wraps.

Local browser verification uses installed Chrome because the Browser plugin is
not available. CI installs Playwright Chromium. Fixture browser evidence proves
the UI contract, while the separate loopback check additionally proves the actual
proxy hop; neither proves real CrewAI execution or cluster/LLM readiness.

## Preview and runtime boundary

The local preview can show the new workspace with CrewAI unconfigured. It must
show a real connection error and disabled execution, never substitute fixture
data. To connect an actual service, set server-only `CREWAI_API_URL` and configure
that service's keys/tools/access independently. No cloud deployment is included.
