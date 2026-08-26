# VerticalBar Agent installation

VerticalBar Agent currently supports installed clients through a local stdio MCP server. Hosted web
clients do not start local processes; they will use the separately deployed remote MCP endpoint.

## Claude Code

```sh
claude plugin marketplace add verticalbarHQ/verticalbar-agent
claude plugin install verticalbar-agent@verticalbar-agent
```

Start a new Claude Code session after installation. Existing Claude behavior is preserved: the
plugin launcher downloads and verifies the signed native runtime, then runs it over stdio.

## ChatGPT desktop, Codex CLI, and Codex IDE

```sh
codex plugin marketplace add verticalbarHQ/verticalbar-agent
codex plugin add verticalbar-agent@verticalbar-agent
```

For ChatGPT desktop, install the same marketplace entry from Plugins Directory. Restart the desktop
app, CLI session, or IDE extension after installation so the MCP catalog and skills load together.

## Sign in and choose scope

1. Call `runtime_info`.
2. On a desktop compiled runtime, call `login` with no arguments and finish sign-in in the
   VerticalBar Agent window.
3. On the Node compatibility runtime, call `login` with no arguments and finish browser OAuth.
4. Call `cc_workspaces`. Use the only returned workspace automatically; if more than one is
   available, choose by the safe display name. Pass the returned `workspaceId` to CrossCheck tools.
5. Call `vb_workspaces` independently before using Vertical Bar tools and pass its returned UUID.

Identity, workspace, deployment, endpoint, and token-cache paths are not read from host environment
configuration. The installed runtime targets production. The shared Cognito token cache lives at
`~/tmp/verticalbar-agent/cc-mcp-token.json` and is written outside repositories with restricted
permissions.

The compiled Linux payload is intentionally non-interactive: local `login` fails immediately. Use
the hosted MCP endpoint for remote/headless sessions once that service is available.

## Verify setup

Ask the host to run these read-only steps:

1. `runtime_info`
2. `whoami`
3. `cc_workspaces`

The successful terminal state is Cognito authentication plus `workspaceRouting.mode = "discover"`;
the agent then uses the workspace returned by `cc_workspaces`. Never invent or hardcode a workspace
ID.

## Update or remove

Claude Code updates with:

```sh
claude plugin update verticalbar-agent@verticalbar-agent
```

Codex surfaces refresh and reinstall with:

```sh
codex plugin marketplace upgrade verticalbar-agent
codex plugin add verticalbar-agent@verticalbar-agent
```

The signed launcher updates the native runtime independently. Remove the plugin from the host's
Plugins Directory or plugin CLI, then restart the host.

## Security notes

- The plugin has no database or NetSuite credentials. Data access is through authenticated,
  server-authorized CrossCheck and Vertical Bar HTTP APIs.
- Workspace authorization is enforced server-side. Discovery output is a routing input, not an
  authorization bypass.
- Deployment mutations remain behind CrossCheck's server-side scopes and Pipeline approval.
- Do not paste passwords, tokens, workspace IDs, or endpoint overrides into chat or repository
  configuration.
