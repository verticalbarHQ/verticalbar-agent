# VerticalBar Agent

Use CrossCheck and Vertical Bar from ChatGPT, Codex, and Claude with grounded skills and governed
MCP tools. The distribution has two products because a cloud host cannot install or launch a local
desktop application.

## Choose the right product

| Product | Use it in | MCP connection | Separate app |
| --- | --- | --- | --- |
| **VerticalBar Agent** | ChatGPT web/desktop, Codex cloud, Claude web/Desktop Chat/Cowork | Production remote MCP | Not required |
| **VerticalBar Agent Desktop** | ChatGPT desktop Work, Codex CLI/IDE, Claude Code and local Claude Desktop | Local stdio bridge | Required for interactive sign-in and NetSuite onboarding |

Both products are generated from the same canonical `briefing`, `deployment`, and `test-suite`
skills. Desktop additionally includes `setup`, because only an installed runtime can open the
companion or perform local onboarding.

Do not install a hosted and local registration of the same MCP server in one host session. That
creates duplicate tools. Pick the row that matches where the assistant is running.

## Hosted product

Install **VerticalBar Agent** from the platform's plugin directory when it becomes publicly listed.
During next/private validation, use the package or workspace draft supplied by your Vertical Bar
operator.

1. Install or enable **VerticalBar Agent**.
2. Start a new chat.
3. Ask: *“List the CrossCheck workspaces I can access.”*
4. Complete the host's OAuth flow when the first protected tool is used.

Tool names and descriptions may be discovered before authentication. Tool execution, skill content,
downstream token exchange, and workspace data remain authenticated and server-authorized.

Hosted packages never install, launch, or depend on the Tauri desktop companion. NetSuite connection
onboarding remains a Desktop capability.

## Desktop Companion product

Install **VerticalBar Agent Desktop** when the assistant runs locally and needs the local stdio
bridge or NetSuite onboarding.

### Claude Code

```text
/plugin marketplace add verticalbarHQ/verticalbar-agent
/plugin install verticalbar-agent@verticalbar-agent
```

Restart Claude Code after installation. Existing `verticalbar-agent` installs retain this technical
identity so updates do not silently strand current Desktop users.

### ChatGPT desktop Work, Codex CLI, and Codex IDE

```sh
codex plugin marketplace add verticalbarHQ/verticalbar-agent
codex plugin add verticalbar-agent@verticalbar-agent
```

Restart the ChatGPT app, Codex session, or IDE extension after installation. Hosted `chatgpt.com`
does not read the local plugin cache or start its stdio process; use the Hosted product there. The
Hosted package has the separate technical ID `verticalbar-agent-hosted` while its user-facing name
remains **VerticalBar Agent**.

### Install the companion app

Download the correct signed native artifact from [GitHub Releases][latest]. The current native
matrix is macOS Apple silicon, Windows x64, and Linux x64 musl. Intel macOS is not supported.

The plugin and companion are coordinated but separately installed artifacts. A marketplace plugin
cannot install Tauri on behalf of ChatGPT or Claude.

### Verify a native download

Every native release asset has a detached minisign signature. Verify the archive before running it
with the public key pinned by both the launcher and the companion updater:

```sh
minisign -Vm VerticalBarAgent-macos-arm64.tar.gz -P RWRKzVE+208a7cjnPi9jtqylZDIGOP8TrdmjS3AuJCaCX1XlltTlqgDo
```

Use the matching archive name for Windows or Linux. A missing or invalid signature is a hard stop.

## Authentication and workspace routing

- Hosted: the MCP request carries the host OAuth token. Reconnect the plugin if the host reports an
  expired or invalid session.
- Desktop: the companion opens interactive Cognito sign-in where supported; the Node compatibility
  runtime can open browser OAuth.
- Linux headless local binaries do not attempt interactive login; use the hosted remote product for
  cloud sessions.
- Always discover authorization with `cc_workspaces` or `vb_workspaces`. There is no ambient
  workspace fallback.
- No plugin package requires or accepts a distributed API-key environment variable.

The CrossCheck server remains authoritative for organization, workspace, environment, and mutation
authorization. Client prompts are usability aids, not approval authority.

