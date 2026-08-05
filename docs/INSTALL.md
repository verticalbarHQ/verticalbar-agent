# VerticalBar Agent plugin — Install

> **Are you trying to install this to use it?** Read the [README](../README.md) instead — it is two
> steps and it is the supported path. This document is for **maintainers and contributors working in
> the monorepo**: dev-loop paths, build commands, and how a release is cut.
>
> It is mirrored to the public repo alongside the README, so it names monorepo paths that only exist
> there — `mcp/`, `mcpb/`, `install.mjs`, `test/` are deliberately **not** mirrored (see
> [SECURITY.md](./SECURITY.md) § Distribution). If you are reading this on the public repo and a path
> is missing, that is why, and it is not a path you need.

A **standalone, self-contained** Claude Code plugin. Unlike the close adapter, this plugin
keeps its MCP server and its `lib/` **inside the plugin directory** and ships them as a single
committed esbuild bundle (`mcp/server.bundle.mjs`) that inlines its three runtime deps —
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
- A reachable CrossCheck API (`CC_API_URL`, default `https://crosscheck-api.vertical.bar` —
  production). `http://localhost:14001` is a **dev-only** override.
- **Auth**, one of:
  - a **workspace API key** (`CC_API_KEY`) — the headless path. Scope it for the tools you use:
    `analysis:read` + `canvas:write` cover the core read/publish surface; **`briefing_live_read`
    additionally requires a `live:read` scope** (the governed live-NetSuite proxy is env-scoped).
  - **Cognito** operator credentials (`CC_EMAIL` / `CC_PASSWORD`, or the in-session `login`
    tool) — the same account as the CrossCheck / Vertical Bar web apps. Vertical Bar tools
    (`vb_*`) require Cognito; the API key covers CrossCheck only.
- **Deployment tool-pack auth:** auth is server-side. A Cognito user (the demo owner/admin) has all
  needed scopes. An API key must carry the scope per tool: `deploy:read` for workflow/package reads
  and closure, `sync:read` for Git source, `environments:read` for the workflow env-name join, and
  `deploy:write` for create/add. The mutation scope is limited to create/add. Start-run
  additionally requires an identified Cognito user (OAuth or SRP), so every API key receives
  `IDENTITY_REQUIRED`.
- The plugin does **not** require a separate Anthropic / LLM API key.

---

## 2. No dependency install — the server ships as a committed bundle

The MCP server runs from `mcp/server.bundle.mjs`, a committed esbuild single-file bundle
that **inlines its runtime deps** (`@modelcontextprotocol/sdk`, `amazon-cognito-identity-js`,
`zod`). A git-source install therefore needs **no `node_modules` and no `npm install`** — the
bundle plus the committed `assets/briefing-viz.min.js` (read at publish time) are everything the
runtime needs.

The one-shot installer wraps marketplace registration, `/plugin install`, and an out-of-band
login:

```bash
node plugins/verticalbar-agent/install.mjs        # add marketplace → install verticalbar-agent → login (browser by default; or CC_API_KEY / CC_EMAIL+CC_PASSWORD)
```

> Maintainers only: after editing `mcp/*.mjs`, rebuild the bundle with
> `npm run build:server` and commit it. CI's `bundle-fresh.test.mjs` fails on a stale bundle.

---

## 3. Configure via environment

The MCP server reads its config from the environment Claude Code inherits (Claude Code does
not touch your shell env beyond its own `${CLAUDE_PLUGIN_*}` substitutions). Export before
launching `claude`:

```bash
# CC_API_URL defaults to production — only set it for a dev override:
# export CC_API_URL="http://localhost:14001"         # DEV-ONLY override of the prod default
export CC_WORKSPACE_ID="<your-workspace-id>"            # resolved workspace for all tools
# --- auth: pick ONE (or none → browser sign-in) ---
# Default (no creds set): the `login` tool / installer opens a browser to sign in (incl. Google).
export CC_API_KEY="<workspace-api-key>"                 # headless path (CrossCheck only)
# or:
export CC_EMAIL="you@example.com"; export CC_PASSWORD="…"   # Cognito SRP (CC + VB)
```

