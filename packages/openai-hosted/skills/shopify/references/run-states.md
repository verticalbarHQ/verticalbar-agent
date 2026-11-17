# Observed states and recovery

Snapshots can be deferred or running before sealed, failed, deleting or deleted. Read records only
from a sealed snapshot. Deferred snapshots wait for writes on the same store; avoid duplicate starts.

Runs can wait, queue or run before reaching completed, partially_failed, failed, cancelled or skipped.
Report the server's actual state, failure code and counts; an accepted request is not completion.
Cancel requests do not undo writes. Poll until cancellation is observed.

retry_failed and resume are server-guarded recovery actions. A completed run returns
409 RUN_NOT_RESUMABLE. Inspect failed items and request user confirmation before attempting recovery.
Do not reinterpret an item decision as successful recovery.

Recheck creates a check for one run item. Poll recheck_result with the returned checkId. A user may
accept_current only after a sealed check of that object; otherwise CHECK_REQUIRED is authoritative.
Both accept_current and close_unresolved record the user's reason. They retain the run's outcome.
