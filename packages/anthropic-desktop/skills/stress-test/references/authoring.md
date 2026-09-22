# Contract authoring

1. Resolve workspace. Call `cc_stress_test_capabilities`, then `cc_list_stress_tests` and
   `cc_get_stress_test` when revising. Establish the target business activity, mix, offered rate and
   duration. A request to inspect is read-only; stop after answering it.
2. Resolve every flow's canonical `revisionRef` and `caseRef` using Test Suite reads. Reuse published
   `record_mutation` cases. If the needed case does not exist, use the test-suite skill's capabilities
   and reference-resolution method to propose it; creating that case is a separate concrete write.
   Stress owns weights, pools and load, not case steps. Do not auto-run the Test Suite while authoring.
3. Translate the requested workload to `schemaVersion: 1`, `flows`, optional `data`, and `load`.
   Each flow has `ref`, positive integer `weight`, `case: {revisionRef, caseRef}`, and optional
   `variables: {VARIABLE_NAME: "pool.column"}`. Unpooled variables are provided at run time.
   Data pools are nonempty row arrays, used round-robin. Explain incomplete rows; never fill unknown
   business IDs with invented values.
4. For `arrival`, specify `profile: "ramp" | "step"`, `timeUnit: "second" | "minute" | "hour"`, and
   stages `{durationSeconds, target}`. For explicitly requested `concurrent`, stages are a concurrent
   worker ramp and have no arrival profile/timeUnit. Zero-rate stages are valid, but not an all-zero
   curve. Weights are relative proportions. Smoke is one serial iteration per flow, first pool row;
   it does not execute the full curve and does not prove account capacity.
5. Call `cc_validate_stress_test_definition`, then `cc_preview_stress_test` with the exact candidate
   and known run variables. Structural acceptance alone does not prove executable compatibility.
   Preview compiles without registering a binding, provisioning runtime, or writing to NetSuite.
   Fix unsupported cases and paths. If only run-time values are absent, identify those variables
   explicitly; saving a draft is allowed, but don't describe it as execution-ready.
6. Present a concise contract: cases/mix, pool provenance and size, rate units, stage durations and
   total duration, unresolved variables, and real-write/no-cleanup behavior. For edits include the
   normalized diff from `cc_diff_stress_test_revisions` when both revisions exist, or a candidate
   comparison against the read revision. Existing approval applies only to that concrete scope.
7. Save via `cc_create_stress_test` or `cc_add_stress_test_revision`. Update only a draft using
   `cc_update_stress_test_draft` with `expectedDefinitionDigest`. Published revisions are immutable;
   append a revision for changes. Don't duplicate a suite to escape a reference conflict.
8. When publishing was requested, re-read the saved revision, check it matches the reviewed
   definition digest, and call `cc_publish_stress_test_revision` with that digest and distinct ready
   and publish keys. It freezes and publishes the revision. Report exact refs, digest and returned
   lifecycle state. Stop here unless execution was also requested.

Archiving applies only to a draft. Read it, explain the target, then use
`cc_archive_stress_test_draft` under the user's authorization. It does not stop an existing Run.
