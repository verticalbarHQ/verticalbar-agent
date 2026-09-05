# Vertical Bar Agent — Security

Vertical Bar Agent's analysis and data paths are **read-only**. One narrow, governed exception exposes
three workspace-scoped deployment mutations — create a Release Package, add package items, and start
a CI workflow run — each a single direct server call (no client-side gate). Create and add-items
require the server-authorized mutation scope; start-run additionally requires an identified
Cognito user. It exposes no approval
capability. Deployment reads require their own per-tool scopes; mutation scope does not grant read
access. It is self-contained and talks to CrossCheck **only over HTTP** (no
`@vb-crosscheck/*` imports, no in-process DB access). See `docs/briefing-boundary.adr.md`.

## The security boundary — honest statement (G3)

The real security boundary is the **network/server, not the client binary.** We do **not** claim
the shipped client is unreversible or that compilation hides anything — anyone running it can
observe its traffic, and that is expected. The proprietary CrossCheck × Vertical Bar schema /
join-key / detector knowledge is protected by two things, **neither of which is obfuscation**:

1. **Server-side, auth-gated reads.** Every data read is an HTTP proxy the CrossCheck platform runs
   server-side behind Cognito auth, read-only, SELECT-only, workspace-fenced
   (the floors below). The client never holds DB / NetSuite credentials.
2. **Runtime schema delivery — never plaintext in the public tree.** The schema / join / detector
   map is served at runtime from an auth-gated endpoint (`briefing_schema`, requires `analysis:read`); it
   is **never** shipped as plaintext in the public safe-surface tree. A CI + local **leak-gate**
   (`leak-denylist.json`) fails any change that would reintroduce that IP — as source or inside a
   compiled bundle. See `docs/briefing-boundary.adr.md`.

## Public safe-surface contract

The public tree carries the **authoring method + a generic tool surface** only: the skill's steps,
the tool names and their shape, the auth/HTTP plumbing, the viz runtime. It carries **no proprietary
schema IP** — no full join graph, no column schemas, no 2nd cross-product bridge key, and no detector
logic or catalog. Those live behind `briefing_schema` and are delivered to an **authenticated** agent at
runtime, so cognition is unchanged (the agent still learns the full map, just not from plaintext
source). A few **generic NetSuite concepts** may appear as authoring orientation (e.g. that the two
products join on the transaction id, that actor identity resolves via systemnote × employees) —
standard NetSuite knowledge, not the proprietary map. The **leak-gate** is the mechanical enforcement
of the proprietary-IP boundary.

## Distribution

Shipped today:

- **Plugin**, ONE published marketplace — the public safe-surface mirror
  (`verticalbarHQ/verticalbar-agent`, RND-2786). It serves **Claude Desktop, Claude Code, the Codex CLI
  and the ChatGPT desktop app**, all from the same repository and the same runtime.
  The mirror is an allowlist copy; `mcp/`, `desktop/`, `mcpb/`, `test/` and the denylist never leave
  the monorepo.
  The repo-root marketplace (`.claude-plugin/marketplace.json`, name `verticalbar`) is **development-only
  and has never been published**: `install.mjs` registers it by absolute path so a monorepo checkout can
  install its own working tree. It is not a teammate-facing route — pointing anyone at
  `verticalbarHQ/crosscheck` would demand SSH access to a private repo AND hand Claude Code a different
  runtime than every other surface. *(Corrected 2026-08-16; this paragraph described it as the
  teammate marketplace.)*
  The repository root is the canonical plugin. Claude takes
  `.claude-plugin/{marketplace,plugin}.json`; stable Codex takes
  `.agents/plugins/marketplace.json` + `.codex-plugin/plugin.json`. The Codex prerelease entry uses a
  generated `codex-next/` declaration adapter in that same public commit so its materialized manifest
  name matches `verticalbar-agent-next`. The adapter copies the canonical launcher and skills byte
  for byte, keeps the same MCP server key, and selects the same signed runtime's next channel. The
  catalogs and manifests are generated from the same source, so name, version, and surface-neutral
  copy cannot drift without failing the mirror tests.
- **Host confirmation is not a security boundary, and it is not uniform.**
  `cc_start_ci_workflow_run` is published with `anthropic/requiresUserInteraction`, which makes
  Claude Code ask a person on every call. Codex does not implement that marker and shows no such
  prompt. The guarantees that hold on every surface are server-side: start-run requires an
  identified Cognito user, and environment writes happen only after
  CrossCheck's Pipeline stage approval.
- **Desktop app** — `.dmg` / `.tar.gz` / `.zip`, minisign-signed, on the public mirror's Releases.

**No `.mcpb` is published.** `release-verticalbar-agent.yml` attaches the desktop archives,
`latest.json` and their signatures, and nothing else. Do not go looking for one.

