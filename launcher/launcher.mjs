#!/usr/bin/env node
// RND-2786 [spec/327-rnd-2786] T3 — Claude Code launcher. Declared as the plugin's MCP `command`
// (`node <this>`), it FIRST ensures the correct compiled verticalbar-agent binary is installed +
// verified, then execs it as `--mcp`. (Claude Desktop does NOT use this — its GUI app self-registers
// the absolute binary; a GUI-spawned config entry lacks the shell PATH, so a bare `node` would ENOENT.)
//
// Invariants:
//  - minisign-verify the downloaded artifact BEFORE writing/executing, and RE-VERIFY the cached
//    artifact before EACH spawn (R3) — fail closed on any verify failure.
//  - single cross-process writer of the cache (lock) (R6/AC9).
//  - NOTHING on stdout — the child owns the JSON-RPC stream; all launcher diagnostics go to stderr (AC11).
//  - inherit the parent env VERBATIM so CC_API_KEY / CC_WORKSPACE_ID / CC_ENV / token-cache survive (R8).
//  - offline taxonomy (AC12): usable cached binary + offline → run it; no usable binary + offline → fail loud.

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, renameSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { verifyMinisign, PINNED_PUBKEY } from './minisign-verify.mjs'
import { planUpdate, CHANNELS, channelBase } from './update-plan.mjs'

/** Where this launcher was installed from. The channel marker ships beside it, so an install knows
 *  which channel it IS without being told at run time. */
const LAUNCHER_DIR = dirname(fileURLToPath(import.meta.url))

/** Which channel this install asks for: `VBA_CHANNEL`, else a `channel` file shipped beside the
 *  launcher, else stable.
 *
 *  This only chooses which manifest to REQUEST. Authority lives in the signed manifest, which names
 *  its own channel and is compared against this — the same minisign key signs both channels, so
 *  nothing outside the signed bytes can establish which channel a file belongs to.
 *
 *  An unrecognised value throws rather than defaulting. Quietly running stable for someone who asked
 *  for a prerelease is the worst outcome available: they would believe they had tested it. */
export function resolveChannel({ env = process.env, dir = LAUNCHER_DIR } = {}) {
  const reject = (value, source) => {
    throw new Error(`unknown release channel '${value}' from ${source} (known: ${CHANNELS.join(', ')})`)
  }
  const fromEnv = String(env.VBA_CHANNEL ?? '').trim()
  if (fromEnv) return CHANNELS.includes(fromEnv) ? fromEnv : reject(fromEnv, 'VBA_CHANNEL')
  let fromFile = ''
  try { fromFile = readFileSync(join(dir, 'channel'), 'utf8').trim() } catch { /* absent → stable */ }
  if (fromFile) return CHANNELS.includes(fromFile) ? fromFile : reject(fromFile, 'the channel file')
  return 'stable'
}

/** Where a channel's cache lives. Stable keeps the historical location so every install that exists
 *  today stays valid — including offline, where a moved cache would read as no cache at all. Next
 *  goes underneath it.
 *
 *  The separation has to be physical. Sharing a directory would make "installed side by side" a lie:
 *  one state file, one lock, one artifact, so alternating launches would overwrite each other and
 *  re-download the whole binary every time. */
export function channelRoot(dir, channel) {
  return channel === 'stable' ? dir : join(dir, 'channels', channel)
}

/** stderr-only logger — a stray stdout byte corrupts the MCP JSON-RPC stream. */
export const logErr = (...a) => process.stderr.write(a.join(' ') + '\n')

/** stderr-only STRUCTURED diagnostic (RND-2786 T12): one greppable line per fail-closed event so an
 *  auth-free-channel install is debuggable from captured stderr. Mirrors the Rust `selfupdate::elog`
 *  format. See docs/INSTALL.md (“Diagnostics & support”). */
export const diag = (event, outcome, detail) =>
  process.stderr.write(`verticalbar-agent launcher event=${event} outcome=${outcome} detail=${detail}\n`)

