# VerticalBar Agent

Turns an analysis goal into a **Briefing** — a self-contained, interactive HTML analysis grounded in
real CrossCheck and Vertical Bar data, published to the product surface where your team can read it.

One binary, two modes: a desktop app for connecting NetSuite and CrossCheck, and a stdio MCP server
that puts the same capabilities inside Claude.

## Install

**Pick the row for the Claude you actually use.** The two surfaces install differently and neither
path works on the other — Claude Desktop cannot add a custom plugin marketplace, and Claude Code
does not read Desktop's extensions.

| You use | Do this |
|---|---|
| **Claude Desktop** | Download `verticalbar-agent-<version>.mcpb` from the [latest release][latest] and double-click it. |
| **Claude Code** | `/plugin marketplace add verticalbarHQ/verticalbar-agent` then `/plugin install verticalbar-agent@verticalbar` |

Then ask Claude for something that needs your data — *"list my CrossCheck workspaces"* — and sign in
when it prompts you.

### Claude Desktop

1. Download **`verticalbar-agent-<version>.mcpb`** from the [latest release][latest].
2. Double-click it, or drag it onto the Claude Desktop window. (Equivalently: Settings → Desktop App
   → Extensions → Install Extension.)
3. Review the permissions Claude Desktop shows you, and install.

That is the whole install. Claude Desktop ships its own Node runtime, so there is nothing else to
install and no config file to edit. There is no Gatekeeper prompt — Claude Desktop runs the
extension, so macOS never sees an app *you* launched.

Sign in with the `login` tool (browser sign-in, including Google), or fill in the optional
`CC_API_KEY` field in the extension's settings for the headless path.

> **The `.mcpb` does not include the desktop GUI app.** It gives Claude the tools. If you also want
> the app — to connect NetSuite, or to sign in from a window instead of a tool call — install the
> `.dmg` too (below). Most people only need the `.mcpb`.

> **A `.mcpb` has no update channel.** To upgrade, install the newer one from a later release. The
> Claude Code plugin and the desktop app both update themselves.

### Claude Code

```
/plugin marketplace add verticalbarHQ/verticalbar-agent
/plugin install verticalbar-agent@verticalbar
```

Then **restart Claude Code** — the MCP server loads at session start. Update later with
`/plugin update verticalbar-agent@verticalbar`.

You do not need any release download for this path: the plugin fetches and signature-verifies the
compiled client on first run.

### The desktop app (optional)

Only needed to connect NetSuite, or to sign in from a GUI.

1. Download `VerticalBarAgent-macos-arm64.dmg` from the [latest release][latest], open it, and drag
   **VerticalBar Agent** to `/Applications`.
2. It is **unsigned**, so the first launch needs **right-click → Open** (or
   `xattr -dr com.apple.quarantine "/Applications/VerticalBar Agent.app"`).
3. Open it and sign in.

If you want the app to serve Claude Desktop *instead of* the `.mcpb`, use its **Connect to Claude
Desktop** button — it writes the MCP entry itself, preserving any other servers already configured —
then **restart Claude Desktop**. Do not do both; two registrations of the same server is one too many.

[latest]: https://github.com/verticalbarHQ/verticalbar-agent/releases/latest

## Verifying it worked

Ask Claude something that needs your data — *"list my CrossCheck workspaces"*. If the tools are not
there:

- **Claude Desktop, `.mcpb`** — check Settings → Extensions to confirm it is installed and enabled.
- **Claude Desktop, desktop app** — you almost certainly have not restarted it. It reads its config
  only at startup.
- **Claude Code** — restart the session; the MCP server loads at session start.

## What it can do

- **Read** CrossCheck and Vertical Bar: snapshots, customizations, dependency graphs, SuiteScript
  source, script telemetry, process cases and variants.
- **Publish a Briefing** — `briefing_publish` — and record *why*: the prompt that asked for it and the
  session's tool activity travel with it, so a reader can see what the analysis rests on.
- **Read NetSuite live** through CrossCheck, for facts the landed snapshot cannot answer.
- **Author CrossCheck Test Suites** against a connected environment.
- **Deployment**: release packages and CI workflows. Every mutation is one direct server call — the
  server is the sole authority, and this client adds no approval step of its own.

Analysis paths are read-only over HTTP. This client holds no database or NetSuite credentials.

## Requirements

- **Claude Desktop** — any supported platform; the `.mcpb` carries no native code.
- **The desktop app / the Claude Code plugin's compiled client** — macOS on Apple silicon, or
  Windows x64. Intel Macs are not supported.
- A CrossCheck account. Sign in interactively (browser, including Google), or set `CC_API_KEY` for
  headless use.

## Verifying a download

Every release asset is signed with minisign against a pinned key:

```sh
minisign -Vm verticalbar-agent-<version>.mcpb -P RWRKzVE+208a7cjnPi9jtqylZDIGOP8TrdmjS3AuJCaCX1XlltTlqgDo
```
