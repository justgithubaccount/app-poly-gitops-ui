# Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing CrewAI API through the shared UI.

**Architecture:** Separate `/automation` feature and `/api/automation` proxy.
Reuse shared transport, error validation and semantic components; preserve Chat API behavior.

**Tech Stack:** Existing Next.js, React, TypeScript, Zod, SWR, Vitest and Playwright; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-29-automation-design.md`

## Global Constraints

- Mutation target: `justgithubaccount/app-poly-gitops-ui` only; delivery through a CI-verified PR, no merge/deployment.
- No backend mutation, real flow run, paid provider call, browser credential forwarding or proprietary references.
- Manual confirmed execution only; timeout never means cancellation; results are not persistent history.
- `CREWAI_API_URL` is server-only and unset by default; deadline defaults to 120000ms with range 1000–300000ms.
- Preserve existing Chat API behavior; no new dependencies; responsive at 320/390/1440px.

## Review Focus

- Context overriding visible namespace/app name must be rejected (Task 1).
- A timeout may leave upstream work running; never auto-retry or imply cancellation (Tasks 1/2).
- Missing/unavailable CrewAI must not disable existing chat/projects (Tasks 1/2).
- Long flow names, outputs and metadata must not overflow mobile (Task 2).
- Stale catalog refresh must not clear valid data or masquerade as empty (Task 2).

### Task 1: Validated service boundary

**Files:**

- Create: `src/lib/api/automation-schemas.ts`, `automation-proxy.ts`, `upstream-proxy.ts` and boundary tests.
- Modify: `src/lib/api/client.ts`, `proxy.ts`, `.env.example`.
- Create: `src/app/api/automation/[...path]/route.ts`.

**Interfaces:**

- Produces: `automationRequest<T>(path, schema, init?)`, `flowsSchema`, `agentsSchema`, `runRequestSchema`, `runResponseSchema`, `parseRunContext(text)`.
- Produces: `automationPath(method, segments): string | null`, `proxyAutomationRequest(request, segments, fetcher?, env?): Promise<Response>`.
- Preserves: `apiRequest`, `backendPath`, `proxyBackendRequest` and their existing signatures/defaults.

- [ ] Write failing tests for exact routes, JSON/target validation, response validation, fixed destination, no forwarded credentials, missing config, origin guard, timeout/no retry and separate service client paths.
- [ ] Run `npm test`; expected new tests fail on missing boundary behavior.
- [ ] Implement strict schemas, shared proxy/client transport and independent automation route/configuration.
- [ ] Run `npm test`; expected all tests pass, including existing Chat API guards.
- [ ] Commit the validated boundary.

### Task 2: Automation workspace

**Files:**

- Create: `src/features/automation/{automation-workspace,automation-catalog,run-form,run-result}.tsx`.
- Create: `src/app/automation/page.tsx`, `tests/browser/automation.spec.ts`.
- Modify: shell/icons, existing responsive browser test, README, project instructions and foundation documentation.

**Interfaces:**

- Consumes: Task 1 schemas/client and shared `resolveAsyncView`, layout/data-state components.
- Produces: `AutomationWorkspace`, independent catalog regions, validated manual form and `RunResult`.

- [ ] Write failing browser tests for discovery/empty/error states, acknowledgement, named/default run, JSON validation, pending/result/error handling, preserved drafts, stale catalog, no automatic POST retry, and long content at mobile widths.
- [ ] Run the new browser test against a clean baseline server; expected missing navigation/workspace assertions fail.
- [ ] Implement the workspace, navigation and documentation. Use native labelled select/checkbox inside existing shared form patterns; no unneeded primitive dependency.
- [ ] Run check/build/browser suite and formatting/audit; expected all pass without regressions.
- [ ] Exercise the real proxy against an explicit local HTTP fixture, inspect desktop/mobile rendering and document the evidence limits.
- [ ] Commit the workspace and verification record.

### Delivery

- [ ] Review the whole diff and obtain a fresh-context review; resolve important findings with regression tests.
- [ ] Push `feat/crewai-automation`, create a PR and verify CI for the exact head.
- [ ] Keep the user's preview available with honest missing-service state; do not merge or deploy.
