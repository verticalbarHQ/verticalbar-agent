# Marketplace submission dossier

This directory records the public, reviewer-facing contract for Vertical Bar Agent. It contains no
credentials and grants no publishing authority.

## OpenAI

- Submission type: plugin with MCP and uploaded skills.
- MCP URL type: Universal.
- Production MCP URL: `https://mcp.vertical.bar/mcp`.
- Skill source: the exact generated `packages/openai-hosted/skills/` bundle. MCP `skills/list` may
  be scanned as a parity check, but clients do not depend on runtime skill delivery.
- Local/private package wiring may reference an existing registered app ID. The public portal must
  submit the production MCP URL from scratch and must not reuse that integration reference.
- Machine-readable form preparation: [`openai-submission.json`](openai-submission.json).

## Anthropic

- Hosted package: `packages/anthropic-hosted`, containing skills plus the public remote MCP
  connector.
- Desktop package: `packages/anthropic-desktop`, preserving the existing Claude plugin identity and
  using the local signed launcher.
- Submit the exact Hosted and Desktop package surfaces through Anthropic's official plugin form at
  `claude.ai/settings/plugins/submit` or `platform.claude.com/plugins/submit`. Independent GitHub
  marketplace distribution remains available before and after review.
- Machine-readable form preparation: [`anthropic-submission.json`](anthropic-submission.json).

## Human gates

The repository can prepare and validate the packages, listing copy, assets, tests, and evidence.
`screenshots/authentication.png` is an actual unauthenticated Production OAuth screen captured with
no entered credentials or customer data; generated OpenAI Hosted packages include that exact asset.
Only an authorized Vertical Bar publisher may complete organization verification, provide reviewer
credentials out of band, accept legal attestations, submit for review, or publish an approved entry.

No public marketplace activation is implied by these files.

## Release channels

The repository projection exposes separate stable/next IDs for Hosted and Desktop. Local pre-review
checks use the generated `verticalbar-agent-candidate` catalog. A marketplace reviewer receives one
exact package digest; no package is rebuilt between candidate verification and submission.

## RND-3859 resubmission contract

- The repository-root `chatgpt-app-submission.json` is the sole OpenAI portal import artifact and
  the canonical OpenAI test set. [`test-cases.json`](test-cases.json) mirrors those positive and
  negative cases for package-level verification; an automated parity test prevents the two files
  from describing different submissions.
- Every source descriptor declares an object-root `outputSchema` (51 hosted, 52 Node local, and 53
  desktop tools), and every successful result carries matching `structuredContent`. Tool errors
  remain `isError:true` responses without structured content, as permitted by the MCP SDK. Stable
  owned result shapes use domain schemas; opaque pass-through results use the same explicit
  versioned envelope without inventing fields.
- The backwards-compatible text `content` remains authoritative. Its machine-readable projection
  reports `dataState` (`complete`, safe item/field `truncated`, or `omitted`), `contentTruncated`, and a
  required `returnedCount` for safely shortened owned lists. Structured payloads use a 256 KiB
  serialized UTF-8 budget and never cut an arbitrary object or indivisible string.
- The credential-free regression harness invokes all 51 hosted tools through the real MCP registry
  and SDK validator. The optional live reviewer harness defaults to 39 read-only calls; dedicated
  reviewer-workspace writes require explicit opt-in, and real CI/Test Suite executions require a
  second explicit opt-in because they incur execution cost and side effects. Write mode also binds
  the operator-confirmed classification to exact expected CrossCheck and Vertical Bar workspace
  IDs in their separate namespaces; each write is refused if its corresponding discovery does not
  return that ID, while the remaining read evidence is still collected.
- The candidate hosted projection is 51 tools: the 53-tool desktop catalog minus local-only
  `login` and `logout`. After merge, verify the deployed staging `tools/list` response is exactly 51
  and excludes both local-only tools before any marketplace resubmission.
- `cc_ocpm_cancel_job.destructiveHint` is `true` because an active job transitions to the terminal
  `cancelled` state and its running task is stopped, so that selected execution cannot resume or
  produce its result; a new request is required to run the analysis again.
- Do not promote this change to production while Anthropic review is in progress. After merge,
  staging validation is allowed; marketplace resubmission still requires explicit owner approval.

## Official references

- [OpenAI plugin structure](https://developers.openai.com/plugins/build/plugins)
- [OpenAI public submission](https://developers.openai.com/plugins/deploy/submission)
- [Anthropic plugin authoring](https://code.claude.com/docs/en/plugins)
- [Anthropic plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Anthropic hosted plugin surfaces](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)
- [Anthropic official plugin submission](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-official-marketplace)
