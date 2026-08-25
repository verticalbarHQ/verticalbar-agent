// RND-2786 [spec/327-rnd-2786] T3/T5-shared (node side) — the evergreen "brain": decide whether to
// use the cached binary or install a newer one, from a minisign-signed latest.json. Pure + testable:
// filesystem/network/exec live in launcher.mjs; this module only decides.
//
// Enforces (AC4/AC5/AC10/AC12): fail-closed on a bad latest.json signature; FLOOR (never below
// min_good_version) + NO downgrade (never replace a newer installed binary with an older one);
// anti-replay (reject a latest.json whose monotonic counter regressed, R10); offline taxonomy (R12):
// a usable cached binary + offline → proceed on current (best-effort); no usable binary + offline →
// fail loud.

import { verifyMinisign, PINNED_PUBKEY } from './minisign-verify.mjs'

/** The release channels a client may ask for. An unknown channel is an error, never a quiet fall
 *  back to stable: someone who asked for a prerelease and silently got stable would believe they
 *  were testing the new build. */
export const CHANNELS = ['stable', 'next']

/** A channel is a download BASE, not a filename.
 *
 *  `releases/latest/download` resolves to the most recently published NON-prerelease release. A next
 *  build published normally would become that — every stable client would start resolving against a
 *  prerelease, which is the accident this channel exists to prevent. Published as a prerelease it is
 *  safe but unreachable under that path. So next gets its own fixed-tag prerelease base whose assets
 *  are replaced per build, and both channels serve `latest.json` beneath their own base.
 *
 *  The protection is administrative, not cryptographic: an admin can convert a prerelease into a
 *  full release. The publisher asserts it stayed a prerelease after every publish. */
export const RELEASES = 'https://github.com/verticalbarHQ/verticalbar-agent/releases'
export const NEXT_TAG = 'channel-next'
export function channelBase(channel) {
  if (!CHANNELS.includes(channel)) throw new Error(`unknown release channel '${channel}'`)
  return channel === 'stable' ? `${RELEASES}/latest/download` : `${RELEASES}/download/${NEXT_TAG}`
}

/** Compare dotted numeric versions ("1.2.3"). Returns -1 / 0 / 1. Non-numeric parts compare as 0. */
export function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

/**
 * @param {object} o
 * @param {string} o.target                e.g. "macos-arm64"
 * @param {{version?:string, counter?:number, installedCounter?:number, usable:boolean}} o.state
 *   installed binary state. `counter` is the highest manifest counter ever OBSERVED (the anti-replay
 *   floor); `installedCounter` is the counter of the manifest the cached binary was installed from.
 *   They differ, and conflating them is what let a republished build go unnoticed.
 * @param {string} o.downloadBase          the CHANNEL's release base — see `channelBase()`.
 * @param {string} [o.channel]             which channel this base is expected to serve (default
 *   'stable'). The base says where the caller looked; it does not authenticate the response, so the
 *   manifest's own `channel` is still compared against this.
 *   The caller must pass the anti-replay counter belonging to THIS channel: the channels advance
 *   independently, so a stable counter used against a next manifest reads as a replay.
 * @param {(url:string)=>Promise<Buffer>} o.fetchBuf  fetch a URL → Buffer (throws on network/HTTP error)
 * @param {string} [o.pubkey]              pinned minisign pubkey (defaults to PINNED_PUBKEY)
 * @param {typeof verifyMinisign} [o.verify]
 * @returns {Promise<{decision:'use-cached'|'install'|'fail', version?:string, counter?:number,
 *   artifactUrl?:string, sigUrl?:string, sha256?:string, size?:number, reason?:string}>}
 */
