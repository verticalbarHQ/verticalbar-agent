---
name: deployment
description: Assemble a CrossCheck Release Package and run it through a CI workflow — create the package, add customization items, then start a workflow run and follow it. Use when the user wants to deploy, promote, or release NetSuite customizations between environments, asks what a release contains, wants a CI workflow started or its run status, or says deploy / release / promote / 배포 / 릴리스. These are the only mutating tools this plugin exposes; read the authorization rules below before calling one.
---

# Deployment — release packages and CI workflow runs

Four read tools and three that mutate. The mutating three are the **only** writes this plugin
performs against CrossCheck, and they are governed differently from everything else here.

| Tool | Kind | Requires |
| --- | --- | --- |
| `cc_list_release_packages`, `cc_get_release_package` | read | workspace scope |
| `cc_list_ci_workflows`, `cc_get_ci_workflow`, `cc_get_ci_workflow_run` | read | workspace scope; API-key mode fine |
| `cc_create_release_package` | **MUTATES** | `deploy:write` |
| `cc_add_release_package_items` | **MUTATES** | `deploy:write`, package still a draft |
| `cc_start_ci_workflow_run` | **MUTATES** | an **identified Cognito user** — an API key cannot start a run |

## The authorization rule that trips people

`cc_start_ci_workflow_run` needs a real signed-in human. **No API key can start a run**, however
broad its scope — this is a server guard, not a client check, so you cannot work around it and should
not try. If `CC_API_KEY` is all that is set, creating and filling a package works and starting the
run does not.

When a run is refused for identity, the fix is to sign in: use the **`setup`** skill, then retry. Do
not report the refusal as a workflow problem.

**This plugin has no approval capability.** If a workflow stage needs approval, that happens in
CrossCheck, by a person. Never describe a run as blocked-on-you, and never imply you can approve it.

## The order, and why it is the order

1. **`cc_workspaces`** — every tool below takes an explicit `workspaceId`. Never infer one from
   context or reuse one across a conversation that changed workspace; a deploy aimed at the wrong
   workspace is not a recoverable mistake.
2. **`cc_create_release_package`** `{workspaceId, name, description?, environmentId?}` — returns the
   server response unchanged, including the package id you will need next.
3. **`cc_add_release_package_items`** `{workspaceId, packageId, items[]}` — the response carries
   `autoInclude.status`. **Read it.** CrossCheck may pull in dependencies you did not list, and that
   set is what will actually deploy. Report what `autoInclude` added, not what you asked for.
   Items can only be added while the package is a **draft**; a package past that state refuses, and
   the refusal is the server's, so surface it verbatim rather than retrying.
4. **`cc_list_ci_workflows`** / **`cc_get_ci_workflow`** — pick the workflow and read its ordered
   stages. `cc_get_ci_workflow` joins each stage to its environment name, which is the only readable
   way to confirm a promotion is aimed where the user thinks it is. Confirm the target environment
   with the user before step 5 whenever the workflow touches production.
5. **`cc_start_ci_workflow_run`** `{workspaceId, workflowId, packageId}` — the request body is exactly
   the package id. Returns the server response unchanged.
6. **`cc_get_ci_workflow_run`** — poll for status. A started run is not a finished one; do not report
   a deployment as done from the start call's response.

## Reporting

* **The server is authoritative on everything** — authorization, identity, workspace, draft state,
  baseline rules. These tools return its response *unchanged* by design. Quote it; do not paraphrase
  a refusal into your own words, and never soften one into "it may not have permission".
* **Say what is in the package**, from `cc_get_release_package` after the adds, not from the list you
  submitted — `autoInclude` is exactly the gap between the two.
* **A run has stages.** "Started" is one fact and "passed" is another; give the run id and the stage
  it is on rather than a single verdict.

## Do not

* Do not create a package to "see what happens". These are writes to a customer's release pipeline.
* Do not start a run the user did not ask for, and never as a way of testing that a package is valid.
* Do not retry a refused mutation with different arguments hoping it lands — a refusal names its
  reason, and working around it is the one thing this governed exception exists to prevent.