/** RND-2848: Intel macOS is no longer a supported target. Fail HERE with actionable copy — resolving
 *  it to a target with no artifact surfaces downstream as `no artifact for target macos-x64`, which
 *  reads like a broken release rather than an unsupported machine. Mirrors `selfupdate::resolve_target`.
 *
 *  This copy has been wrong twice, and both times it named a route that could not work.
 *
 *  It first said "run the Claude Code plugin (`/plugin install verticalbar-agent@verticalbar`)",
 *  which is this very launcher — the plugin's MCP command is `node bin/launcher.mjs`, so the advice
 *  pointed at the thing that had just failed. It was then changed to name a Claude Desktop `.mcpb`,
 *  which would genuinely run on Intel (pure-Node `mcp/server.bundle.mjs`, no compiled client) — but
 *  NO `.mcpb` IS PUBLISHED. `ceb44db12` removed the build/sign/attach steps on 2026-08-05, so this
 *  sent the one user who had already hit a wall to hunt for a download that is not on the page.
 *
 *  There is no supported Intel path. Say that, and stop inventing one: an error that names a
 *  nonexistent artifact costs the reader more than an error that admits the gap. */
export const INTEL_MAC_UNSUPPORTED =
  'VerticalBar Agent does not support Intel Macs — the compiled client it runs is Apple Silicon only, and there is currently no Intel build or alternative package. Supported: Apple Silicon macOS and Windows x64. If you need Intel support, please open an issue at https://github.com/verticalbarHQ/verticalbar-agent/issues.'

/** Apple Silicon macOS + Windows only (platform decision); everything else fails loud (covers WSL, R13). */
export function resolveTarget(platform = process.platform, arch = process.arch) {
  if (platform === 'darwin') {
    if (arch === 'arm64') return 'macos-arm64'
    throw new Error(INTEL_MAC_UNSUPPORTED)
  }
  if (platform === 'win32') return 'win-x64'
  throw new Error(`verticalbar-agent supports macOS and Windows only (got ${platform}/${arch}; note: Claude Code inside WSL resolves as linux)`)
}

export function installDir() {
  const base = process.platform === 'win32'
    ? (process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'))
    : join(homedir(), 'Library', 'Application Support')
  return join(base, 'verticalbar-agent')
}

/** RND-2848: the macOS `.app` bundle root, which is the ROOT of the published tarball and therefore
 *  must equal `productName` in `src-tauri/tauri.conf.json`. Exported as the SINGLE literal (the on-disk
 *  path and the in-archive path both derive from it) so the two can never drift from each other, and so
 *  `desktop/scripts/check-artifact-names.mjs` can assert its VALUE rather than grep for its text. */
export const MAC_APP_BUNDLE = 'VerticalBar Agent.app'

const targetDir = (dir, target) => join(dir, target)
const artifactPath = (dir, target) => join(targetDir(dir, target), process.platform === 'win32' ? 'artifact.zip' : 'artifact.tar.gz')
const exePath = (dir, target) => process.platform === 'win32'
  ? join(targetDir(dir, target), 'app', 'verticalbar-agent.exe')
  : join(targetDir(dir, target), 'app', MAC_APP_BUNDLE, 'Contents', 'MacOS', 'verticalbar-agent')

export function readState(dir) {
  try { return JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) } catch { return {} }
}
function writeState(dir, state) { writeFileSync(join(dir, 'state.json'), JSON.stringify(state)) }

/** The anti-replay floor for ONE channel. The channels advance their counters independently, so a
 *  stable counter checked against a next manifest reads as a replay and would fail the install. */
export function channelCounter(state, channel) {
  const c = state?.counters?.[channel]
  if (typeof c === 'number') return c
  // State written before channels existed carries one flat counter, and it can only be stable's.
  if (channel === 'stable' && typeof state?.counter === 'number') return state.counter
  return undefined
}

/** Merge one channel's counter into the per-channel map, migrating a pre-channel flat counter. */
export function mergeCounters(state, channel, counter) {
  const counters = { ...(state?.counters ?? {}) }
  if (counters.stable == null && typeof state?.counter === 'number') counters.stable = state.counter
  if (typeof counter === 'number') counters[channel] = counter
  return counters
}

/** R3: re-verify the cached artifact against the pinned key before trusting/executing it. */
export function verifyCachedBinary(dir, target, pubkey = PINNED_PUBKEY) {
  const art = artifactPath(dir, target)
  const sig = art + '.minisig'
  if (!existsSync(art) || !existsSync(sig) || !existsSync(exePath(dir, target))) return false
  try { return verifyMinisign(readFileSync(art), readFileSync(sig, 'utf8'), pubkey) } catch { return false }
}

/** The executable's path WITHIN the artifact archive (the launcher extracts to `app/…`). */
const exeArchivePath = () => process.platform === 'win32'
  ? 'verticalbar-agent.exe'
  : `${MAC_APP_BUNDLE}/Contents/MacOS/verticalbar-agent`

