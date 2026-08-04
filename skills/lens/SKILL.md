---
name: lens
description: Produce a Lens — a self-contained, interactive, on-brand HTML analysis artifact for ANY analysis goal that draws on CrossCheck and/or Vertical Bar data, grounded in real data, and publish it to the in-product Lens surface. Use whenever an operator wants an analysis / diagnostic / report (over CrossCheck or Vertical Bar sources) they can SEE and trust on the product surface (close health, order-to-cash, AR aging, spend, anomalies, customizations, lineage — any domain). Domain-agnostic on the question; scoped to CrossCheck/Vertical Bar data. NOT tied to month-end close.
---

# Lens — author & publish an analysis surface

Turn a user's analysis goal into a **self-contained interactive HTML Lens**, grounded in real data, and publish it to the dashboard's Lens surface (`/[org]/[ws]/lens`).

**Domain-agnostic.** Lens is the SURFACE + the free-authoring, NOT a fixed report type. The same skill produces a close diagnostic, an order-to-cash process map, an AR-aging view, a spend anomaly brief — whatever the goal is. Do not couple the skill to any one domain.

> The agent owns judgment + visualization; the platform owns only the thin sandboxed render surface (`<iframe sandbox="allow-scripts">`). Quality bar: bespoke visuals by composition, never a templated catalog. Separation: data acquisition/detection is deterministic (every figure traces to a query); authoring is free.

## Method — any analysis, any data

1. **Understand the goal, then CHOOSE the data the question needs.** Acquire it ONLY through CrossCheck's **authenticated, read-only HTTP GET proxies** — the platform runs the read server-side and returns JSON; **the skill never touches a database or NetSuite directly, never holds DB credentials, never issues raw SQL against a database**:
   - the **live read proxy** (`/api/v1/live-read`) — SuiteQL-as-a-GET over live NetSuite, for fresh reads;
   - the **landed-data read proxy** (`/api/v1/lens-data`) — the same shape over CrossCheck's **landed** close event-store (read-only, workspace-scoped; "psql-as-a-GET");
   - CrossCheck read APIs (snapshots / customizations / dependencies / employees) and Vertical Bar process data via their read surfaces.
   All reads ride the existing CrossCheck / Vertical Bar auth (Cognito or a workspace API key). The skill is handed a **thin GET surface, never DB credentials**. Lens owns authoring + publish, NOT data ownership.