| Var | Default | Purpose |
| --- | --- | --- |
| `CC_API_URL` | `https://crosscheck-api.vertical.bar` | CrossCheck API base (prod). `http://localhost:14001` is a dev-only override |
| `BRIEFING_DASHBOARD_URL` | `https://crosscheck.vertical.bar` | Dashboard base for the user-openable `viewUrl` (override for a local dashboard) |
| `BRIEFING_AUTO_OPEN` | `1` | Auto-open the published `viewUrl` in the browser; set `0` to disable |
| `CC_WORKSPACE_ID` | — | Workspace passed as `?workspaceId` (CC) / `X-Workspace-Id` (VB) |
| `CC_API_KEY` | — | API-key auth: Bearer'd directly for CrossCheck. No Cognito needed |
| `CC_EMAIL` / `CC_PASSWORD` | — | Cognito SRP auth (mints CC + VB tokens) |
| `CC_ENV` | `production` | `production` \| `staging` (Cognito pool / API + dashboard defaults) |

---

## 4. Run the plugin (dev path: `--plugin-dir`)

Load it in place from this directory:

```bash
claude --plugin-dir ./plugins/verticalbar-agent
```

No dependency install needed (the bundle is committed). To avoid the flag each launch, add the
plugin dir to your Claude Code settings (`enabledPlugins`) instead.

