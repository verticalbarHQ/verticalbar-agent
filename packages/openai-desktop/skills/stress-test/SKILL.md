---
name: stress-test
description: Author, revise, preview, publish, run, inspect, and stop CrossCheck Stress Tests against NetSuite. Use for load curves, traffic-volume experiments, Stress Test contracts, smoke/full runs, run progress, results, or cancellation. Agent execution is limited to verified non-production environments; hand production execution to the user in CrossCheck. Accepted runs are asynchronous with an immediate Run link. For regression assertions without load use test-suite; for writing application unit tests use neither.
---

# Stress Test — from workload intent to a live Run

The platform owns execution and evidence. You turn the user's workload into a reviewed contract,
then perform only the operations they requested. Authoring does not imply execution. Smoke writes
real NetSuite records too; neither mode cleans them up.

## Route the intent first

| Request | Route |
| --- | --- |
| Create or revise a contract | [Authoring](references/authoring.md): discover, resolve cases, draft, validate and preview, review, persist |
| Publish | Read the exact revision, review its digest and effect, publish |
| Run | [Operations](references/operations.md): verify environment type; hand production to the user in CrossCheck, otherwise review and start asynchronously |
| Progress or results | List runs if needed, then read status or bounded report; no mutation approval |
| Stop | Resolve one exact Run, request cancellation; explain acknowledgement versus completed stop |

Resolve `workspaceId` with `cc_workspaces` and the target environment with `cc_environments`.
Reuse an unambiguous selection already made in this conversation. Ask only when multiple candidates
remain; never choose the first match or invent identifiers. Use the same authorized workspace on
every related call. Do not copy a Run reference from a different workspace.

Before each logical mutation, summarize target, concrete change and effect once. If the user already
authorized that exact scope, proceed; otherwise ask once. Creating a contract never authorizes a run.
Ready + publish is one operation. An explicit stop request authorizes stopping the identified Run;
do not add another approval loop. Core authorization remains authoritative.

## Production execution belongs to the user in CrossCheck

Before any start, retry or rerun, call `cc_environments` for the selected workspace and match the
exact environment ID. Only an explicitly returned `environmentType` of `sandbox`, `development`
or `release_preview` permits Agent execution. Names, account-ID patterns, user assurances and the MCP server's own
deployment environment are not proof. Missing, conflicting or unknown classification means do not
start; resolve it first. Do not relabel an environment to make execution eligible.

For `production`, refuse both smoke and full starts even when the user approves or requests an
exception. Explain that they must open the Stress Test in CrossCheck and start the Run themselves
using the product's confirmation flow. Do not call another execution tool, delegate the start,
provide an executable API workaround, or click the product's Run controls on their behalf.
Do not substitute a different environment without the user's selection.

Authoring, validation, preview, publishing, status/report reads and an explicitly requested stop
remain available for production. No Run is created by the handoff, so do not invent a Run URL.
After the user starts it, resolve the actual Run and return its server-provided link. This is a
skill instruction governing Agent behavior; do not describe it as an API permission restriction.
This gate takes precedence over retry guidance: if a start timed out and the refreshed type is
production or unknown, inspect existing Runs to reconcile acceptance without resending the start.
Keep the original idempotency key; an uncertain response never proves that no Run was created.

## Non-negotiable behavior

- Arrival rate is the default authoring model. Ask for traffic volume and duration; don't ask for
  concurrency unless the user explicitly needs a concurrent-worker experiment.
- Read `cc_stress_test_capabilities` before authoring. Flows reference published canonical Test Suite
  cases; no scripts, duplicated step language, guessed record IDs, or guessed unsupported actions.
- Preserve unrelated flows, pools, stages and tags when editing. Use the current definition digest
  for updates and the exact reviewed digest for publishing.
- Show whether variables come from supplied rows, generated values, or verified account reads.
  Generated business IDs are not verified IDs. Do not put secrets or credentials in data pools.
- Generate a unique idempotency key for each new mutation intent and retain it. Reuse it after a
  timeout or uncertain response; never turn a retry into a new run. Changed intent needs a new key.
- After start acceptance, immediately show the server's **runUrl** as a clickable link and identify
  environment, revision and smoke/full mode. Say "accepted" or the returned state, not "finished".
  End the response without waiting for completion. Poll only if the user asked you to watch; respect
  `suggestedPollAfterSeconds`, and still send the link before polling.
- Use returned **runUrl/resultUrl** verbatim. Never compose URLs from guessed slugs, internal IDs or
  the MCP host. If the server supplies no link, say it is unavailable and preserve the Run reference.
- A terminal Run may still be collecting its final report. Report these states separately. Missing
  account observations are unavailable/unobserved, not zero. There is no performance pass/fail verdict.
- Do not introduce schedules, automatic stops, thresholds, automatic cleanup, or extra backend
  approval fields. Do not silently lower, raise, or reinterpret a requested load curve.
- On a refusal, report the code and actionable paths/reasons. Read and repair a conflicting draft;
  do not overwrite or publish a newer definition under an older authorization.
