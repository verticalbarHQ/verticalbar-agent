---
name: setup
description: Open the VerticalBar Agent app — signing in first when there is no live session, and just showing the window when there already is one. Use when the user says setup / sign in / log in / open the app / show the agent window / "띄워줘", when a CrossCheck or Vertical Bar tool has failed for want of an identity, or before any flow that needs an identified user (starting a CI workflow run, NetSuite onboarding).
---

# Setup — open the app, signed in

One outcome: **the VerticalBar Agent window is on screen and the user is signed in.** Two ways to
get there, and which one applies is decided by the token cache, not by asking.

## The one thing to know first

`login` is **idempotent, and that is why it is not enough on its own.** It opens the app window and
blocks until a live token lands — but when a live token already exists it returns *immediately and
opens nothing*. So "call `login`" satisfies "sign in" and does **not** satisfy "show me the app". A
skill that only calls `login` looks broken to an already-signed-in user: nothing appears, and the
reply says success.

## Do this

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

## Switching accounts

`logout` clears the cached CrossCheck **and** Vertical Bar tokens; run it *before* `login` to sign in
as somebody else. It does not touch a `CC_API_KEY` fallback, so a stale key can still answer for
CrossCheck after a logout — mention it rather than letting the next call look like the new account.

## Do not

* Do not treat a returned token as proof the window is visible — step 1's fast path opens nothing.
* Do not open the managed Cognito web UI, or send the user to a browser to sign in. The window is the
  only supported path.
* Do not run the binary with `--mcp` here. That is the stdio server Claude Code already speaks to;
  starting a second one gives you a process nobody is talking to.
