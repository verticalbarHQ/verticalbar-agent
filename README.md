# VerticalBar Agent

Turns an analysis goal into a **Briefing** — a self-contained, interactive HTML analysis grounded in
real CrossCheck and Vertical Bar data, published to the product surface where your team can read it.

One binary, two modes: a desktop app for connecting NetSuite and CrossCheck, and a stdio MCP server
that puts the same capabilities inside Claude.

## Installation

Paste this to Claude (Claude Code, or Claude Desktop with filesystem access):

```
Install VerticalBar Agent from its public releases and wire it into Claude Desktop.

Release: https://github.com/verticalbarHQ/verticalbar-agent/releases/latest
Pick the asset for this machine — they're named VerticalBarAgent-<os>-<arch>.<ext>.
macOS ships a .dmg holding an .app bundle; Windows a .zip holding verticalbar-agent.exe.
Install it where apps belong on this OS. It's unsigned, so clear the OS's
quarantine / blocked-file attribute.

That same binary IS the MCP server — run it with `--mcp`.

Register it in Claude Desktop's config file, claude_desktop_config.json
(macOS ~/Library/Application Support/Claude/, Windows %APPDATA%\Claude\):
  mcpServers["verticalbar-agent"] = { command: <installed binary path>, args: ["--mcp"] }
Merge into the existing file — don't overwrite it.

Restart Claude Desktop, then open the app so I can sign in.
```

Then open the app and sign in to NetSuite and CrossCheck.

### Doing it by hand

1. Download the asset for your platform from the [latest release][latest].
2. **macOS** — open the `.dmg`, drag the app to `/Applications`. It is unsigned, so the first launch
   needs **right-click → Open** (or `xattr -dr com.apple.quarantine "/Applications/VerticalBar Agent.app"`).
   **Windows** — extract `verticalbar-agent.exe` somewhere permanent; Windows may warn on first run.
3. Open the app and use **Connect to Claude Desktop**. It writes the MCP entry for you, preserving
   any other servers already in the file.
4. **Restart Claude Desktop.** It reads that config only at startup, so until you do, nothing changes.

[latest]: https://github.com/verticalbarHQ/verticalbar-agent/releases/latest

## Verifying it worked

Ask Claude something that needs your data — *"list my CrossCheck workspaces"*. If the tools are not
there, the restart in step 4 is the usual reason.

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

- macOS on Apple silicon, or Windows x64.
- Claude Desktop (or Claude Code).
- A CrossCheck account. Sign in from the app — interactive browser sign-in, or `CC_API_KEY` for
  headless use.

## Updating

Install the newer release over the old one and restart Claude Desktop. The MCP entry keeps pointing at
the same path, so it needs no edit — unless you install somewhere new, in which case update `command`.
