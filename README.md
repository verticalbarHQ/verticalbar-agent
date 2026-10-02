# Vertical Bar Agent

Use CrossCheck and Vertical Bar from ChatGPT, Codex, and Claude with grounded skills and governed
MCP tools, served by the production remote MCP service.

> **Vertical Bar Agent Desktop is retired.** The local plugin (`verticalbar-agent`), its desktop
> companion and its native downloads are no longer published. Install the Hosted plugin below for the
> MCP tools and skills. To connect a NetSuite account to CrossCheck, use
> [Vertical Bar Companion](https://github.com/verticalbarHQ/verticalbar-companion/releases/latest).
> Copies of Agent Desktop that are already installed are not updated any more and can no longer
> connect NetSuite.

## Install

### Claude Code

```text
/plugin marketplace add verticalbarHQ/verticalbar-agent
/plugin install verticalbar-agent-hosted@verticalbar-agent
```

Restart Claude Code after installation. If `verticalbar-agent` (Agent Desktop) is still installed,
remove it so the two do not register the same tools twice:
`/plugin uninstall verticalbar-agent@verticalbar-agent`.

### Claude app

Settings → Customize → Plugins → Add plugin → Add marketplace → Add from repository →
`verticalbarHQ/verticalbar-agent` → **Vertical Bar Agent** → Install.

### ChatGPT and Codex

Install **Vertical Bar Agent** from the platform's plugin directory when it is publicly listed. During
next/private validation, use the package or workspace draft supplied by your Vertical Bar operator.
For a repository install:

```sh
codex plugin marketplace add verticalbarHQ/verticalbar-agent
codex plugin add verticalbar-agent-hosted@verticalbar-agent
```

### First use

1. Start a new chat.
2. Ask: *“List the CrossCheck workspaces I can access.”*
3. Complete the host's OAuth flow when the first protected tool is used.

Tool names and descriptions may be discovered before authentication. Tool execution, skill content,
downstream token exchange, and workspace data remain authenticated and server-authorized.

## Authentication and workspace routing

- The MCP request carries the host OAuth token. Reconnect the plugin if the host reports an expired
  or invalid session; do not paste credentials into the conversation.
- Always discover authorization with `cc_workspaces`, then use `cc_environments` for an
  environment-scoped operation. There is no ambient workspace or environment fallback.
- No plugin package requires or accepts a distributed API-key environment variable.

The CrossCheck server remains authoritative for organization, workspace, environment, and mutation
authorization. Client prompts are usability aids, not approval authority.

## Verify the installation

In a new chat:

1. Confirm the `briefing`, `deployment`, `test-suite`, and `stress-test` skills are visible or naturally selected.
2. Ask for `runtime_info`.
3. Ask for the CrossCheck workspaces you can access.
4. Select only a workspace returned by discovery.

The `stress-test` skill covers contract authoring, preview, publish, asynchronous execution, progress,
reports, and graceful stop. It reuses published canonical Test Suite mutation cases. Execution
returns an actual CrossCheck Run link immediately so you can follow live results in CrossCheck.
Smoke runs also create real NetSuite records; neither smoke nor full runs clean them up automatically.
Authoring a contract does not start a run. A remote MCP connector exposes the tools; install the
plugin as well to receive its skills.

If skills are missing, refresh the plugin information and start a new chat. If skills are present
but a tool returns `401`, reconnect OAuth.

## Updating and removing

- Directory installs update through the OpenAI or Anthropic directory/workspace release.
- Claude Code repository installs update with
  `/plugin marketplace update verticalbar-agent` followed by
  `/plugin update verticalbar-agent-hosted@verticalbar-agent`.
- Codex repository installs update with `codex plugin marketplace upgrade verticalbar-agent`, then
  reinstall the listed plugin and start a new session.

Remove the plugin from the host's plugin directory or CLI. Removing a plugin does not delete the
CrossCheck account or server-side data.

## Channels and provenance

- **stable** is the public, promoted package.
- **next** is the prerelease candidate used for validation.
- Promotion moves the exact candidate already tested; it does not rebuild it.

| Product | stable technical ID | next technical ID |
| --- | --- | --- |
| Vertical Bar Agent | `verticalbar-agent-hosted` | `verticalbar-agent-hosted-next` |

Public directories may choose to show only the stable listing. The repository catalog keeps the
next ID explicit so a candidate can be installed and verified without changing an existing stable
installation.

The generated [`releases/`](releases/) surface binds the source commit, plugin version, canonical
skill digest, package digests, compatibility matrix, and file checksums.

## Capabilities

- Read authorized CrossCheck snapshots, customizations, SuiteScript source, dependency graphs, and
  telemetry.
- Discover authorized environments with `cc_environments`, then read their published process
  context, map, variants, and cases through the `cc_process_*` tools.
- Build and publish grounded interactive Briefings.
- Author and run CrossCheck Test Suites and Stress Tests.
- Inspect release packages and CI workflows, with mutations remaining behind server-side scopes and
  Pipeline approval.

See [SECURITY](docs/SECURITY.md) for the public security boundary.
Marketplace reviewers and operators can inspect the public [submission dossier](marketplace/).

## Downloadable package ZIPs

The repository carries the two exact plugin archives and their checksums under `releases/`:

- `releases/VerticalBarAgent-openai-hosted.zip`
- `releases/VerticalBarAgent-anthropic-hosted.zip`
- `releases/PACKAGE-SHA256SUMS`

Every ZIP opens directly at its vendor manifest; there is no extra wrapping folder. Verify its SHA-256
against `PACKAGE-SHA256SUMS` from the same commit before extracting or uploading it.

Claude web's private upload surface accepts the Anthropic Hosted ZIP. OpenAI's public directory
submission instead receives the production MCP and final skill bundle in the portal; the OpenAI ZIP
is the exact auditable package source and local-test payload, not a bypass around review. Routine
Codex/Claude CLI installs should continue to use the repository marketplace commands above so host
updates track the promoted stable branch.
