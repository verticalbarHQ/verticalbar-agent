# Async execution, observation and stop

## Start

Read the exact published revision and resolve the intended environment. Preview its definition with
actual variable bindings. Summarize workspace/environment, revision/digest, smoke or full, workload
and duration, and real record changes with no cleanup. Smoke is the default when mode is unspecified;
never substitute it for an explicitly requested full run. When this concrete operation is authorized,
call `cc_start_stress_run` with `testRef`, `revisionRef`, `environmentRef`, optional `variables`,
`kind`, and a retained `idempotencyKey`.

Immediately respond in the user's language, for example:

> Smoke run accepted for Sandbox A, revision r3.
> [Watch the run in CrossCheck](<the exact returned runUrl>)
> It is running asynchronously. The live view shows progress; the final result appears after
> execution and account-note collection finish.

The link points to the **actual accepted Run**, even while queued. Acceptance is not proof that
NetSuite execution has begun. An unavailable worker/Workload Plane may delay dispatch; expose the
returned state and observation time rather than claiming progress. Never wait for the run to finish
before delivering its link. No detached polling promises: only watch within an explicitly requested,
active session. A transport timeout needs the same start key, not a fresh key.

## Find, inspect, explain

Use `cc_list_stress_runs` with known `testRef`, `environmentRef` and/or `status`, following `nextCursor`
only as needed. If "the running test" matches several Runs, show safe names/refs and ask which one;
never stop all. A persisted reference from this conversation is preferable to guessing the latest.

`cc_get_stress_run` returns current state, observation timestamp, stop intent, report readiness and
links. A terminal state describes generation, not final report availability.
`cc_get_stress_report` defaults to a bounded summary. While pending, show the Run link and exact
reportState. When available, link `resultUrl` and explain offered/started/completed/failed/dropped/
unfinished separately: offered = started + dropped; successful = completed - failed. Created record
count is a separate measure. Report account observations as final, unobserved, or unavailable.
Use paged `flows`, `samples`, or `createdRecords` sections only when necessary; follow `nextOffset`
and retain omitted/total counts. Do not dump large raw evidence into conversation.

## Stop

For an explicit stop request with one resolved Run, call `cc_cancel_stress_run` immediately using a
new stop key. Preserve the returned link. Explain "stop requested; in-flight work may still finish."
For a repeated request reuse its key. A server conflict must be resolved before another effect.
Read status once if helpful; do not claim the Run stopped until its terminal state confirms it.
A Run cancelled before submission terminates without a workload or performance report; explain
`cancelledBeforeSubmission` / `availability: not_applicable` instead of reporting fake zero metrics.
Stopping a terminal Run is harmless and does not start another run or delete its records.