When the plugin is enabled, Claude Code starts the MCP server with:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/bin/run.sh ${CLAUDE_PLUGIN_ROOT} mcp/server.bundle.mjs
```

`bin/run.sh` checks Node >= 18, `cd`s into the plugin root, and execs
`node mcp/server.bundle.mjs` (the committed single-file bundle).

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

`node plugins/verticalbar-agent/install.mjs` (step 2) automates both of these plus the login.

---

## 6. Verify (smoke)

A minimal end-to-end check (an API key with `analysis:read` + `canvas:write`, a workspace id,
and a reachable `CC_API_URL`):

1. **tools/list** — boot the server and drive a JSON-RPC `initialize` + `tools/list` over
   stdin; confirm `briefing_publish`, `briefing_data_query`, `briefing_live_read`, `cc_*`, `vb_*` appear.
2. **briefing_data_query** — `{"sql":"SELECT 1 AS n"}` (call `briefing_schema` for real table names) →
   expect `{ rows, rowCount }`.
3. **briefing_publish** — a tiny `{title, account, html}` → expect `{ id, viewUrl, rawUrl }`.
4. **briefing_list** — confirm the published id appears.

See the plugin's smoke script for an automated version of the above.

## Deployment tool pack (RND-2907)

The plugin exposes nine deployment tools. The read tools are
`cc_list_ci_workflows`, `cc_get_ci_workflow`, `cc_get_env_snapshot_git_source`,
`cc_list_release_packages`, `cc_get_release_package`, and `cc_get_ci_workflow_run`. The mutation
tools are `cc_create_release_package`, `cc_add_release_package_items`, and
`cc_start_ci_workflow_run`.

Each mutation is a single direct server call — there is no client-side confirmation gate; the server
enforces its own guards. A Cognito user (the demo owner/admin) has all needed scopes. An API key must
carry `deploy:read` for workflow/package reads and closure, `sync:read` for Git source,
`environments:read` for the workflow env-name join, and `deploy:write` for create/add; mutation scope
does not grant read access. Create/add are not identity-gated. `cc_start_ci_workflow_run` additionally
requires an identified Cognito user (OAuth or SRP), so every API key returns the server's
`IDENTITY_REQUIRED` verbatim (use `login`). There is no approval-capable Briefing tool (approval stays a
web action under server-enforced SoD).

Point VerticalBar Agent at the intended local, staging, or demo API with `CC_API_URL`. If it is
unset, it targets production. The demo
walkthrough is: `login` → get the environment snapshot Git source → create a release package → add
items → get the package and closure → start the workflow run → poll the run projection. Note: the full
start→observe flow (strict all-target Review, staged A→B) needs PR #833 (RND-2885) in the target
deployment; before that lands, `cc_start_ci_workflow_run` returns `RUN_ENGINE_NOT_READY` (503),
surfaced verbatim.

---

## 7. Claude Desktop (`.mcpb` Desktop Extension) — RND-2764

Claude Desktop's in-app plugin **Directory** (Customize → 플러그인/Plugins) is a **curated list** —
it has no "add a custom GitHub marketplace / add from a repository" control, so the Claude Code
marketplace path (sections 4–5) is **not available there**. The supported way to run this local
stdio MCP server in Claude Desktop is a **`.mcpb` Desktop Extension**.

**Build** (maintainers; needs network for `npx @anthropic-ai/mcpb`):

```bash
cd plugins/verticalbar-agent && npm run build:mcpb     # → dist/verticalbar-agent-<version>.mcpb
```

The `.mcpb` wraps the **same committed** `mcp/server.bundle.mjs` + `assets/briefing-viz.min.js`
(3 files, no `node_modules` — our esbuild bundle inlines every dep). The version is stamped from
`plugin.json`. Inputs are committed (`mcpb/manifest.json` + `mcpb/build.mjs`); the packed `.mcpb`
is a build artifact (gitignored), not source.

**Distribution = the release workflow. There is nothing to do by hand.** Pushing a
`verticalbar-agent-v<version>` tag runs `release-verticalbar-agent.yml`, which builds the `.mcpb`,
checks its version against the tag, signs it, and attaches it to the **public mirror's** release
(`verticalbarHQ/verticalbar-agent`) next to the desktop artifacts. `npm run build:mcpb` above is for
inspecting a build locally, not for publishing.

> **This used to be a manual step, and it stopped happening at a rename.** RND-2764 ran the
> `gh release create` recipe exactly once — `lens-0.4.0.mcpb`, tag `lens-v0.4.0`, 2026-06-25, in this
> monorepo. Then Lens became VerticalBar Agent, releases moved to the public mirror, and the hand step
> did not move with them: no `verticalbar-agent-v*` release existed here at all, and v0.9.4–v0.9.8 on
> the mirror all shipped without a `.mcpb`, while three documents described it in the present tense.
>
> It got worse than "missing". Because every product release is a `v*-rc.N` **pre-release**, that lone
> `lens-v0.4.0` was the newest non-prerelease and therefore wore the **Latest** badge on this repo's
> releases page for nine weeks. The first thing anyone browsing found was a superseded artifact under
> the retired name — which is exactly how the first person to try installing found it (2026-08-05).
> The release was deleted that day.
>
> Two lessons, both cheap to forget: a release step that is not in the workflow will not run, and a
> stale release does not sit quietly — GitHub promotes it.

> **The version gate.** The workflow fails the release if `plugin.json` disagrees with the tag. The
> `.mcpb` stamps its version from `plugin.json`, so a partial six-file bump would otherwise ship a
> bundle labelled with a release it is not — the same class of drift that left `tauri.conf.json` at
> 0.3.1 for a whole release.

> **Why this tag is safe.** `deploy-production.yml` fires on `release: published`. It used to gate on
> `startsWith(release.tag_name, 'v')` — satisfied by any tag starting with the letter `v`, so
> `verticalbar-agent-v0.9.6` would have rolled production, and component tags were safe only by
> starting with some other letter. RND-3297 changed that gate to require a **digit** after the `v`
> (a real semver app tag), so component tags are safe by rule rather than by luck. Product releases
> stay `vX.Y.Z` / `vX.Y.Z-rc.N`.

> **No auto-update.** A `.mcpb` installed via "Install Extension" has no update channel — each
> plugin release ships a new `.mcpb` to re-install. (The Claude Code marketplace path *does*
> auto-update via `claude plugin update`; Desktop does not.) `whoami` / the version in the
> Extensions list shows what's installed.

**Install** (end user): Claude Desktop → Settings → **데스크톱 앱 / Desktop App → 확장 프로그램 /
Extensions** → **확장 프로그램 설치 / Install Extension** → pick `verticalbar-agent-<version>.mcpb` (or
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
- Cognito tokens, if you use the `login` path, are cached at `~/tmp/verticalbar-agent/cc-mcp-token.json`.

Not changed: any `CLAUDE.md`, the Claude Code main agent, model selection, or permission model.

## Secrets that must never be printed

- The workspace API key (`CC_API_KEY`), Cognito password (`CC_PASSWORD`), and any minted token.
- Never echo these to stdout/stderr, never paste them into the conversation, and never write
  them into `.mcp.json`, `.claude/settings*.json`, or a repository `.env`. This plugin's
  `.mcp.json` contains no secrets. See [SECURITY.md](./SECURITY.md).