2. **Acquire read-only, coverage-first + ground.** Pull what's actually present for the account; **state gaps honestly** (never silently drop a finding); every figure carries provenance (its source table/query).
3. **Assemble a grounded bundle** = `{ goal, account, generated_at, coverage{available,missing}, facts: {<key>:{value, unit?, provenance}}, series, findings }`.
4. **Free-author a self-contained interactive HTML.** Inject the grounded data inline and read every authoritative figure FROM it — **never free-type a number**. But this is an **internal authoring discipline: NEVER surface the mechanism in the rendered output** — no `window.__LENS_DATA__`, no "references the bundle", no data-block plumbing text. The **only** user-facing provenance is a per-figure **ⓘ tooltip citing the source/detector** (e.g. "Detector B4 — systemnote × employees"); the implementation stays invisible. **Product chrome** (headers, cards, layout, labels) uses CrossCheck `--cc-*` design tokens — no hex on chrome; **data-encoding palettes (chart colors) are free**. **Charts via the vendored viz runtime, auto-inlined.** Put the single marker `<!--LENS_VIZ-->` in `<head>` and author charts against the global `window.d3` (alias `window.LensViz`) — a curated, eval-free **d3** toolkit (scales, color, shape, axes, force, drag, zoom, hierarchy, **sankey**). `briefing_publish` splices the ~200KB runtime in at the marker, so you NEVER paste the library yourself; without the marker no runtime is added. The sandbox blocks the network, so this inline path is the only one — do not reference a CDN or `<script src>`. Use it for flow diagrams (`d3.sankey`); hand-rolled SVG/CSS stays fine for simple KPI/bar. For clean, **non-overlapping flowcharts / decision trees / dependency graphs**, prefer **`briefing_layout`** (give it mermaid text or a generic `{nodes,edges}` model → embed the returned snippet) over hand-rolling `d3.forceSimulation`. Compose freely (KPI grid, charts, tables, process/flow diagrams, findings, honest caveats) — bespoke over a fixed catalog.
5. **Self-review (output-blind), then publish — don't screenshot into the chat.** Re-read the assembled HTML against the Acceptance checklist below (every figure cited, ≥1 bespoke visual, no duplicate findings/raw dumps, on-brand `--cc-*` chrome, ≥1 process/flow diagram where the domain has process data) and fix what fails. Do **NOT** spin up headless Chrome / puppeteer to render the artifact to a PNG and surface it in the chat — that is not the deliverable; the published `viewUrl` (auto-opened, best-effort) is where the human sees the real render. A pre-publish render is **opt-in only** — reserve it for a layout you have a specific reason to doubt, and even then keep it to yourself.
6. **Publish — the DEFAULT terminal step (opt-out only).** The end of every analysis is `briefing_publish({title, account, html, workspaceId})` → `{ id, viewUrl, rawUrl, workspace }`; do this unless the user explicitly said not to. **When re-publishing an iteration of an earlier analysis, pass a stable `topic` key** (an optional string) so the platform stacks the new artifact as the next *version* of that same topic instead of a fresh, unrelated lens (RND-3056); an optional `note` can describe what changed in this version. **Pass the SAME `workspaceId` you chose in scope discovery** — don't let publish fall back to a different default than the data you analyzed (see scope discovery). The result echoes the resolved `workspace` (`{ id, name, slug, org }`, or id-only on the API-key path) — **confirm it is the workspace the goal targeted** before surfacing the link; a `workspaceNote` warns when the target came from the `CC_WORKSPACE_ID` default. `viewUrl` is the human dashboard page `/[org]/[ws]/lens/<id>` (auto-opened in the browser; `rawUrl` is the auth-gated raw artifact). Surface the `viewUrl` to the user as the deliverable. The artifact carries its own theme (the sandbox can't read the parent's).

### Data paths that enrich results (easy to miss)

**Call `briefing_schema` FIRST — it is the runtime source of the specific data-path map** (which landed
table, which column, which cross-product join key) for the account you are analyzing. It returns
`{ tables, joinGraph, dataPaths, detectors }`; wire the ones the goal needs (not a prescription). Keep
these path-shaped reminders in mind and let `briefing_schema` supply the exact table/column/key names:

- **Actor ids are LANDED — don't default to a name-only join.** Resolve a process actor to a
  CrossCheck employee reference-first (the landed actor/creator keys are in `briefing_schema.dataPaths`
  → `actor-identity`); integrations resolve by name via `cc_employees`. A live `systemnote` read
  (`briefing_live_read`) is the narrow fallback ONLY for a not-yet-landed human status-changer.
- **There is a 2nd cross-product bridge beyond the transaction id** — see `briefing_schema.joinGraph`.
- **Landed close tables are environment-scoped** — group by environment for multi-env work
  (subsidiary ≠ environment); `briefing_schema` gives the exact keying.
- **`$` amounts are coverage-gated** — posting txns carry GL; non-posting Sales Orders have none.
  State the gap; never invent a figure. (`briefing_schema.dataPaths` → `amount-coverage`.)
- **Live-read is budget 1/NetSuite-account, fail-closed** — prefer landed data; never parallel-run
  the same account.

## Tools (this plugin's MCP)

This plugin ships a local stdio MCP server (`lens`) exposing exactly the thin surface the method needs. **Reads are HTTP proxies the platform runs server-side; the skill never holds DB/NetSuite credentials and never issues SQL against a database directly.**

