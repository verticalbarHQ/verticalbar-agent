---
name: test-suite
description: Author and register a CrossCheck Test Suite from a user's need or QA checklist, then hand its run to the user in CrossCheck. Use for NetSuite regression checks such as "make sure the close still works" or "check nothing broke after the release". The agent never starts a run; it returns the CrossCheck page and steps. Explain what completed runs actually observed. NOT for writing test code; the runner executes a declared vocabulary, not scripts.
---

# Test Suite — from a need, to something that ran

Turn "make sure X still works" into a **registered Test Suite**, then hand its run to the user in CrossCheck.
Explain what completed runs actually observed.

> The platform owns execution and truth. You own the proposal. The one rule that makes this work at
> all: **you never invent an identifier.** Every script id, field id, saved search, role, list, file
> path and workflow you write into a suite must have come back `found` from the resolver.

## Why that rule is first

A previous author wrote a suite by guessing script ids that looked plausible. Every one of them
bounced when the account was asked. The account is the only thing that knows what is in it, and it
is one tool call away — so a guessed identifier is not a shortcut, it is a suite that cannot run.

## Method

### 1. Understand the need, and find the environment

Ask what breaking would look like, not what to test. "The close still works" becomes: the period can
close, the approval workflow is active, the report saved-search still returns rows.

Resolve workspace routing from `runtime_info`. With Cognito, call `cc_workspaces`. Use the sole
result automatically. If more than one is returned, ask the user to choose by safe name; never pick
the first or invent an id. Pass that discovered `workspaceId` to every CrossCheck tool. Then use
`cc_list_snapshots` / `cc_get_snapshot` to read what this environment actually contains before you
propose.

Call `cc_environments` for that workspace to resolve the exact target ID and `environmentType`.
Do not infer the NetSuite environment type from a name, account-ID pattern, user assurance, snapshot,
or the MCP server's deployment environment.

### 2. Learn what the runner can EXECUTE — not what the contract permits

**`cc_test_suite_capabilities` first, every time.** It returns the case kinds, the assertion kinds
allowed **per case kind**, the step actions, and the per-case assertion cap. It also returns the
JSON schema (and a key-level summary) of the envelope each assertion’s `expected` string must
encode, the config keys and values each action consumes, and the scalar/variable carriers. The MCP
definition tools publish `suite` and `revision` as plain objects, so capabilities is where the
grammar is read. Capabilities checks availability; it cannot add operations beyond that grammar.
The definition tools check every rule of the grammar when called; server semantic validation is
still required.
`find_or_create_record` is unavailable through MCP authoring because the stored contract cannot
represent its required `find_by` object; do not substitute a different shape.

No agent tool starts a Test Suite run. A person starts it in CrossCheck, where they can see the
suite and the target first. The fixed steps include record reads and mutations, while `endpoint_call`
and functional assertions may invoke existing tenant scripts, RESTlets or Suitelets. Those can change
account data when the person runs them, and they require the corresponding mutate scope. Unknown case,
assertion and action codes are rejected before a definition is forwarded.

It also returns **`definitionEnvelope`** — the member names of a suite, a revision, a case, an
assertion and a cleanup policy, and which are optional. Build your draft from that. Do not discover
the shape by submitting drafts and reading `STRUCTURE_INVALID`: that refusal names the member and
then lists five things that might be wrong with it, so it costs one round trip per field and tells
you least when you know least.

Two things it will tell you that are easy to get wrong:

- assertion kinds are **per case kind**. `field_value` is a `data_integrity` assertion; sending it on
  a `schema_validation` case is refused locally as `assertion_kind`.
- the case's `targetRef` IS the subject for `schema_validation` and `data_integrity` (a record type),
  and names the FLOW for `functional` (each assertion there names its own subject). One case, one
  subject — two record types means two cases.

### 3. Propose in prose, then GROUND every identifier

Draft what you mean in words: "the approval workflow", "the customer credit-limit field", "the
open-orders saved search". Then hand every candidate to **`cc_resolve_test_suite_refs`** with the
environment, and use **only what comes back `found`**.

```jsonc
{ "environment": "env_…", "refs": [
  { "ref": "wf",     "kind": "workflow",    "scriptId": "customworkflow_po_approval" },
  { "ref": "search", "kind": "savedsearch", "scriptId": "customsearch_open_orders" },
  { "ref": "field",  "kind": "field",       "recordType": "customer", "fieldId": "creditlimit" }
] }
```

`absent` means propose something else or tell the user that thing is not in this environment. It does
NOT mean "try it and see" — the run would spend a live call to learn what you already know.

`found` means present **in the snapshot named in the response**, not necessarily present now. If the
snapshot is old, say so rather than implying currency.

**When you need a VALUE and not just existence, read it — never register a check to learn it.**
`cc_live_read` runs a SELECT-only SuiteQL against the live account through the platform, so
"which period is open", "what is this field set to", "does this search return rows today" are one
read away. `cc_get_snapshot` answers the same questions as of the last capture.

