# Automation workspace

## Intent and approved scope

Add the existing CrewAI API to this UI as a separate Automation workspace.
The operator approved the existing-API proposal: flow/agent discovery, explicit
manual execution and inspection of returned results. Backend services remain
separate. Only `justgithubaccount/app-poly-gitops-ui` is a mutation target.

## Approaches

1. **Selected:** a separate `/automation` workspace and fixed-upstream proxy.
   Reuses the application shell, semantic tokens, read states and API validation.
2. Merge the services or introduce a gateway: unnecessary backend changes.
3. Add an independent frontend: duplicates setup and fragments the workspace.

## API and interface

Verified source: `app-poly-gitops-crewai@0835d3102555e6cef4fb700c56969ecddc6f6ddd`,
`src/auto_k8s_pilot/api.py` and `flow_runner.py`.

- `GET /health`, `/flows`, `/agents`: independent regions with loading, empty,
  error, refresh and stale states. An unavailable CrewAI must not break chat.
- `POST /run` and `/run/{flow_name}`: select the server default or a discovered
  flow; enter namespace, optional app name and optional JSON object context.
- Before each run require an explicit acknowledgement that flows may call an
  LLM, change infrastructure or create issues. Never start on load or retry POST.
- Show pending state while waiting, then final answer, ordered step outputs,
  agents/tasks, durations, metadata and trace ID if supplied. Results are only
  retained in the mounted workspace. They are not a persisted run history.
- Failures preserve the form. Timeout/disconnect means execution may continue;
  another run requires fresh acknowledgement. No cancellation/progress promises.
- Reject context keys `namespace` and `app_name`: the API merges context last,
  so accepting them would silently override the visible target fields.
- Mobile navigation must wrap and all content must fit at 320/390/1440px.

## Boundary and configuration

Server-only `CREWAI_API_URL` (unset by default) and
`CREWAI_API_TIMEOUT_MS=120000`, allowed range 1000–300000ms. Browser calls only
`/api/automation/...`. Preserve the existing Chat API configuration/defaults.
Share transport/error handling; maintain separate route/body allowlists.
No arbitrary URLs/paths, browser credentials, upstream redirects or automatic
execution. Unsupported routes/methods, invalid names, non-object JSON context,
cross-origin writes and excessive payloads are rejected before upstream calls.

## Non-goals and validation

No backend mutation, deployment, paid LLM call or real flow execution is part of
implementation verification. No run persistence, live streaming, cancellation,
editable agents/flows, writable provider settings or authentication is invented.
Source-public is not runtime-public: the current services have no user boundary.

Verify unit contracts/proxy guards and browser discovery, confirmed execution,
result inspection, errors, no auto-retry, missing configuration, stale lists and
responsive layout. Also exercise the real UI proxy against a loopback HTTP
fixture; keep fixture evidence separate from real CrewAI execution.
