# VerticalBar Agent — Security

VerticalBar Agent's analysis and data paths are **read-only**. One narrow, governed exception exposes
three workspace-scoped deployment mutations — create a Release Package, add package items, and start
a CI workflow run — each a single direct server call (no client-side gate). Create and add-items
require `deploy:write` only and are not identity-gated; start-run additionally requires an identified
Cognito user (OAuth or SRP), so every API key gets `IDENTITY_REQUIRED`. It exposes no approval
capability. Deployment reads require their own per-tool scopes; mutation scope does not grant read
access. It is self-contained and talks to CrossCheck **only over HTTP** (no
`@vb-crosscheck/*` imports, no in-process DB access). See `docs/briefing-boundary.adr.md`.

## The security boundary — honest statement (G3)

The real security boundary is the **network/server, not the client binary.** We do **not** claim
the shipped client is unreversible or that compilation hides anything — anyone running it can
observe its traffic, and that is expected. The proprietary CrossCheck × Vertical Bar schema /
join-key / detector knowledge is protected by two things, **neither of which is obfuscation**:

1. **Server-side, auth-gated reads.** Every data read is an HTTP proxy the CrossCheck platform runs
   server-side behind auth (workspace API key or Cognito), read-only, SELECT-only, workspace-fenced
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

- **Claude Code plugin**, two marketplaces — the repo-root private one (`verticalbarHQ/crosscheck`,
  for teammates) and the public safe-surface mirror (`verticalbarHQ/verticalbar-agent`, RND-2786).
  The mirror is an allowlist copy; `mcp/`, `desktop/`, `mcpb/`, `test/` and the denylist never leave
  the monorepo.
- **Desktop app** — `.dmg` / `.tar.gz` / `.zip`, minisign-signed, on the public mirror's Releases.
- **Claude Desktop `.mcpb`** — attached to the same releases by `release-verticalbar-agent.yml`.

> This entry read "plus a Claude Desktop `.mcpb` bundle attached to GitHub releases" from the day the
> `.mcpb` builder was written until 2026-08-05, while **no release had ever carried one** — RND-2764
> documented attaching it as a manual step and every release skipped it. The build is now part of the
> release workflow, so the sentence describes the pipeline rather than an intention. Kept as a note
> because the failure mode is worth remembering: a manual release step and a doc written in the
> present tense will disagree, and the doc is the one nobody re-checks.

**Not shipped (RND-2794):** OS code-signing — no Apple Developer ID notarization, no Authenticode.
macOS users clear quarantine by hand for the `.dmg`. The `.mcpb` sidesteps this (Claude Desktop runs
it; no app is launched), but that is a consequence of the packaging, not a substitute for signing.

## Read-only analysis paths and the governed deployment exception

- The plugin **never holds a database connection or DB credentials**, and **never issues raw
  SQL against a database**. `briefing_data_query` and `briefing_live_read` are **HTTP proxies the
  CrossCheck platform runs server-side**; the caller sends a `SELECT`/`WITH` string and gets
  JSON back.
- The landed-data proxy (`/api/v1/briefings-data`) is **SELECT/WITH only**, bound to an allowlist of
  `close_*` tables, and every allowlisted table is **CTE-shadowed with the auth-derived
  `workspace_id`** server-side — an arbitrary SELECT/JOIN can only ever see this workspace's
  rows. Write/DDL keywords are rejected.
- The live read proxy (`/api/v1/live-read`, exposed as `briefing_live_read`) is **SELECT-only**,
  enforced server-side and at the NetSuite RESTlet, rate-limited, audited, and row-capped. It is
  the **only** live path — there is no ungoverned, M2M-direct NetSuite access in the plugin.
- The only deployment mutations are create Release Package, add package items, and start CI workflow
  run. Each is a single direct server call (no client-side confirm gate). Auth is server-side. A
  Cognito user (the demo owner/admin) has all needed scopes. API-key reads require `deploy:read` for
  workflow/package reads and closure, `sync:read` for Git source, and `environments:read` for the
  workflow env-name join; create/add require `deploy:write` only and are not identity-gated. Mutation
  scope does not cover reads. Start-run additionally requires an identified Cognito user (OAuth or
  SRP), so every API key gets `IDENTITY_REQUIRED`. Approval is intentionally excluded and remains in
  the web UI under server-enforced separation of duties. See `docs/briefing-boundary.adr.md`.
- It exposes no other source-data or deployment-control write path. Its only other mutation is
  publishing an HTML artifact (`POST /api/v1/briefings`), which writes a workspace-scoped Briefing row —
  never source data. It never holds DB or NetSuite credentials; deployment effects remain behind
  the authenticated CrossCheck server boundary.

## Multi-tenant isolation (the non-negotiable floor)

- `workspaceId` for every legacy read/publish comes from the **auth context server-side** (and is
  sent as `?workspaceId` from the configured `CC_WORKSPACE_ID`). Deployment-pack tools instead take
  an **explicit `workspaceId` argument** on every call (in API-key mode it must match the key's
  workspace; the server validates either way). The plugin **fails loudly** when no
  workspace is resolvable rather than fabricating a default (a wrong default would silently
  cross tenants). All `briefing_*` / `cc_*` reads and the publish are workspace-fenced by the API.

## Credentials

- Auth is either a **workspace API key** (`CC_API_KEY`, Bearer'd to CrossCheck) or **Cognito**
  — via **browser OAuth** (the `login` tool with no args, or the installer default: opens the
  Hosted UI, incl. Google, Authorization Code + PKCE, loopback callback on `localhost:9876`,
  backup `localhost:9877` — both registered on the Cognito client) or
  **SRP** (`CC_EMAIL`/`CC_PASSWORD`). The Cognito token is minted on the CrossCheck app-client and
  is accepted by **both** the CrossCheck and Vertical Bar APIs. The API key covers CrossCheck
  only; Vertical Bar tools require a Cognito login.
- Credentials are read from the environment / the `login` tool. They are **never** written into
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

- Reads may touch **production** CrossCheck/NetSuite data depending on `CC_API_URL` and the
  configured workspace/credentials. The read-only + workspace-fenced + SELECT-only floors
  above hold regardless, but treat published Briefings as potentially containing real customer
  data and govern access to the Briefing surface accordingly.