- **`login({ email?, password? })`** — Cognito login. **No args → opens a browser to sign in (incl. Google)**; or pass **email+password** for SRP. One login yields a token accepted by both CrossCheck and Vertical Bar. Not needed when the server is configured with a `CC_API_KEY` (the key is Bearer'd directly for CrossCheck; Vertical Bar tools still require a Cognito login). `whoami` shows current auth + the resolved workspace.
- **`briefing_data_query({ sql, limit? })`** — read-only `SELECT`/`WITH` over the **landed** close event-store ("psql-as-a-GET"). The platform runs it server-side, workspace-scoped, against an allowlisted set of landed close event-store tables (names via `briefing_schema`), and returns `{ rows, rowCount }`. **This is NOT a database connection** — it is a guarded read proxy.
- **`briefing_live_read({ sql, limit? })`** — read-only SuiteQL `SELECT` against **live** NetSuite, proxied through CrossCheck. Use for fresh reads the landed store does not have.
- **`briefing_layout({ mermaid? | model?, opts? })`** → `{ snippet, summary }` — compute a deterministic, **non-overlapping** graph/flow layout at **publish time** (dagre, in Node) and get back a ready-to-embed HTML `snippet` (the artifact ships **no** layout engine — only coordinates + the bundled renderer). Provide EXACTLY ONE of: `mermaid` (flowchart subset — `graph/flowchart TD|LR`; shapes `[] () ([]) {} (())`; edges `--> --- -.-> ==>` + `-->|label|`; chains) OR `model` (generic `{ nodes:[{id,label?,shape?}], edges:[{from,to,label?,style?}] }`). **Data-agnostic** — you map ANY analysis (dependencies, process steps, decision trees, …) into the generic model yourself. For a **swimlane** (lane-banded flow by actor / phase / type — e.g. SYS·AR·AP·ACCT), pass `opts:{layout:'swimlane', lanes:[{id,label?,color?}], laneAxis?:'row'|'col'}` and a `lane` on every node (model-direct; mermaid stays flow-only). Embed the returned `snippet` verbatim in your `<body>` and keep `<!--LENS_VIZ-->` in `<head>`. ELK is reserved and fails loud.
- **`briefing_publish({ title, account?, html, topic?, note? })`** → `{ id, viewUrl }` — publish the self-contained artifact to the in-product Lens surface. Pass a stable `topic` to stack this as the next version of the same topic (RND-3056). `briefing_list` lists published Lenses (metadata only).
- **`cc_*`** — governed CrossCheck tools. The analysis surface remains read-only: `cc_workspaces`, `cc_list_snapshots`, `cc_get_snapshot`, `cc_list_customizations`, `cc_get_suitescript_source`, `cc_dependencies`, `cc_dependency_summary`, `cc_dependency_chain`, `cc_dependency_paths`, `cc_dependency_graph`, `cc_dependency_graph_status`, `cc_impact_analysis`, `cc_employees`, `cc_script_telemetry`. The narrow deployment-mutation exception is described below.
- **`vb_*`** — Vertical Bar process mining (Cognito only): `vb_workspaces`, `vb_projects`, `vb_process_overview`, `vb_variants`, `vb_cases`, `vb_episode_variants`, and **`vb_data_query`** (open read-only SQL over the tenant-scoped OCEL views — the flexible path; the others are fixed-shape). `vb_episode_variants({ workspaceId, primary_types, time_range, anchor?, max_hops?, max_variants?, max_edges?, max_exceptions?, max_primary_objects?, statement_timeout_seconds?, poll_interval_ms?, timeout_ms? })` wraps the async PA `close.getVariants` job API for transaction-type episode summaries. It requires an explicit `workspaceId` (no `CC_WORKSPACE_ID` fallback), sends a workspace-scoped deterministic idempotency key, polls only the returned relative `/insights/close-analytics/jobs/{job_id}` path, and returns bounded `summary`, `variants`, aggregated top `edges`, `exceptions`, `provenance`, counts/caps/truncation metadata, workspace echo, and a limitation string. Treat it as episode-summary evidence only: it is **not** full process-map network parity, not a case timeline/list or edge drilldown, not a close attestation, and not a backend capacity fix (network parity is RND-2800; backend capacity hardening is RND-2801).

### Deployment tool pack (RND-2907)

Nine workspace-explicit tools cover the governed deployment walkthrough. Reads:
`cc_list_ci_workflows`, `cc_get_ci_workflow`, `cc_get_env_snapshot_git_source`,
`cc_list_release_packages`, `cc_get_release_package`, `cc_get_ci_workflow_run`. Mutations:
`cc_create_release_package`, `cc_add_release_package_items`, `cc_start_ci_workflow_run`.

All nine require an explicit `workspaceId`. In API-key mode, pass the workspace ID bound to that key;
server middleware requires and validates the match. A Cognito user (the demo owner/admin) has all
needed scopes. An API key must carry `deploy:read` for workflow/package reads and closure,
`sync:read` for Git source, `environments:read` for the workflow env-name join, and `deploy:write` for
create/add; mutation scope does not grant read access.

Each mutation is a single direct server call — there is no client-side `confirm`/preflight; the
server enforces its own guards and its response (including any error) is surfaced verbatim. Create
and add-items require only `deploy:write` and are not identity-gated. Start-run additionally requires
an identified Cognito user (OAuth or SRP), so every API key returns the server's `IDENTITY_REQUIRED`.
Choose the API deliberately with `LENS_API_URL` (preferred), then `CC_API_URL`; otherwise the
production default applies. Demo order: `login` → resolve the snapshot Git source → create package →
add items → get package/closure → start run → poll run. The full start→observe flow (strict
all-target Review, staged A→B) needs PR #833 in the target deployment; before that, start-run
returns `RUN_ENGINE_NOT_READY` (503). Approval is intentionally absent and stays in the web UI.

**Scope discovery — do this FIRST, never hardcode a workspace.** The authenticated identity determines what it can reach: with a workspace-scoped **API key** the workspace is implicit for legacy tools (the server derives it from the key — don't pass one). The deployment-pack READ tools are the explicit exception: pass the matching `workspaceId` as described above. With **Cognito**, call **`cc_workspaces`** (and `whoami`) to enumerate the accessible orgs/workspaces/envs, pick the one the goal targets, and **thread that one `workspaceId` to BOTH every data tool AND `briefing_publish`** — analyze and publish into the same workspace. `CC_WORKSPACE_ID` is only an optional default, not a requirement; **never rely on it for `briefing_publish`** (a forgotten `workspaceId` there silently publishes to the env default, not the workspace you analyzed — the cause of a customer analysis landing in the operator's own workspace). Confirm the `workspace` the publish result echoes back matches the target. Every tool fails loudly on auth/scope rather than fabricating a default — keep that discipline (no silent fallbacks). Use **`briefing_live_read`** (the governed proxy — rate-limited, audited, row-capped) for live reads; it is the only live-NetSuite path.

**CrossCheck × Vertical Bar (data path, not a prescribed analysis).** The two products mine the **same** NetSuite transactions: CrossCheck carries *state / structure / outcome* (config, close-state, GL, lineage, what changed), Vertical Bar carries *process* (how a transaction flowed — activities, throughput, rework loops). They join on the **NetSuite transaction internalId**, **transaction-scoped** (a period-close event itself has no VB case). **The exact join keys are table-specific and easy to get wrong — get them from `briefing_schema.joinGraph`, don't guess** (there is also a 2nd bridge for audit-trail events). Reach VB two ways: the fixed `vb_*` endpoints (project-scoped map / variants / cases), or **`vb_data_query`** = open read-only SQL over VB's tenant-scoped process views (which carry *all* transaction object types, not just Sales Order). Coverage is bounded to VB's ingest window (∩ the CrossCheck window); when a join returns 0 rows, distinguish out-of-window from no-relationship. Survey BOTH products in scope discovery before concluding a goal is single-product.

## Example analyses (illustrative — NOT the skill's scope)

The method above is identical for every domain; these are just example detector sets a goal might use:

- **Close health** — period-state lag/blitz, owner-identity-join (systemnote actor × `employees`), task rework, late-JE timing, GL trial-balance; + VB process where relevant.
- **Order-to-cash** — VB process states/variants/durations/bottlenecks (the VB transaction-status field; see `briefing_schema`) + CC GL trial-balance.
- **AR aging / spend / anomaly / config-impact / lineage / …** — pick the data + detectors the question demands.

Domain-specific detector queries are **reference content**, never the skill's identity. Add new domains by adding data/detectors, not by forking the skill.

## Acceptance — the human pixel gate (output-blind)

1. every authoritative figure correct + cited — zero "evidence unavailable"; 2. ≥1 bespoke visual a fixed catalog could not express; 3. no duplicate findings / raw dumps; 4. on-brand `--cc-*` chrome; 5. ≥1 data-grounded process/flow diagram where the domain has process data. A prior PoC is a yardstick, never a template (don't copy its composition).