A registered suite belongs to the customer. It appears in their list of what they check, it runs
when they run it, and one written to fail on purpose — an assertion aimed at a value you are trying
to discover, so the evidence prints it back — is a lie sitting in that list. **Do not do it, on any
auth path.** If a read is refused, say what you could not see and let the person decide, rather than
turning the harness into a query tool.

### 4. Write assertions that can FAIL

This is where a suite is usually weak, and the weakness is invisible: a check that cannot fail
reports a pass forever.

- **`suitelet_responds` REQUIRES a body predicate.** NetSuite answers HTTP 200 with its LOGIN PAGE
  for a Suitelet whose deployment is not "Available Without Login", so `expectedStatus: 200` alone is
  satisfied by the one outcome the assertion exists to catch. The rail refuses status-only here
  (`endpoint_body_predicate_required`).
- **`restlet_responds` should assert the body too.** A 200 carrying `{"success": false}` is a
  failure wearing a success's status code. Use `bodyMatch: {kind: "json_subset", …}`, and send a real
  `method` + `body` when the endpoint takes one.
- **Negatives exist — use them.** `bodyMatch` has `not_contains` and `not_json_subset`; the
  `field_compare` assertion carries `not_equals`, `not_contains`, the four numeric comparisons,
  `is_empty` / `is_not_empty` and `is_true` / `is_false`. "This deprecated field is gone" and "the
  status is not Closed" are the checks a regression suite is actually for.
- `field_value` is equality only, and stays that way. Reach for `field_compare` when you need an
  operator.

### 5. Ask before you write

**`cc_validate_test_suite_definition`** runs the real writer with the commit removed and answers
`accepted` | `refused` | `conflict`. Nothing is registered.

- `refused` lists EVERY violation with its path — fix them in one pass, do not re-submit per error.
- `conflict` means the refs are taken AND the rest of the definition was acceptable. Those are two
  different repairs and the writer's own 409 cannot tell them apart.

Only once it says `accepted` do you call **`cc_create_test_suite`**. The two take the **same
payload** — `{suite, revision}` — so `accepted` is a statement about the call you are about to make,
not about a near neighbour of it.

If the register call answers 409, one of the refs is taken. If the SUITE already exists, that is not
a naming problem: go to step 7 and add a revision. Registering the same suite under a new `suiteRef`
throws away every run it has ever done.

If this tool answers `Route not found`, the environment you are talking to predates the dry run.
Register directly — and **say that you could not validate first**. Reporting "validated" against a
route that does not exist is the exact class of false claim this skill spends its length preventing.

### 6. Hand the run to the user, then read what the account said

You do not start runs. Call **`cc_test_suite_run_handoff`** with the suite and, when the user has
chosen one, the environment ID from `cc_environments`. It returns the suite's CrossCheck page, its
newest revision, the environment's name, type and active state, and the steps: open the page, select
**Run this suite**, choose that environment, then **Run**. Give the user that link and those steps
as they are. Do not invent a URL, and do not click Run or start the run through another tool, API,
delegated agent or browser.

Say plainly what the run can change. A mutating revision changes records in the chosen account, and
`production` or `development` targets deserve an explicit warning before the user runs there.

When the user says the run has started, read it with `cc_get_test_suite` and the environment until
the run is terminal. Then explain, per case:

- `passed` / `failed` — the account answered and the assertion held or did not.
- `unsupported` — the runner refused the case locally; the reason token says why. It is **not** a
  failure of the account, and it is **not** a pass.
- `unknown` — the call was attempted and taught the run nothing. Never round this to either side.
- `skipped` — provably unattempted.

**Never report a pass that did not happen.** A check that could not run is `unknown`, and a suite
whose every case is `unsupported` is a suite that never tested anything, however green it looks.

### 7. Correcting a suite — a NEW REVISION, never a new suite

A suite that already exists is corrected by **adding a revision to it**, so it keeps its ref, its
name and its whole run history:

**`cc_get_test_suite_revision` first** — it returns the current revision IN FULL, with every case
and assertion. `cc_get_test_suite` gives you only the ref, ordinal and status, and an append
REPLACES nothing: whatever you leave out of the new revision is gone from what runs. Read it, change
the case that is wrong, send the rest back unchanged.

Then `cc_validate_test_suite_revision` → then `cc_add_test_suite_revision`.

`revisionOrdinal` must be **strictly greater** than the current newest — read it from
`cc_get_test_suite`. A stale or duplicate ordinal is refused naming that field, because the ordinal
is what "latest" means and two revisions claiming one number make it a coin flip.

Never register a corrected suite under a new `suiteRef`. That abandons every run the old one ever
did, and the history is the reason anyone trusts the suite.

## One limit worth telling the user about

**A run belongs to a (revision, environment) chain.** History is partitioned that way, so "this
suite's runs" always means one revision's runs in one environment — and the runner executes the
CURRENT revision or refuses (`manifest_drift`), never a superseded one.

## What this skill is NOT

- Not a way to write test code. The runner executes a declared vocabulary; if the need cannot be
  expressed in what `cc_test_suite_capabilities` returns, say that instead of approximating it.
- Not a mutation surface by default. A revision that declares mutating steps needs the mutating
  scope and writes to a real account — never propose one without saying, in the user's own terms,
  what it will create there and how it is cleaned up.
