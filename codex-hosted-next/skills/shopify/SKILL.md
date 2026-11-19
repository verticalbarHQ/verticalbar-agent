---
name: shopify
description: Read Shopify snapshots and backups, restore selected objects, run saved sync definitions, and manage Shopify runs through Vertical Bar Agent. Use for Shopify snapshot, backup, restore, sync, cancel, retry, resume, recheck, or item decisions, including 백업·복원·동기화. Also use for indirect requests to recover Shopify store data or inspect a saved copy, and incomplete Shopify recovery requests. For NetSuite snapshots or customization deployments use the corresponding CrossCheck skills instead.
---

# Shopify snapshots and runs

Use the five `cc_shopify_*` tools. All data returned to the agent excludes personal data. Tell the
user that personal data is omitted; never seek it through exports, original files, another tool,
or another identity.

1. Resolve the workspace with `cc_workspaces`. Use the sole authorized result; if several exist,
   ask the user to choose by name. Keep the returned workspaceId explicit.
2. Read `cc_environments` and select an active Shopify environment. Ask by name if several match.
   A CrossCheck environmentId is distinct from a workspaceId. Shopify snapshots are distinct from
   NetSuite snapshots returned by `cc_list_snapshots`.
3. Inspect `cc_shopify_snapshots` or `cc_shopify_runs view=sync_definitions`. A snapshotId returns
   details and paginated items. A runId with restore_runs or sync_runs returns details and items.
   Use `cc_shopify_object_data` for record, history, compare, compare_record, or recheck_result.
   Follow nextCursor until the requested scope is covered; report truncation or omitted data.
4. Before every write, describe the source, target, selected types/items, and commands in readable
   terms. A saved sync definition determines its commands: explicitly call out delete commands.
   Read [selection.md](references/selection.md) for selection limits and store effects before summarizing
   the write. Explain relevant monetary effects: gift-card/store-credit value changes on restore,
   and payment capture/void on existing-order sync transaction updates. Include selected amounts when
   available. If the definition does not make the scope clear, stop and ask instead of guessing.
   Do not invent missing scope.
5. Obtain the user's confirmation in this conversation before invoking either write tool, on
   every host. Host confirmation varies and is not permission to write. Claude also requires fresh
   interaction for these tools; ChatGPT uses tool annotations; Codex follows the user's approval
   policy. Server authorization remains authoritative.
6. Use `cc_shopify_start action=snapshot|restore|sync` for the confirmed intent. Sync executes an
   existing definition only. Restore needs a snapshotId and selected types/items, and owner/admin
   authority. Generate a UUID requestId once per user intent, retain it, and reuse it for retries
   of that same intent. Changed intent needs a new UUID; never retry an uncertain start with a new id.
7. Poll snapshots or runs to an observed terminal state; report the actual state and counts.
   Read [run-states.md](references/run-states.md) before recovery actions. Include the Run detail
   link using the discovered org/workspace slugs and environmentId:
   `/ORG/WORKSPACE/env/ENVIRONMENT/backups?backupView=activity&rrRun=RUN` for restore, or the saved definition's
   `/ORG/WORKSPACE/sync/DEFINITION` for sync. Use the connected CrossCheck
   app's base URL. If the identity needed for a link is absent, report that limitation.

`cc_shopify_manage_run` supports retry_failed, resume, cancel, recheck, accept_current, and
close_unresolved. retry_failed/resume/recheck require requestId; recheck and decisions require the
item index. accept_current also requires the completed checkId. Both decisions require the user's
reason: record only the user's decision and reason, without inferring approval. Decisions annotate
items; they do not change a run's status or retry selection. Cancellation retains writes already made.

Quote RESTORE_APPROVAL_FORBIDDEN, REQUEST_ID_CONFLICT, CHECK_REQUIRED, and RUN_NOT_RESUMABLE
verbatim when returned; do not change identities, scope, or ids to bypass a refusal. For
WRITE_ACCESS_REQUIRED, direct the user to approve write access in CrossCheck. This skill does not
approve access, author sync definitions, anonymize personal data, export data, start dry runs,
delete/tag/schedule snapshots, change marketing consent, or run NetSuite deployment workflows.