/** R3/AC5 (codex): confirm the ON-DISK exe matches the exe inside the (separately signature-verified)
 *  artifact, by extracting THAT ONE file to memory and comparing sha256 — a post-install overwrite of
 *  the exe would otherwise be spawned unverified. This is READ-ONLY (never rewrites the exe), so it is
 *  safe on Windows where a concurrently-running exe is locked and cannot be re-extracted over. Returns
 *  false (→ caller fails closed) on any mismatch or error. */
export function verifyExtractedExe(dir, target) {
  try {
    const art = artifactPath(dir, target)
    const exe = exePath(dir, target)
    if (!existsSync(art) || !existsSync(exe)) return false
    const flag = process.platform === 'win32' ? '-xOf' : '-xzOf'
    const r = spawnSync('tar', [flag, art, exeArchivePath()], { maxBuffer: 512 * 1024 * 1024 })
    if (r.error || r.status !== 0 || !r.stdout || r.stdout.length === 0) return false
    const fromArchive = createHash('sha256').update(r.stdout).digest('hex')
    const onDisk = createHash('sha256').update(readFileSync(exe)).digest('hex')
    return fromArchive === onDisk
  } catch { return false }
}

/** Single cross-process writer via an atomic mkdir lock with stale reclamation. Awaits async `fn`
 *  (so the lock is held for the whole async body, not released before it resolves). */
export async function withLock(dir, fn, { staleMs = 120_000, now = Date.now } = {}) {
  mkdirSync(dir, { recursive: true })
  const lock = join(dir, '.lock')
  for (;;) {
    try { mkdirSync(lock); break } catch {
      try {
        // Fall back to the lock dir's mtime if `ts` is missing — a launcher that crashed after
        // mkdir(lock) but before writing `ts` would otherwise wedge EVERY future launcher permanently
        // (gemini HIGH: ENOENT on `ts` → catch → lockout that never self-heals).
        const tsPath = join(lock, 'ts')
        const started = existsSync(tsPath) ? Number(readFileSync(tsPath, 'utf8')) : statSync(lock).mtimeMs
        if (now() - started > staleMs) { rmSync(lock, { recursive: true, force: true }); continue }
      } catch { /* fallthrough */ }
      throw new Error('another verticalbar-agent launcher holds the install lock; retry shortly')
    }
  }
  try { writeFileSync(join(lock, 'ts'), String(now())); return await fn() }
  finally { rmSync(lock, { recursive: true, force: true }) }
}

