---
name: setup
description: Prepare the current Vertical Bar Agent runtime for use. Inspect runtime_info, establish Cognito identity only when needed, and discover authorized workspaces without guessing. Use for setup, sign in, login, opening the app, or a tool that lacks identity.
---

# Setup — prepare this runtime

One outcome: **the current runtime is prepared, or its exact capability gap is identified.** Identity
always comes from an explicit Cognito session. A host environment value is never a user, credential,
workspace, deployment, or endpoint source.

## Decide the runtime first

1. **Call `runtime_info` before `login` or any attempt to open the app.** Use `runtime.surface`,
   `runtime.mode`, `runtime.canOpenWindow`, `runtime.canOpenBrowser`, and `auth` as facts.
2. Follow the reported surface:
   * `desktop` — compiled app login can open the Vertical Bar Agent window.
   * `local-node` — the Node compatibility surface is GUI-less, but no-argument `login` can open
     browser OAuth.
   * `headless` — compiled runtime has no interactive local login. Do not call `login` or start a GUI
     child. Report the exact limitation and use the hosted MCP endpoint when available.
3. For a workspace-scoped CrossCheck call, follow `workspaceRouting`:
   * `discover` → call `cc_workspaces` if the conversation has no authorized selection. Use its sole
     result automatically. If it returns more than one, show safe names and ask the user to choose;
     never select the first or invent an ID. Pass the returned `workspaceId` to the original tool and
     retry it at most once.
   * `unavailable` → establish authentication, then discover.

Vertical Bar follows the parallel rule through `vb_workspaces`; never substitute a CrossCheck
workspace list or an account/tenant number for its returned `workspaceId`.

## Establish authentication

1. If the needed service already reports `cognito`, skip `login` and continue the original task.
2. If authentication is `none` and the surface is `desktop` or `local-node`, call `login` with no
   arguments. Resume the original task when the explicit Cognito flow succeeds.
3. If authentication is `none` and the surface is compiled `headless`, do not call `login`: it must
   fail immediately. Hosted MCP is the intended headless route when available.

## Open the installed app only when requested

Only a compiled desktop runtime can open the app. Resolve `<target>` by listing the verified install
directory and launch the existing binary detached. Never download or reinstall from this skill; the
signed launcher owns installation and verification.

## Switching accounts

`logout` clears the shared CrossCheck and Vertical Bar Cognito session. Run it before `login`, then
repeat workspace discovery. Never reuse a workspace choice across identities.

## Do not

* Do not skip `runtime_info` or call `login` when the needed Cognito session is already live.
* Do not call `login` or start a GUI child on compiled headless runtime.
* Do not ask a user to paste a password, token, API key, workspace ID, or endpoint into chat.
* Do not run a second `--mcp` process.
* Do not guess a workspace or treat a caller-supplied ID as authorization.