> This entry claimed a `.mcpb` ships, in three successive and successively wrong forms, from the day
> the builder was written until 2026-08-15. First it said the bundle was attached to releases: true
> once — RND-2764 attached exactly one, BY HAND, as `lens-0.4.0.mcpb` (tag `lens-v0.4.0`,
> 2026-06-25) — and then quietly false, because the Lens→Vertical Bar Agent rename moved releases to
> the public mirror and the hand step did not follow, so v0.9.4–v0.9.8 shipped without one. It was
> then rewritten to say the build had become part of the release workflow. That was false on the day
> it was written: `ceb44db12` (RND-3397, 2026-08-05) had REMOVED the build/sign/attach steps in the
> same change that made the marketplace the Desktop path, because a `.mcpb` is a Connector and so
> ships the tools without the skills.
>
> Kept because the failure mode is not the obvious one. Neither revision was careless — each
> described a real artifact or a real intention. What changed was the **release path**, and nothing
> tied the sentence to it. A claim about what ships needs a gate in the thing that ships.

**Not shipped (RND-2794):** OS code-signing — no Apple Developer ID notarization, no Authenticode.
macOS users clear quarantine by hand for the `.dmg`.

## Read-only analysis paths and the governed deployment exception

- The plugin **never holds a database connection or DB credentials**, and **never issues raw
  SQL against a database**. `briefing_data_query` and `cc_live_read` are **HTTP proxies the
  CrossCheck platform runs server-side**; the caller sends a `SELECT`/`WITH` string and gets
  JSON back.
- The landed-data proxy (`/api/v1/briefings-data`) is **SELECT/WITH only**, bound to an allowlist of
  `close_*` tables, and every allowlisted table is **CTE-shadowed with the auth-derived
  `workspace_id`** server-side — an arbitrary SELECT/JOIN can only ever see this workspace's
  rows. Write/DDL keywords are rejected.
- The live read proxy (`/api/v1/live-read`, exposed as `cc_live_read`) is **SELECT-only**,
  enforced server-side and at the NetSuite RESTlet, rate-limited, audited, and row-capped. It is
  the **only** live path — there is no ungoverned, M2M-direct NetSuite access in the plugin.
- The only deployment mutations are create Release Package, add package items, and start CI workflow
  run. Each is a single direct server call (no client-side confirm gate). Auth is server-side. A
  signed-in Cognito user must have the server-authorized scope for each operation. Start-run
  additionally requires an identified Cognito user. Approval is intentionally excluded and remains in
  the web UI under server-enforced separation of duties. See `docs/briefing-boundary.adr.md`.
- It exposes no other source-data or deployment-control write path. Its only other mutation is
  publishing an HTML artifact (`POST /api/v1/briefings`), which writes a workspace-scoped Briefing row —
  never source data. It never holds DB or NetSuite credentials; deployment effects remain behind
  the authenticated CrossCheck server boundary.

## Multi-tenant isolation (the non-negotiable floor)

- Workspace scope never comes from ambient client configuration. The agent calls
  `cc_workspaces`, uses the sole authorized result or asks the user to choose among multiple results,
  and passes that explicit `workspaceId` to CrossCheck calls. The plugin **fails loudly** when scope is missing rather than
  fabricating a default. All `briefing_*` / `cc_*` reads and the publish are workspace-fenced by the API.

## Credentials

- Auth is **Cognito** via **browser OAuth** (the `login` tool with no args, or the installer default: opens the
  Hosted UI, incl. Google, Authorization Code + PKCE, loopback callback on `localhost:9876`,
  backup `localhost:9877` — both registered on the Cognito client), or explicit email/password
  arguments on the Node compatibility surface. The Cognito token is minted on the CrossCheck
  app-client and is accepted by **both** the CrossCheck and Vertical Bar APIs.
- Credentials come only from an explicit login flow. They are **never** written into
  `.mcp.json`, `.claude/settings*.json`, or a repository `.env`, and **never** echoed to
  stdout/stderr or pasted into the conversation. Cognito tokens (if used) are cached at
  `~/tmp/verticalbar-agent/cc-mcp-token.json`, outside any repo.

## Sandboxed render

- A published Briefing is rendered by the dashboard inside a **sandboxed iframe**
  (`sandbox="allow-scripts"`, **no** `allow-same-origin`) and served `X-Content-Type-Options:
  nosniff`, consumed only as a `srcDoc` string (never navigated to). The artifact cannot reach
  the parent session, cookies, or origin. Self-contained HTML only — the sandbox blocks the
  network, so all runtime/assets must be inlined.

## Prompt injection

- NetSuite/CrossCheck text fields (memos, names, descriptions) are **untrusted data, not
  instructions**. ERP text cannot change tool selection or permissions; the skill treats such
  content as data.

## Production data note

- The installed runtime targets **production** CrossCheck/NetSuite data within the
  authenticated/discovered workspace scope. The read-only + workspace-fenced + SELECT-only floors
  above hold regardless, but treat published Briefings as potentially containing real customer
  data and govern access to the Briefing surface accordingly.
