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
  the canonical OpenAI test set. [`test-cases.json`](test-cases.json) remains the shared package
  security/workflow verification set used by the Anthropic dossier; it is not a second OpenAI
  submission input. In particular, its N1 and N2 intentionally invoke protected tools, while the
  OpenAI import contract requires negative prompts for which the app must not trigger.
- The source catalogs currently declare no `outputSchema` (0/51 hosted tools and 0/53 desktop
  tools). This is a separate, non-blocking follow-up: the MCP SDK rejects a successful result when
  `outputSchema` is declared but `structuredContent` is absent, while the shared response helper
  currently returns text content only. Adding schemas therefore requires an end-to-end response
  contract migration, not a descriptor-only edit.
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
