// RND-2786 [spec/327-rnd-2786] T2 — minisign signature verification using ONLY node builtins.
//
// Why committed + dependency-free: the launcher runs from a fresh plugin clone with NO node_modules,
// and the system `minisign` CLI is not guaranteed present. node's crypto (OpenSSL) supplies both
// primitives we need — Ed25519 (`crypto.verify`) and BLAKE2b-512 (`crypto.createHash('blake2b512')`) —
// so no third-party dep is required. (R7, empirically verified 2026-07-10: minisign 0.12 signs
// PREHASHED by default (alg "ED" = BLAKE2b-512 of the file); node verifies it fine — the earlier
// "node lacks blake2b512" claim was false. Legacy "Ed" (raw-message) sigs are also handled.)
//
// This is the supply-chain trust anchor: the launcher/self-update MUST call this and refuse to
// write/exec any downloaded artifact whose signature does not verify against the PINNED public key.

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto'

/** The PINNED Vertical Bar Agent release public key (RND-2786 H2). Private key lives only in CI
 *  secrets (GH `VERTICALBAR_AGENT_MINISIGN_KEY` / AWS SM) + 1Password. Rotating this constant is a
 *  deliberate, coordinated release step (new pubkey shipped via the git-trusted plugin + a binary bump). */
export const PINNED_PUBKEY = 'RWRKzVE+208a7cjnPi9jtqylZDIGOP8TrdmjS3AuJCaCX1XlltTlqgDo'

// DER SPKI prefix for a raw 32-byte Ed25519 public key — lets us build a node KeyObject from the raw
// key bytes minisign stores.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

/** Accept either a full 2-line minisign .pub ("untrusted comment:\n<base64>") or the bare base64 line. */
function parsePublicKey(pub) {
  const line = String(pub).trim().split('\n').map((l) => l.trim()).filter(Boolean).pop()
  const raw = Buffer.from(line, 'base64') // 2-byte alg ("Ed") + 8-byte keyID + 32-byte key
  if (raw.length !== 42) throw new Error(`minisign pubkey: expected 42 decoded bytes, got ${raw.length}`)
  return {
    keyId: raw.subarray(2, 10),
    keyObject: createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, raw.subarray(10)]),
      format: 'der',
      type: 'spki',
    }),
  }
}

/** Parse a detached .minisig (4 lines: untrusted comment, sig, trusted comment, global sig). */
function parseSignature(sigText) {
  const lines = String(sigText).split('\n')
  const sigLine = lines[1]?.trim()
  const trustedCommentLine = lines[2] ?? ''
  const globalSigLine = lines[3]?.trim()
  if (!sigLine || !globalSigLine) throw new Error('minisign .sig: malformed (need 4 lines)')
  const sigRaw = Buffer.from(sigLine, 'base64') // 2-byte alg + 8-byte keyID + 64-byte sig
  if (sigRaw.length !== 74) throw new Error(`minisign .sig: expected 74 decoded bytes, got ${sigRaw.length}`)
  const prefix = 'trusted comment: '
  if (!trustedCommentLine.startsWith(prefix)) throw new Error('minisign .sig: missing trusted comment')
  return {
    alg: sigRaw.subarray(0, 2).toString('latin1'), // "ED" prehashed | "Ed" legacy
    keyId: sigRaw.subarray(2, 10),
    signature: sigRaw.subarray(10),
    trustedComment: trustedCommentLine.slice(prefix.length).replace(/\r$/, ''),
    globalSig: Buffer.from(globalSigLine, 'base64'),
  }
}

/**
 * Verify a detached minisign signature over `fileBuf` against `pubkey` (defaults to the pinned key).
 * Returns true ONLY when BOTH the artifact signature AND the trusted-comment (global) signature verify
 * AND the key IDs match. Any parse/verify failure returns false — never throws to the caller so the
 * caller's fail-closed branch is a simple `if (!ok) refuse`. (Callers MUST treat false as "do not use".)
 */
export function verifyMinisign(fileBuf, sigText, pubkey = PINNED_PUBKEY) {
  try {
    const { keyId: pubKeyId, keyObject } = parsePublicKey(pubkey)
    const { alg, keyId: sigKeyId, signature, trustedComment, globalSig } = parseSignature(sigText)
    if (!pubKeyId.equals(sigKeyId)) return false // signed by a different key than the one we pinned
    if (alg !== 'ED' && alg !== 'Ed') return false
    const message = alg === 'ED' ? createHash('blake2b512').update(fileBuf).digest() : Buffer.from(fileBuf)
    if (!edVerify(null, message, keyObject, signature)) return false
    // Bind the trusted comment (timestamp/version we may rely on) — minisign's second signature is over
    // (raw signature bytes || trusted-comment bytes).
    const globalMsg = Buffer.concat([signature, Buffer.from(trustedComment, 'utf8')])
    return edVerify(null, globalMsg, keyObject, globalSig)
  } catch {
    return false
  }
}
