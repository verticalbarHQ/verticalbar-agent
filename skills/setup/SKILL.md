---
name: setup
description: Prepare the current VerticalBar Agent runtime for use. On desktop, open the app and sign in when needed; on headless Linux, verify CrossCheck auth without attempting a window or interactive login. Use when the user says setup / sign in / log in / open the app / show the agent window / "띄워줘", when a CrossCheck or Vertical Bar tool has failed for want of an identity, or before any flow that needs an identified user (starting a CI workflow run, NetSuite onboarding).
---

# Setup — prepare this runtime

One outcome: **the current runtime is prepared, or its exact configuration gap is identified.** A
desktop runtime can open the VerticalBar Agent window and establish Cognito identity. A headless
runtime cannot; it can use a host-provided `CC_API_KEY` for CrossCheck only.

## Decide the runtime first

1. **Call `runtime_info` before `login` or any attempt to open the app.** Use its `runtime.surface`,
   `runtime.mode`, `runtime.canOpenWindow`, and `auth` fields as facts. Do not infer capability from
   the host OS, the operator's wording, or environment variables visible in chat. In particular, the
   Node compatibility surface is GUI-less even when its OS is macOS or Windows.

2. If it reports `headless`, follow **Headless** below. Otherwise follow **Desktop**.

3. Before any workspace-scoped CrossCheck call, follow `workspaceRouting`:
   * `api-key-bound` → call the requested CrossCheck tool without `workspaceId`; do not call
     `cc_workspaces` because API-key auth cannot enumerate Cognito workspaces.
   * `discover` → if the current request has no workspace selected from an earlier authenticated
     result, call `cc_workspaces`. Use its sole result automatically. If it returns more than one,
     show the safe workspace names and ask the user to choose; never select the first or invent an
     ID. Pass the returned `workspaceId` to the original tool and retry it at most once.
   * `unavailable` → resolve authentication first as described below.

   Vertical Bar follows the same rule through `vb_workspaces`; never substitute a CrossCheck
   workspace list or an account/tenant number for its returned `workspaceId`.

## Headless

* **Never call `login`, open a browser, or run the binary in GUI mode.** This runtime has no supported
  interactive sign-in or window surface.
* If `auth.crosscheck` is `api-key` or `cognito`, report that CrossCheck authentication is configured
  and continue with the requested CrossCheck work. Presence is not a server-side validity check; if
  a tool returns an authentication or authorization error, treat that refusal as authoritative.
* If `auth.crosscheck` is `none`, tell the operator to set `CC_API_KEY` in the MCP host environment
  and restart the MCP server. Never ask them to paste the key into chat or a tool argument.
* `CC_API_KEY` is CrossCheck-only. If `auth.verticalbar` is `none`, say that Vertical Bar tools need
  a Cognito session established from a desktop-capable runtime; do not present the API key as a
  substitute.
* Do not claim that a headless runtime is signed in merely because CrossCheck API-key auth is ready.

## Desktop compiled client

`runtime_info` is authoritative about whether a live session already exists. Do not call `login`
when the requested service already reports `cognito`; continue the original task. Opening the app
window is a separate user request and does not require re-authentication.

### Do this

1. **If the needed auth is `none`, call `login`** (no arguments).
   The branded window opens and the user signs in with Google or email/password. The call returns
   when a token lands. Treat that as successful authentication and resume the user's original task.

   **If the needed auth is already `cognito`, skip `login`.** Do not create an approval-bearing
   authentication subflow merely to prove a session that `runtime_info` already reported.

   The managed Cognito Hosted UI is never shown; that path was removed. If `CC_API_KEY` is set, note
   that it covers CrossCheck only — Vertical Bar still needs this login, so do not report an API key
   as a substitute.

2. **Only when the user asked to see/open the app, open the window yourself** — the same binary in
   GUI mode, run with **no arguments**:

   ```
   macOS   ~/Library/Application Support/verticalbar-agent/<target>/app/VerticalBar Agent.app/Contents/MacOS/verticalbar-agent
   Windows %LOCALAPPDATA%\verticalbar-agent\<target>\app\verticalbar-agent.exe
   ```

   Resolve `<target>` by listing that directory rather than guessing the triple — it is the platform
   target the launcher installed for this machine, and it changes between architectures. Launch it
   detached so it outlives the tool call.

   **Never re-download or re-install it here.** The launcher owns installation and signature
   verification, and it re-verifies before every spawn. If the binary is not there, say so and stop:
   an unverified binary you fetched yourself is exactly what that design prevents.

3. **Resume the original task.** A successful `login` is a completed authentication subflow, not a
   terminal answer when the user asked for a read or another tool action.

## Switching accounts on desktop

`logout` clears the cached CrossCheck **and** Vertical Bar tokens; run it *before* `login` to sign in
as somebody else. It does not touch a `CC_API_KEY` fallback, so a stale key can still answer for
CrossCheck after a logout — mention it rather than letting the next call look like the new account.

## Do not

* Do not skip `runtime_info`; setup behavior is selected by the runtime surface it reports.
* Do not call `login` or attempt to open a window when `runtime.mode` is `headless`.
* Do not call `login` when `runtime_info` already reports the needed Cognito session.
* Do not open the managed Cognito web UI, or send the user to a browser to sign in. The window is the
  only supported path.
* Do not run the binary with `--mcp` here. That is the stdio server Claude Code already speaks to;
  starting a second one gives you a process nobody is talking to.
