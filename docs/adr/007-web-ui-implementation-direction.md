# ADR-007: Web UI implementation direction

Status: accepted for the user-requested UI brief, 2026-10-06, and for the local `apps/web` SPA that now exists. Preview build and browser checks are recorded; HTTPS, asset delivery, and production acceptance remain pending. This does not change backend boundaries or select a persistence library.

## Context

The project needs a Candidate examination workspace and an Admin management interface, with burst-sensitive API traffic and future S3/CloudFront static offload. Only Identity business APIs run locally; examination/admin contracts exist but their implementations are pending. The user requests a detailed, implementable brief and tasks for Grok before the ORM comparison.

## Decision

Use React with strict TypeScript and Vite to build a static SPA in `apps/web`. React Router organizes browser routes; TanStack Query manages bounded remote reads. CSS variables/CSS Modules implement a small semantic token system. Use native controls first; introduce a UI primitive library only for a measured accessibility/maintenance need. Do not add an SSR server or another ECS service for the baseline UI. This is an operational simplicity decision, not proof that SPA is always cheaper/faster or that SEO has been benchmarked. Public SEO/catalog indexing can be evaluated separately if required.

Vite emits a static build; its preview server is for local verification, not production hosting. Keep output at `apps/web/dist`, separate from the API's root `dist` and migration assets. [Vite static deployment](https://vite.dev/guide/static-deploy).

Use separate browser shells for Candidate, examination and Admin. Design language is a calm digital examination room: navy/teal, white/light-gray surfaces, precise typography and an answer-sheet navigator. Vietnamese is the default UI language. Accessibility target is WCAG2.2 AA, tested rather than inferred from a component library. [W3C WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/).

Use an explicit demo adapter and a live adapter behind frontend capability interfaces. Demo is synthetic and visibly labeled; production/live cannot silently use it. Candidate transport models never contain keys/explanations before release. Keep server mutation authority; local state cannot extend deadlines, confirm durable saves, grant permissions or calculate official scoring.

User-approved visual increment, 2026-10-07: the public homepage uses the “Vào nhịp thi” 3D answer-sheet scene and a public `/experience` with three authored sample questions. This is public marketing content in both builds, independent of private DemoApi scenarios and actual Assessment data. Only the sample content may be scored locally, labeled as sample results; official scoring and ownership remain server-authoritative. Three.js is loaded on demand from bundled same-origin assets with CSS fallback and resource disposal. This adds no server or AWS service and does not accept the pending production gates.

## Consequences and gates

The original documentation increment introduced no AWS resource or runtime dependency. The approved public visual implementation adds pinned Three.js0.180.0 in the browser; its lazy-loaded chunk size and local validation are recorded in the [implementation review](../web-ui/vao-nhip-thi-implementation-2026-10-07.md). No AWS resource is added. Further implementation must select compatible pinned dependency versions, preserve API build/test scripts, measure startup/render cost and connect same-origin HTTPS safely. Query retry/refetch defaults must be configured per capability; an autosave coordinator owns one-in-flight batches, immutable retry payloads, monotonic versions and conflict reconciliation. [TanStack Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).

Live Admin navigation is blocked until an authoritative permissions capability is documented/implemented; current Profile DTO does not contain it. Other dependencies include frozen attempt presentation metadata and browse/history/version selectors. These are explicit [handoff dependencies](../web-ui/api-and-state-contract.md), not frontend authorization workarounds.

Acceptance separates interactive demo, Identity live browser integration, full business integration and AWS production evidence. Rollback is an asset release rollback with API contract compatibility; HTML/asset/cache/service-worker behavior must be checked before future deployment. No service worker or offline persistence baseline is added without a separate privacy/recovery decision.
