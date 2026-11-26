# Marketplace submission dossier

This directory records the public, reviewer-facing contract for Vertical Bar Agent. It contains no
credentials and grants no publishing authority.

## OpenAI

- Submission type: plugin with MCP and uploaded skills.
- MCP URL type: Universal.
- Production MCP URL: `https://mcp.vertical.bar/mcp`.
- Skill source: the exact generated `packages/openai-hosted/skills/` bundle. MCP `skills/list` may
  be scanned as a parity check, but clients do not depend on runtime skill delivery.
- Update the existing approved Vertical Bar Agent listing in the public portal. Keep its identity,
  production MCP URL, OAuth setup, and prior review cases unless the Stress Test addition requires
  an explicit, reviewed change; do not create a second listing.
- Machine-readable form preparation: [`openai-submission.json`](openai-submission.json).

## Anthropic

- Hosted package: `packages/anthropic-hosted`, containing skills plus the public remote MCP
  connector. (The Desktop package was retired with Agent Desktop in RND-4759.)
- Submit the exact Hosted package through Anthropic's official plugin form at
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

The repository projection exposes stable and next IDs for the Hosted plugin. Local pre-review
checks use the generated `verticalbar-agent-candidate` catalog. A marketplace reviewer receives one
exact package digest; no package is rebuilt between candidate verification and submission.

## RND-3859 resubmission contract

- The repository-root `chatgpt-app-submission.json` is the sole OpenAI portal import artifact and
  the canonical OpenAI test set. [`test-cases.json`](test-cases.json) mirrors those positive and
  negative cases for package-level verification; an automated parity test prevents the two files
  from describing different submissions.
- Every hosted tool descriptor (83) declares an object-root `outputSchema`, and every successful
  result carries matching `structuredContent`. Tool errors
  remain `isError:true` responses without structured content, as permitted by the MCP SDK. Stable
  owned result shapes use domain schemas; opaque pass-through results use the same explicit
  versioned envelope without inventing fields.
- The backwards-compatible text `content` remains authoritative. Its machine-readable projection
  reports `dataState` (`complete`, safe item/field `truncated`, or `omitted`), `contentTruncated`, and a
  required `returnedCount` for safely shortened owned lists. Structured payloads use a 256 KiB
  serialized UTF-8 budget and never cut an arbitrary object or indivisible string.
- The credential-free regression harness invokes all 83 hosted tools through the real MCP registry
  and SDK validator. The optional live reviewer harness permits 54 read-only tools by default and
  explicitly skips tools without discovered inputs; this is not proof of full live coverage. Dedicated
  reviewer-workspace writes require explicit opt-in, and real CI/Stress Test executions require a
  second explicit opt-in because they incur execution cost and side effects. Write mode also binds
  the operator-confirmed classification to the exact expected CrossCheck workspace ID; each write
  is refused if discovery does not return that ID, while the remaining read evidence is still
  collected.
- The hosted projection is 83 tools and has no `login` or `logout` session tools (those belonged to
  the retired local surface). After merge, verify the deployed staging `tools/list` response is
  exactly 83 before any marketplace resubmission.
- The process-data surface is the Environment-scoped process tools (`cc_get_process_context`,
  `cc_get_process_overview`, `cc_list_process_variants`, `cc_list_process_cases`). Legacy `vb_*` tools are
  absent from hosted and installed catalogs, so reviewers and agents cannot select the sunset
  Vertical Bar workspace route.
- `cc_cancel_ocpm_job.destructiveHint` is `true` because an active job transitions to the terminal
  `cancelled` state and its running task is stopped, so that selected execution cannot resume or
  produce its result; a new request is required to run the analysis again.
- Do not promote this change to production while Anthropic review is in progress. After merge,
  staging validation is allowed; marketplace resubmission still requires explicit owner approval.

## RND-6352 tool surface

- Tool names follow one rule, `<area>_<verb>[_<object>]` (`whoami` excepted); the old→new map is
  [`../docs/tool-naming.md`](../docs/tool-naming.md). Old names are not kept as aliases, so a
  listing or test case that names an old tool must be updated with the resubmission.
- `runtime_info` merged into `whoami`; `cc_validate_stress_test_definition` and
  `cc_dependency_graph_status` were removed as duplicates of `cc_preview_stress_test` and of the
  `graphStatus` every dependency read carries.
- New read-only tools: `screen_find`, `screen_open`, `screen_get_state`, `guide_search`, `guide_get`,
  `guide_list_whats_new`. `screen_open` is read-only by owner decision; both submission files record
  why.
- The server `instructions` carry the working contract in their first 512 characters; the static
  skill bundle (including the new `product-guide` skill) carries the full workflows.

## Official references

- [OpenAI plugin structure](https://developers.openai.com/plugins/build/plugins)
- [OpenAI public submission](https://developers.openai.com/plugins/deploy/submission)
- [Anthropic plugin authoring](https://code.claude.com/docs/en/plugins)
- [Anthropic plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Anthropic hosted plugin surfaces](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)
- [Anthropic official plugin submission](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-official-marketplace)
