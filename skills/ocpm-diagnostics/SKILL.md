---
name: ocpm-diagnostics
description: Run an OCPM bottleneck diagnostic over a CrossCheck environment's published process corpus and read it back. Use when the user asks where a process is slow or stuck, which activities or resources cause waiting, why cases pile up, or says bottleneck / 병목 / 지연 원인 / process diagnostic for a NetSuite environment that CrossCheck already snapshots. Not for live NetSuite queries, for changing data, or for the Vertical Bar process-map tools (vb_*), which read the same corpus without running a diagnostic.
---

# OCPM diagnostics — bounded bottleneck analysis

Four tools, all scoped to one CrossCheck **environment**. They submit a job to a private compute
service behind the CrossCheck API, wait a little, and read the result. Nothing here changes
workspace data; the only thing a cancel changes is the job itself.

| Tool | Kind | Use |
| --- | --- | --- |
| `cc_ocpm_capabilities` | read | Discover analyses, population kinds, budget classes. Call first. |
| `cc_ocpm_run_analysis` | read (compute) | Submit; small jobs usually return their result inline. |
| `cc_ocpm_get_job` | read | Continue a job by `job_id`; result appears when terminal. |
| `cc_ocpm_cancel_job` | write (job only) | Stop a queued or running job. |

## Procedure

1. **Scope.** Resolve `workspaceId` with `cc_workspaces` and pick the environment the user means
   (`environmentId`). Never guess either; ask when more than one fits.
2. **Capabilities.** Call `cc_ocpm_capabilities`. Read `populations` and `budget_classes`. If an
   analysis you need is not listed, say so — do not improvise a request shape.
3. **Population.** Build `population` in the exact wire shape that `cc_ocpm_capabilities` returns
   under `population_shapes` — never invent field names. Two shapes exist:
   - Time window (`kind` is `event_time`, `leading_object_start`, or `execution_contained`):
     `{ "kind": "event_time", "start": { "epoch_nanos_utc": "1767225600000000000" }, "end": { "epoch_nanos_utc": "1769904000000000000" } }`.
     Timestamps are UTC epoch **nanoseconds as decimal strings** (seconds x 1 000 000 000), and the
     window is half-open `[start, end)`. Default choice for "last month / quarter".
   - Case set: `{ "kind": "case_set", "object_ids": [1234, 5678] }` — non-negative integer object
     ids the user already has (max 10 000).
   Start narrow (one period, or a small case set). A first run over everything is how a job hits
   its budget.
4. **Run.** `cc_ocpm_run_analysis` with `budget_class: "small"` first. It waits up to 25 s.
   - Inline result → go to step 6.
   - `job_id` with `state` queued/admitted/running → step 5.
   - `state: "timed_out"` or `"resource_limited"` → the population is too large for the budget.
     Narrow the population or retry with `budget_class: "medium"` (then `"large"`), and tell the user why.
5. **Continue.** `cc_ocpm_get_job` with the `job_id`. Repeat at a sensible interval (a few seconds);
   do not spin. If the user changes their mind, `cc_ocpm_cancel_job`.
6. **Read the result.** The default `detail: "summary"` carries identity, cache status, capabilities,
   `result.summary`, `unsupported`, and `metrics`. Ask for `detail: "full"` only when the user needs the
   per-signal payload; it can be large.
   - `unsupported` lists evidence families the source could not support and the evidence each needs.
     Report them as facts about the source, never as an absence of problems.
   - `cache.status: "hit"` means the answer was computed earlier for the same snapshot and request;
     `cache_mode: "require_fresh"` recomputes.
7. **Explain.** Lead with the strongest signal in `result.summary` and its counts. Say which
   population and period it covers, and that the analysis reads the published snapshot, not live
   NetSuite.

## Boundaries

- The service is available only where CrossCheck runs it. A `503 OCPM_UNAVAILABLE` means this
  environment's deployment has no diagnostic service; report that plainly.
- API-key sessions cannot run diagnostics; an identified user is required.
- Do not compare its output with `vb_process_overview` as if one validated the other: both read the
  same corpus, but this runs a different analysis.
