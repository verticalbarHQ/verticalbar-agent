---
name: stress-test
description: Create, inspect, revise, validate, publish, or archive CrossCheck Stress Test contracts. Do not use this skill to run load tests.
---

# Stress Test contracts

This skill is for Stress Test contract management only. It has no run-start or run-cancel tool.

Resolve the workspace first. For a read, call `cc_list_stress_tests`, `cc_get_stress_test`, or `cc_diff_stress_test_revisions` immediately. Validation is read-only: call `cc_validate_stress_test_definition` without asking for confirmation.

For a read, `cc_get_stress_run` reads one run by `runRef`; `cc_get_stress_report` reads its sealed report and may return the server's exact not-ready refusal. For a mutation, read the exact target revision and preserve every existing flow, data pool, load stage, and tag unless the user explicitly asks to change it. Validate the complete candidate, then show exactly once:

```
Target: <workspace / testRef / revisionRef / current status>
Change: <normalized structural diff summary>
Effect: <create | draft update | immutable publish | draft archive>
```

Ask for one confirmation immediately before each requested mutation. The `ready` then `publish` calls are one publish operation and use that single confirmation. Direct MCP tool calls have no confirmation state machine; if a mutation fails, report the Core error and stop.

Use a caller-provided idempotency key for every mutation. Never infer success: report the Core response or its error code. `cc_publish_stress_test_revision` performs the adjacent ready-to-published lifecycle transition; do not create a separate ready goal.
