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
 * @param {{version?:string, counter?:number, usable:boolean}} o.state  installed binary state
 * @param {string} o.downloadBase          public mirror releases base (…/releases/latest/download)
 * @param {(url:string)=>Promise<Buffer>} o.fetchBuf  fetch a URL → Buffer (throws on network/HTTP error)
 * @param {string} [o.pubkey]              pinned minisign pubkey (defaults to PINNED_PUBKEY)
 * @param {typeof verifyMinisign} [o.verify]
 * @returns {Promise<{decision:'use-cached'|'install'|'fail', version?:string, counter?:number,
 *   artifactUrl?:string, sigUrl?:string, sha256?:string, size?:number, reason?:string}>}
 */
export async function planUpdate({ target, state, downloadBase, fetchBuf, pubkey = PINNED_PUBKEY, verify = verifyMinisign }) {
  let latestBuf, sigText
  try {
    latestBuf = await fetchBuf(`${downloadBase}/latest.json`)
    sigText = (await fetchBuf(`${downloadBase}/latest.json.minisig`)).toString('utf8')
  } catch (e) {
    // Offline / fetch failure — AC12 taxonomy.
    if (state?.usable && state.version) return { decision: 'use-cached', version: state.version, reason: 'offline; using verified cached binary (best-effort)' }
    return { decision: 'fail', reason: `cannot reach update channel and no usable cached binary: ${e?.message || e}` }
  }

  // The signature over latest.json is what makes min_good_version / counter trustworthy.
  if (!verify(latestBuf, sigText, pubkey)) return { decision: 'fail', reason: 'latest.json signature invalid (fail closed)' }

  let latest
  try { latest = JSON.parse(latestBuf.toString('utf8')) } catch { return { decision: 'fail', reason: 'latest.json is not valid JSON' } }
  const { version, minGoodVersion, counter, artifacts } = latest || {}
  if (!version || !minGoodVersion || typeof counter !== 'number' || !artifacts) {
    return { decision: 'fail', reason: 'latest.json missing required fields (version/minGoodVersion/counter/artifacts)' }
  }

  // Anti-replay (R10): a signed-but-stale manifest with a regressed counter must be rejected, else a
  // MITM/stale-CDN could re-permit a version ops meant to floor out.
  if (state?.counter != null && counter < state.counter) {
    return { decision: 'fail', reason: `latest.json replay: counter ${counter} < last-seen ${state.counter}` }
  }

  const art = artifacts[target]
  if (!art || !art.file) return { decision: 'fail', reason: `no artifact for target ${target}` }

  // Keep the cached binary iff it is usable AND at/above the floor AND not older than latest
  // (never downgrade — spec-103 anti-downgrade).
  if (state?.usable && state.version &&
      cmpVersion(state.version, minGoodVersion) >= 0 &&
      cmpVersion(state.version, version) >= 0) {
    // Carry the observed counter so the caller can advance the anti-replay floor even though we are
    // NOT installing — else a later replay of an older signed manifest is accepted (R10, codex P2).
    return { decision: 'use-cached', version: state.version, counter }
  }

  // Refuse to "update" to something below the floor (defensive; a correct latest.json never does this).
  if (cmpVersion(version, minGoodVersion) < 0) {
    return { decision: 'fail', reason: `latest.json version ${version} is below its own min_good_version ${minGoodVersion}` }
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
