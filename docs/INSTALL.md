# Lens plugin — Install

A **standalone, self-contained** Claude Code plugin. Unlike the close adapter, this plugin
keeps its MCP server and its `lib/` **inside the plugin directory** and ships them as a single
committed esbuild bundle (`mcp/lens-server.bundle.mjs`) that inlines its three runtime deps —
so a git-source install **boots with no `node_modules` and no `npm install` step**. There is no
out-of-tree runtime, no monorepo `pnpm install`, and no `VBAR_*` env var. It talks to CrossCheck
**only over HTTP** and imports no `@vb-crosscheck/*` package.

This document is written so Claude Code can read it and act on it safely. The model decides
*whether* to proceed; it must not hand-edit config or print secrets. For credential rules,
see [SECURITY.md](./SECURITY.md).

---

## 1. Prerequisites

- **Claude Code** installed and authenticated (`claude --version`). The local marketplace
  flow needs a recent build (`/plugin marketplace` + `/plugin install`).
- **Node.js >= 18** (the MCP server uses global `fetch`; `amazon-cognito-identity-js` and
  `@modelcontextprotocol/sdk` run on Node 18+). `bin/run.sh` fails loudly if Node is older.
- A reachable CrossCheck API (`LENS_API_URL`, default `https://crosscheck-api.vertical.bar` —
  production). `http://localhost:14001` is a **dev-only** override.
- **Auth**, one of:
  - a **workspace API key** (`CC_API_KEY`) — the headless path. Scope it for the tools you use:
    `analysis:read` + `canvas:write` cover the core read/publish surface; **`lens_live_read`
    additionally requires a `live:read` scope** (the governed live-NetSuite proxy is env-scoped).
  - **Cognito** operator credentials (`CC_EMAIL` / `CC_PASSWORD`, or the in-session `login`
    tool) — the same account as the CrossCheck / Vertical Bar web apps. Vertical Bar tools
    (`vb_*`) require Cognito; the API key covers CrossCheck only.
- The plugin does **not** require a separate Anthropic / LLM API key.

---

## 2. No dependency install — the server ships as a committed bundle

The MCP server runs from `mcp/lens-server.bundle.mjs`, a committed esbuild single-file bundle
that **inlines its runtime deps** (`@modelcontextprotocol/sdk`, `amazon-cognito-identity-js`,
`zod`). A git-source install therefore needs **no `node_modules` and no `npm install`** — the
bundle plus the committed `assets/lens-viz.min.js` (read at publish time) are everything the
runtime needs.

The one-shot installer wraps marketplace registration, `/plugin install`, and an out-of-band
login:

```bash
node plugins/lens/install.mjs        # add marketplace → install lens → login (browser by default; or CC_API_KEY / CC_EMAIL+CC_PASSWORD)
```

> Maintainers only: after editing `mcp/*.mjs`, rebuild the bundle with
> `npm run build:server` and commit it. CI's `bundle-fresh.test.mjs` fails on a stale bundle.

---

## 3. Configure via environment

The MCP server reads its config from the environment Claude Code inherits (Claude Code does
not touch your shell env beyond its own `${CLAUDE_PLUGIN_*}` substitutions). Export before
launching `claude`:

```bash
# LENS_API_URL defaults to production — only set it for a dev override:
# export LENS_API_URL="http://localhost:14001"         # DEV-ONLY override of the prod default
export CC_WORKSPACE_ID="<your-workspace-id>"            # resolved workspace for all tools
# --- auth: pick ONE (or none → browser sign-in) ---
# Default (no creds set): the `login` tool / installer opens a browser to sign in (incl. Google).
export CC_API_KEY="<workspace-api-key>"                 # headless path (CrossCheck only)
# or:
export CC_EMAIL="you@example.com"; export CC_PASSWORD="…"   # Cognito SRP (CC + VB)
```

