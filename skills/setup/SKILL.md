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

`login` has a live-session fast path, and that is why it is not enough on its own. It opens the app
window and blocks until a live token lands — but when a live token already exists it returns
immediately and opens nothing. So "call `login`" satisfies "sign in" and does not satisfy "show me
the app".

### Do this

1. **Call `login`** (no arguments).
   * **No live token** → the branded window opens and the user signs in with Google or
     email/password. The call returns when a token lands. The window is now on screen; you are done.
   * **Live token** → returns at once, nothing opened. Continue to step 2.

   The managed Cognito Hosted UI is never shown; that path was removed. If `CC_API_KEY` is set, note
   that it covers CrossCheck only — Vertical Bar still needs this login, so do not report an API key
   as a substitute.

2. **Open the window yourself** — the same binary in GUI mode, run with **no arguments**:

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

3. **Say which of the two happened.** "Signed you in and opened the app" and "You were already signed
   in — here is the window" are different facts, and the second one is the one a user is about to be
   confused by.

## Switching accounts on desktop

`logout` clears the cached CrossCheck **and** Vertical Bar tokens; run it *before* `login` to sign in
as somebody else. It does not touch a `CC_API_KEY` fallback, so a stale key can still answer for
CrossCheck after a logout — mention it rather than letting the next call look like the new account.

## Do not

* Do not skip `runtime_info`; setup behavior is selected by the runtime surface it reports.
* Do not call `login` or attempt to open a window when `runtime.mode` is `headless`.
* Do not treat a returned token as proof the window is visible — step 1's fast path opens nothing.
* Do not open the managed Cognito web UI, or send the user to a browser to sign in. The window is the
  only supported path.
* Do not run the binary with `--mcp` here. That is the stdio server Claude Code already speaks to;
  starting a second one gives you a process nobody is talking to.