## Verify the installation

In a new chat:

1. Confirm the `briefing`, `deployment`, and `test-suite` skills are visible or naturally selected.
2. Ask for `runtime_info`.
3. Ask for the CrossCheck workspaces you can access.
4. Select only a workspace returned by discovery.

Desktop installs also expose `setup`. Hosted installs intentionally do not.

If skills are missing, refresh the plugin information and start a new chat. If skills are present
but a tool returns `401`, reconnect OAuth; do not paste credentials into the conversation.

## Updating and removing

- Hosted plugins update through the OpenAI or Anthropic directory/workspace release.
- Claude Code repository installs update with
  `/plugin marketplace update verticalbar-agent` followed by
  `/plugin update verticalbar-agent@verticalbar-agent`.
- Codex repository installs update with `codex plugin marketplace upgrade verticalbar-agent`, then
  reinstall the listed plugin and start a new session.
- The Desktop launcher downloads only signed native manifests and refuses a version below the
  signed floor.

Remove the plugin from the host's plugin directory or CLI. Removing a plugin does not delete the
CrossCheck account or server-side data. See [INSTALL](docs/INSTALL.md) for local cache cleanup.

## Channels and provenance

- **stable** is the public, promoted package and signed native payload.
- **next** is the prerelease candidate used for validation.
- **dev/candidate** is a generated local marketplace bound to one source tree; it is never a public
  fallback channel.
- Promotion moves the exact candidate already tested; it does not rebuild it.

| Product | stable technical ID | next technical ID |
| --- | --- | --- |
| VerticalBar Agent (Hosted) | `verticalbar-agent-hosted` | `verticalbar-agent-hosted-next` |
| VerticalBar Agent Desktop | `verticalbar-agent` | `verticalbar-agent-next` |

Public directories may choose to show only the stable listing. The repository catalog keeps the
next IDs explicit so a candidate can be installed and verified without changing an existing stable
installation.

The generated [`releases/`](releases/) surface binds the source commit, plugin version, canonical
skill digest, package digests, compatibility matrix, and file checksums. Native stable and next
manifests remain signed GitHub Release assets.

## Capabilities

- Read authorized CrossCheck snapshots, customizations, SuiteScript source, dependency graphs, and
  telemetry.
- Read authorized Vertical Bar process projects, variants, cases, and episode summaries.
- Build and publish grounded interactive Briefings.
- Author and run CrossCheck Test Suites.
- Inspect release packages and CI workflows, with mutations remaining behind server-side scopes and
  Pipeline approval.

See [SECURITY](docs/SECURITY.md) for the public security boundary.
Marketplace reviewers and operators can inspect the public [submission dossier](marketplace/).

## Downloadable package ZIPs

Each stable GitHub Release also carries four exact plugin archives and
`PACKAGE-SHA256SUMS`:

- `VerticalBarAgent-openai-hosted.zip`
- `VerticalBarAgent-openai-desktop.zip`
- `VerticalBarAgent-anthropic-hosted.zip`
- `VerticalBarAgent-anthropic-desktop.zip`

Use the Hosted archive for cloud/web submission or upload and the Desktop archive only where a
local host can run the signed companion launcher. Every ZIP opens directly at its vendor manifest;
there is no extra wrapping folder. Verify its SHA-256 against `PACKAGE-SHA256SUMS` from the same
release before extracting or uploading it.

Claude web's private upload surface accepts the Anthropic Hosted ZIP. OpenAI's public directory
submission instead receives the production MCP and final skill bundle in the portal; the OpenAI ZIP
is the exact auditable package source and local-test payload, not a bypass around review. Routine
Codex/Claude CLI installs should continue to use the repository marketplace commands above so host
updates track the promoted stable branch.

For a one-session Claude Code smoke test without installing a marketplace entry, Claude Code 2.1.128
or later can load the stable Desktop archive directly:

```sh
claude --plugin-url https://github.com/verticalbarHQ/verticalbar-agent/releases/latest/download/VerticalBarAgent-anthropic-desktop.zip
```

[latest]: https://github.com/verticalbarHQ/verticalbar-agent/releases/latest