| Var | Default | Purpose |
| --- | --- | --- |
| `LENS_API_URL` | `https://crosscheck-api.vertical.bar` | CrossCheck API base (prod). `http://localhost:14001` is a dev-only override |
| `LENS_DASHBOARD_URL` | `https://crosscheck.vertical.bar` | Dashboard base for the user-openable `viewUrl` (override for a local dashboard) |
| `LENS_AUTO_OPEN` | `1` | Auto-open the published `viewUrl` in the browser; set `0` to disable |
| `CC_WORKSPACE_ID` | — | Workspace passed as `?workspaceId` (CC) / `X-Workspace-Id` (VB) |
| `CC_API_KEY` | — | API-key auth: Bearer'd directly for CrossCheck. No Cognito needed |
| `CC_EMAIL` / `CC_PASSWORD` | — | Cognito SRP auth (mints CC + VB tokens) |
| `CC_ENV` | `production` | `production` \| `staging` (Cognito pool / API + dashboard defaults) |

---

## 4. Run the plugin (dev path: `--plugin-dir`)

Load it in place from this directory:

```bash
claude --plugin-dir ./plugins/lens
```

No dependency install needed (the bundle is committed). To avoid the flag each launch, add the
plugin dir to your Claude Code settings (`enabledPlugins`) instead.