export async function planUpdate({ target, state, downloadBase, fetchBuf, channel = 'stable', pubkey = PINNED_PUBKEY, verify = verifyMinisign }) {
  if (!CHANNELS.includes(channel)) {
    return { decision: 'fail', reason: `unknown release channel '${channel}' (known: ${CHANNELS.join(', ')})` }
  }
  const manifest = 'latest.json'
  let latestBuf, sigText
  try {
    latestBuf = await fetchBuf(`${downloadBase}/${manifest}`)
    sigText = (await fetchBuf(`${downloadBase}/${manifest}.minisig`)).toString('utf8')
  } catch (e) {
    // Offline / fetch failure — AC12 taxonomy.
    if (state?.usable && state.version) return { decision: 'use-cached', version: state.version, reason: 'offline; using verified cached binary (best-effort)' }
    return { decision: 'fail', reason: `cannot reach update channel and no usable cached binary: ${e?.message || e}` }
  }

  // The signature over latest.json is what makes min_good_version / counter trustworthy.
  if (!verify(latestBuf, sigText, pubkey)) return { decision: 'fail', reason: `${manifest} signature invalid (fail closed)` }

  let latest
  try { latest = JSON.parse(latestBuf.toString('utf8')) } catch { return { decision: 'fail', reason: `${manifest} is not valid JSON` } }
  const { version, minGoodVersion, counter, artifacts } = latest || {}
  if (!version || !minGoodVersion || typeof counter !== 'number' || !artifacts) {
    return { decision: 'fail', reason: `${manifest} missing required fields (version/minGoodVersion/counter/artifacts)` }
  }

  // The channel a manifest belongs to is INSIDE the signed bytes. Both channels are signed by the
  // same minisign key, so a valid signature says "we published this" and nothing about which channel
  // it was published to — a filename or a URL is a claim anyone serving the file can make.
  //
  // Absent is read as stable, and only for stable. Every manifest published before this field
  // existed is a stable one, and rejecting those would strand every install already running. A
  // manifest with no channel is therefore not a `next` manifest, and asking for `next` must not
  // accept one.
  const declared = latest.channel
  if (declared == null) {
    if (channel !== 'stable') {
      return { decision: 'fail', reason: `${manifest} declares no channel; only a stable manifest may omit it (fail closed)` }
    }
  } else if (declared !== channel) {
    return { decision: 'fail', reason: `${manifest} declares channel '${declared}' but '${channel}' was requested (fail closed)` }
  }

  // Anti-replay (R10): a signed-but-stale manifest with a regressed counter must be rejected, else a
  // MITM/stale-CDN could re-permit a version ops meant to floor out.
  if (state?.counter != null && counter < state.counter) {
    return { decision: 'fail', reason: `${manifest} replay: counter ${counter} < last-seen ${state.counter}` }
  }

  const art = artifacts[target]
  if (!art || !art.file) return { decision: 'fail', reason: `no artifact for target ${target}` }

  // A version is not the identity of the bytes. The next channel republishes its fixed tag on every
  // staging build, so the same version legitimately names different artifacts — and comparing
  // versions alone told a tester who had pulled the first staging build to keep it forever, through
  // every build after it. The publish a payload came from is what identifies it, and that is the
  // counter of the manifest it was installed from.
  //
  // Absent for state written before this existed: unknown, and unknown does not justify making every
  // install in the world re-download. It records itself on the next real install.
  //
  // A newer counter says "different bytes", never "newer version" — the two channels advance their
  // counters on their own schedule, so a republish can legitimately carry a version OLDER than what
  // is installed. Letting the counter alone supersede the cache would walk straight past the
  // anti-downgrade guard below and replace a newer binary with an older one, so a republish only
  // supersedes when the manifest is not older than the cached payload.
  const fromANewerPublish = state?.installedCounter != null && counter > state.installedCounter &&
    (state.version == null || cmpVersion(version, state.version) >= 0)

  // Keep the cached binary iff it is usable AND at/above the floor AND not older than latest
  // (never downgrade — spec-103 anti-downgrade) AND not superseded by a newer publish of the same
  // version.
  if (state?.usable && state.version && !fromANewerPublish &&
      cmpVersion(state.version, minGoodVersion) >= 0 &&
      cmpVersion(state.version, version) >= 0) {
    // Carry the observed counter so the caller can advance the anti-replay floor even though we are
    // NOT installing — else a later replay of an older signed manifest is accepted (R10, codex P2).
    return { decision: 'use-cached', version: state.version, counter }
  }

  // Refuse to "update" to something below the floor (defensive; a correct latest.json never does this).
  if (cmpVersion(version, minGoodVersion) < 0) {
    return { decision: 'fail', reason: `${manifest} version ${version} is below its own min_good_version ${minGoodVersion}` }
  }

  return {
    decision: 'install',
    version,
    counter,
    artifactUrl: `${downloadBase}/${art.file}`,
    sigUrl: `${downloadBase}/${art.file}.minisig`,
    sha256: art.sha256,
    size: art.size,
  }
}

/** Download an artifact + its detached .minisig and verify BEFORE returning the bytes. Throws (fail
 *  closed) if the signature does not verify — the caller must never write/exec unverified bytes. */
export async function fetchAndVerifyArtifact({ artifactUrl, sigUrl, fetchBuf, pubkey = PINNED_PUBKEY, verify = verifyMinisign }) {
  const buf = await fetchBuf(artifactUrl)
  const sig = (await fetchBuf(sigUrl)).toString('utf8')
  if (!verify(buf, sig, pubkey)) throw new Error(`artifact signature verification failed: ${artifactUrl}`)
  return buf
}