function extract(artifact, destAppDir) {
  rmSync(destAppDir, { recursive: true, force: true })
  mkdirSync(destAppDir, { recursive: true })
  // bsdtar (win10+) handles .zip; GNU/bsd tar handles .tar.gz on mac.
  const args = process.platform === 'win32' ? ['-xf', artifact, '-C', destAppDir] : ['-xzf', artifact, '-C', destAppDir]
  const r = spawnSync('tar', args, { stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.error) throw new Error(`extract failed: could not run tar (${r.error.message})`)
  if (r.status !== 0) throw new Error(`extract failed (status ${r.status})`)
}

const fetchBuf = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Ensure a verified binary exists at/above the floor; download+verify+install if needed. Returns exe path.
 *  Holds the install lock for the whole plan→download→install so two launchers can't race the cache. */
export async function ensureBinary(dir, target, { channel = resolveChannel(), downloadBaseUrl = channelBase(channel), fetch_ = fetchBuf, pubkey = PINNED_PUBKEY } = {}) {
  mkdirSync(targetDir(dir, target), { recursive: true })
  return withLock(dir, async () => {
    const st = readState(dir)
    // `dir` is this channel's root, so a cache found here is this channel's by construction. The
    // recorded channel is still checked: a mismatch means the directory was moved or hand-edited,
    // and handing a stable build to a `next` request would report success for a build that never ran.
    const verified = verifyCachedBinary(dir, target, pubkey)
    const usable = verified && (st.channel ?? 'stable') === channel
    if (verified && !usable) logErr(`verticalbar-agent: cache at ${dir} records channel ${st.channel ?? 'stable'}, not ${channel}; reinstalling`)
    const plan = await planUpdate({
      target,
      state: { version: st.version, counter: channelCounter(st, channel), usable },
      downloadBase: downloadBaseUrl,
      fetchBuf: fetch_,
      channel,
      pubkey,
    })
    if (plan.decision === 'fail') { diag('plan', 'fail', plan.reason); throw new Error(`update plan failed (fail closed): ${plan.reason}`) }
    if (plan.decision === 'use-cached') {
      if (!usable) throw new Error('plan said use-cached but the cached binary does not verify') // defensive
      // R3/AC5 (codex): the ARTIFACT signature is re-verified, but the extracted exe is not itself
      // signed — a post-install overwrite of the on-disk exe would otherwise be spawned unverified.
      // VERIFY (read-only) that the exe still matches the just-verified archive; fail closed on a
      // mismatch. Read-only so a concurrently-running exe on Windows is never re-extracted over.
      if (!verifyExtractedExe(dir, target)) { diag('verify', 'fail', 'cached exe does not match the verified archive'); throw new Error('cached executable does not match the verified archive (fail closed)') }
      // Advance the anti-replay floor even without installing: a newer signed manifest we've observed
      // must raise the stored counter, else a later replay of an older manifest is accepted (codex P2, R10).
      const seen = channelCounter(st, channel)
      if (typeof plan.counter === 'number' && (seen == null || plan.counter > seen)) {
        writeState(dir, { ...st, version: st.version, counter: plan.counter, target, channel, counters: mergeCounters(st, channel, plan.counter) })
      }
      if (plan.reason) logErr('verticalbar-agent:', plan.reason)
      return exePath(dir, target)
    }
    // install: fetch artifact + sig ONCE, verify BEFORE writing, then atomic-place + extract
    logErr(`verticalbar-agent: installing ${plan.version} (${target})…`)
    const buf = await fetch_(plan.artifactUrl)
    // Bind the download to the SIGNED manifest's sha256 — the minisig proves the bytes are authentic,
    // but not that they are THIS version's artifact. Without this, a stale-but-validly-signed older
    // asset served under the current filename would install + record the new version, bypassing the
    // floor/no-downgrade guarantee (codex). Fail closed on mismatch.
    if (plan.sha256 && createHash('sha256').update(buf).digest('hex') !== plan.sha256) {
      diag('verify', 'fail', `artifact sha256 != signed manifest: ${plan.artifactUrl}`)
      throw new Error(`artifact does not match the signed manifest sha256 (fail closed): ${plan.artifactUrl}`)
    }
    const sig = (await fetch_(plan.sigUrl)).toString('utf8')
    if (!verifyMinisign(buf, sig, pubkey)) { diag('verify', 'fail', `artifact signature invalid: ${plan.artifactUrl}`); throw new Error(`artifact signature verification failed (fail closed): ${plan.artifactUrl}`) }
    const art = artifactPath(dir, target)
    const tmp = art + '.tmp'
    writeFileSync(tmp, buf)
    renameSync(tmp, art) // atomic replace of the artifact
    writeFileSync(art + '.minisig', sig)
    extract(art, join(targetDir(dir, target), 'app'))
    if (!verifyCachedBinary(dir, target, pubkey) || !existsSync(exePath(dir, target))) {
      throw new Error('post-install verification failed (fail closed)')
    }
    writeState(dir, { ...st, version: plan.version, counter: plan.counter, target, channel, counters: mergeCounters(st, channel, plan.counter) })
    return exePath(dir, target)
  })
}

/** Exec the binary as `--mcp`: child owns stdio, env inherited verbatim, launcher exits with child code. */
export function spawnBinary(exe, argv = ['--mcp'], env = process.env) {
  const child = spawn(exe, argv, { stdio: 'inherit', env })
  child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
  child.on('error', (e) => { logErr('verticalbar-agent: failed to spawn binary:', e.message); process.exit(1) })
  return child
}

export function uninstall(dir = installDir()) {
  rmSync(dir, { recursive: true, force: true })
  logErr('verticalbar-agent: removed', dir)
}

export async function main(argv = process.argv.slice(2)) {
  // Uninstall removes the whole install root, every channel with it.
  if (argv.includes('--uninstall')) { uninstall(); return }
  const channel = resolveChannel()
  const dir = channelRoot(installDir(), channel)
  const target = resolveTarget()
  const exe = await ensureBinary(dir, target, { channel })
  if (!verifyCachedBinary(dir, target)) { diag('verify', 'fail', 'cached binary failed re-verification before spawn'); throw new Error('cached binary failed re-verification before spawn (fail closed)') }
  // R3 "before each spawn": the artifact sig is valid AND the exe we're about to run matches it.
  if (!verifyExtractedExe(dir, target)) { diag('verify', 'fail', 'cached exe does not match the verified archive before spawn'); throw new Error('cached executable does not match the verified archive (fail closed)') }
  spawnBinary(exe, ['--mcp'], process.env)
}

// Entrypoint (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { logErr('verticalbar-agent launcher error:', e?.message || e); process.exit(1) })
}
