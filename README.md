# VerticalBar Agent

Turns an analysis goal into a **Briefing** — a self-contained, interactive HTML analysis grounded in
real CrossCheck and Vertical Bar data, published to the product surface where your team can read it.

One binary, two modes: a desktop app for connecting NetSuite and CrossCheck, and a stdio MCP server
that puts the same capabilities inside your assistant.

## Install

**One plugin, one repository, every surface.** You add `verticalbarHQ/verticalbar-agent` as a plugin
marketplace and install from it. Nothing to download, no file to edit.

| You use | Do this |
|---|---|
| **Claude Desktop** | Settings → **Customize → Plugins** → **Add plugin → Add marketplace → Add from repository** → `verticalbarHQ/verticalbar-agent` → **Install** |
| **Claude Code** | `/plugin marketplace add verticalbarHQ/verticalbar-agent`<br>`/plugin install verticalbar-agent@verticalbar-agent` |
| **Codex CLI** | `codex plugin marketplace add verticalbarHQ/verticalbar-agent`<br>`codex plugin add verticalbar-agent@verticalbar-agent` |

All of them give you the same thing: the **`briefing`** skill, and the tools it needs. Ask for
`/briefing` in a new chat to check it arrived.

Then ask for something that needs your data — *"list my CrossCheck workspaces"* — and sign in when it
prompts you.

### Claude Desktop

1. **Settings** (⌘,) → **Customize → Plugins**.
2. **Add plugin → Add marketplace → Add from repository**.
3. Enter `verticalbarHQ/verticalbar-agent`. Leave **Auto-sync** on if you want updates to arrive on
   their own.
4. **Sync**, then **Install** on the *Verticalbar agent* card.

The plugin's detail page lists exactly what it brings: the `/briefing` skill under **Skills**, and
the `verticalbar-agent` server under **Connectors**.

### Claude Code

```
/plugin marketplace add verticalbarHQ/verticalbar-agent
/plugin install verticalbar-agent@verticalbar-agent
```

Then **restart Claude Code** — the MCP server loads at session start. Update later with
`/plugin update verticalbar-agent@verticalbar-agent`.

### Codex CLI

```
codex plugin marketplace add verticalbarHQ/verticalbar-agent
codex plugin add verticalbar-agent@verticalbar-agent
```

Then **start a new Codex session** — the MCP server loads at session start. `codex plugin list`
shows the installed version. Refresh the catalog with
`codex plugin marketplace upgrade verticalbar-agent`, then `codex plugin add` again to move to it.

One thing works differently here, and it is worth knowing before you deploy anything: on Claude Code,
starting a CI workflow run asks you to confirm **every time**, because the tool is published with
Anthropic's `requiresUserInteraction` marker. Codex does not implement that marker — whether you are
asked is decided by **your own Codex approval policy**, not by this plugin. Nothing about the server
changes: starting a run still requires a signed-in CrossCheck user (never an API key), and the
environment is written only after CrossCheck's own Pipeline stage approval. Treat the client prompt
as a convenience, not the control.

### Signing in

**Just ask for your data.** *"List my CrossCheck workspaces."* If you are not signed in, the plugin
opens the **VerticalBar Agent sign-in window** for you — Google or email/password — and continues as
soon as you finish. There is nothing to install first and no command to remember.

That window is the same app as the `.dmg` below; the plugin already has it and launches it when it is
needed. Install the `.dmg` separately only if you want to open the app yourself, e.g. to connect a
NetSuite environment.

For headless use, set `CC_API_KEY` instead and no window appears.

### Updating

Nothing to download here either. The compiled client the plugin runs **updates itself** — every
launch checks a signed manifest, verifies the download against a pinned key, and refuses anything
older than the floor.

The plugin itself follows its surface: **Claude Desktop** re-syncs from the repository when
auto-sync is on; **Claude Code** updates with `/plugin update verticalbar-agent@verticalbar-agent`;
**Codex** refreshes with `codex plugin marketplace upgrade verticalbar-agent`.

### The desktop app (optional)

**You do not need to install this to sign in** — the plugin opens its window for you. Install it
separately only to open the app on its own, which is how you connect a NetSuite environment.

1. Download `VerticalBarAgent-macos-arm64.dmg` from the [latest release][latest], open it, and drag
   **VerticalBar Agent** to `/Applications`.
2. It is **unsigned**, so the first launch needs **right-click → Open** (or
   `xattr -dr com.apple.quarantine "/Applications/VerticalBar Agent.app"`).
3. Open it and sign in.

The app can also register itself with Claude Desktop directly, via **Connect to Claude Desktop**.
That is a **fallback** — it gives Claude the tools but **not** the `/briefing` skill, because it
registers a connector rather than installing a plugin. Use the plugin path above unless something
prevents it, and do not use both: two registrations of the same server is one too many.

[latest]: https://github.com/verticalbarHQ/verticalbar-agent/releases/latest

## Verifying it worked

Type **`/briefing`** in a new chat. If it is there, the skill installed. Then ask for something that
needs your data — *"list my CrossCheck workspaces"* — to confirm the tools reach your account.

If `/briefing` is missing:

- **Claude Desktop** — Settings → Customize → Plugins, confirm *Verticalbar agent* is installed and
  enabled. If you registered the desktop app with **Connect to Claude Desktop** instead, you have the
  connector but not the plugin, so there is no skill — install the plugin.
- **Claude Code** — restart the session; the plugin loads at session start.
- **Codex** — `codex plugin list` should show `verticalbar-agent@verticalbar-agent` as *installed*;
  start a new session afterwards.

If `/briefing` is there but the tools fail, you are signed out — ask for your data again and
finish signing in in the window that opens.

## What it can do

- **Read** CrossCheck and Vertical Bar: snapshots, customizations, dependency graphs, SuiteScript
  source, script telemetry, process cases and variants.
- **Publish a Briefing** — `briefing_publish` — and record *why*: the prompt that asked for it and the
  session's tool activity travel with it, so a reader can see what the analysis rests on.
- **Read NetSuite live** through CrossCheck, for facts the landed snapshot cannot answer.
- **Author CrossCheck Test Suites** against a connected environment.
- **Deployment**: release packages and CI workflows. Every mutation is one direct server call — the
  server is the sole authority, and this client adds no approval step of its own. On Claude Code the
  host asks you to confirm before a run is started; on Codex it does not (see above).

Analysis paths are read-only over HTTP. This client holds no database or NetSuite credentials.

## Requirements

- **Claude Desktop, Claude Code, or Codex CLI.**
- **macOS on Apple silicon, or Windows x64** — the compiled client the plugin runs is native, and
  Intel Macs are not supported.
- A CrossCheck account. Sign in interactively (browser, including Google), or set `CC_API_KEY` for
  headless use.

## Verifying a download

Every release asset is signed with minisign against a pinned key:

```sh
minisign -Vm VerticalBarAgent-macos-arm64.tar.gz -P RWRKzVE+208a7cjnPi9jtqylZDIGOP8TrdmjS3AuJCaCX1XlltTlqgDo
```