When the plugin is enabled, Claude Code starts the MCP server with:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/bin/run.sh ${CLAUDE_PLUGIN_ROOT} mcp/lens-server.bundle.mjs
```

`bin/run.sh` checks Node >= 18, `cd`s into the plugin root, and execs
`node mcp/lens-server.bundle.mjs` (the committed single-file bundle).

---

## 5. Register the marketplace (discovery + `/plugin install`)

The repo-root marketplace manifest (`.claude-plugin/marketplace.json`) points at this plugin.
`/plugin install` copies the **whole** plugin dir into `~/.claude/plugins/cache/...` and
launches the server from the cache copy with no out-of-tree traversal. Because the runtime is a
committed bundle (no `node_modules` to copy), there is **no `MODULE_NOT_FOUND` cache trap and no
required env-var runtime pointer** — the cache copy boots as-is.

```text
/plugin marketplace add <ABSOLUTE_PATH_TO_REPO_ROOT>
/plugin install verticalbar-agent@verticalbar
```

`node plugins/lens/install.mjs` (step 2) automates both of these plus the login.

---

## 6. Verify (smoke)

A minimal end-to-end check (an API key with `analysis:read` + `canvas:write`, a workspace id,
and a reachable `LENS_API_URL`):

1. **tools/list** — boot the server and drive a JSON-RPC `initialize` + `tools/list` over
   stdin; confirm `lens_publish`, `lens_data_query`, `lens_live_read`, `cc_*`, `vb_*` appear.
2. **lens_data_query** — `{"sql":"SELECT 1 AS n"}` (call `lens_schema` for real table names) →
   expect `{ rows, rowCount }`.
3. **lens_publish** — a tiny `{title, account, html}` → expect `{ id, viewUrl, rawUrl }`.
4. **lens_list** — confirm the published id appears.

See the plugin's smoke script for an automated version of the above.

---

## 7. Claude Desktop (`.mcpb` Desktop Extension) — RND-2764

Claude Desktop's in-app plugin **Directory** (Customize → 플러그인/Plugins) is a **curated list** —
it has no "add a custom GitHub marketplace / add from a repository" control, so the Claude Code
marketplace path (sections 4–5) is **not available there**. The supported way to run this local
stdio MCP server in Claude Desktop is a **`.mcpb` Desktop Extension**.

**Build** (maintainers; needs network for `npx @anthropic-ai/mcpb`):

```bash
cd plugins/lens && npm run build:mcpb     # → dist/lens-<version>.mcpb
```

The `.mcpb` wraps the **same committed** `mcp/lens-server.bundle.mjs` + `assets/lens-viz.min.js`
(3 files, no `node_modules` — our esbuild bundle inlines every dep). The version is stamped from
`plugin.json`. Inputs are committed (`mcpb/manifest.json` + `mcpb/build.mjs`); the packed `.mcpb`
is a build artifact (gitignored), not source.

**Distribution = GitHub Release.** On each plugin release, attach the packed `lens-<version>.mcpb`
to a GitHub release tagged `lens-v<version>`:

```bash
cd plugins/lens && npm run build:mcpb
VER=$(node -p "require('./.claude-plugin/plugin.json').version")
gh release create "lens-v$VER" "dist/lens-$VER.mcpb" --notes "Lens Desktop Extension (.mcpb)"
# upload the EXACT versioned file, not dist/lens-*.mcpb — a glob would also attach stale .mcpb
# builds left in dist/ from a previous version.
```

Teammates (repo access) download the `.mcpb` from that release and install it (below). The version
is baked into the filename, so it's always clear which build is installed. (`lens-v*` tags are
**plugin-only** — distinct from the product `vX.Y.Z` / `-rc.N` release tags; don't glob `v*` in a
deploy workflow.)

> **No auto-update.** A `.mcpb` installed via "Install Extension" has no update channel — each
> plugin release ships a new `.mcpb` to re-install. (The Claude Code marketplace path *does*
> auto-update via `claude plugin update`; Desktop does not.) `whoami` / the version in the
> Extensions list shows what's installed.

**Install** (end user): Claude Desktop → Settings → **데스크톱 앱 / Desktop App → 확장 프로그램 /
Extensions** → **확장 프로그램 설치 / Install Extension** → pick `lens-<version>.mcpb` (or
double-click the file). Claude Desktop ships its own Node runtime (≥18), so no system Node is
needed.

**Auth in Desktop**: the extension exposes optional config fields (`CC_API_KEY`,
`CC_WORKSPACE_ID`, `CC_ENV`) for the headless/API-key path; or just call the `login` tool after
install for interactive Cognito browser-OAuth (loopback `:9876`). `whoami` shows the resolved auth.

> Path note: if a future Claude Desktop build DOES expose "add a marketplace from a repository"
> in the Plugins Directory, the existing Claude Code packaging would install directly there with
> no `.mcpb` — at which point this section becomes the fallback rather than the primary path.

## Diagnostics & support (evergreen self-bootstrap) — RND-2786

The compiled-client launcher (Claude Code) and the Desktop self-update write **structured,
single-line diagnostics to stderr** (never stdout — the MCP JSON-RPC stream stays clean). Each
fail-closed event is one greppable line:

```
verticalbar-agent launcher    event=<class> outcome=<result> detail=<message>
verticalbar-agent selfupdate   event=<class> outcome=<result> detail=<message>
```

Failure **classes** to look for:

| `event`   | Meaning | Action |
| --------- | ------- | ------ |
| `plan`    | Couldn't decide an update — bad `latest.json` signature, offline with no usable cached binary, a replayed (regressed-counter) manifest, or a below-floor version. | Fail-closed; nothing is executed. Check network + that the release channel is reachable. |
| `verify`  | A downloaded or cached artifact failed **minisign** verification (tamper / wrong key). | Fail-closed; the binary is NOT run. Re-install; if it persists, the release may be mis-signed — report it. |
| `download`| The artifact or `latest.json` could not be fetched. | Transient/offline; retry. A usable verified cached binary is still used (best-effort). |

**Capture it**: run Claude Code / Claude Desktop from a terminal and copy the `verticalbar-agent …`
stderr lines into your report. Nothing sensitive is logged (no keys/tokens).

**Rollback is a blind lever (known limitation, R12)**: there is **no fleet telemetry** on this
auth-free channel — ops cannot see which clients adopted a version. The only rollback control is
publishing a corrected `latest.json` with a raised `min-good-version`; clients pick it up on their
next restart/reconnect (an always-on `--mcp` server or an offline client won't see it until then).
Report install/verify issues with the captured stderr so a corrected manifest can be cut.

## Files / state that change

- Claude Code's plugin/marketplace registration (`~/.claude/plugins/...`).
- The launcher-managed binary cache + `state.json` (anti-replay counter) under the OS app-support dir.
- Cognito tokens, if you use the `login` path, are cached at `~/tmp/lens-plugin/cc-mcp-token.json`.

Not changed: any `CLAUDE.md`, the Claude Code main agent, model selection, or permission model.

## Secrets that must never be printed

- The workspace API key (`CC_API_KEY`), Cognito password (`CC_PASSWORD`), and any minted token.
- Never echo these to stdout/stderr, never paste them into the conversation, and never write
  them into `.mcp.json`, `.claude/settings*.json`, or a repository `.env`. This plugin's
  `.mcp.json` contains no secrets. See [SECURITY.md](./SECURITY.md).
