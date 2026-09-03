# Marketplace submission dossier

This directory records the public, reviewer-facing contract for VerticalBar Agent. It contains no
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
- Claude web/Desktop Chat/Cowork distribution and the Claude Code community marketplace are
  separate review surfaces even though both packages share canonical skills.
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

## Official references

- [OpenAI plugin structure](https://developers.openai.com/plugins/build/plugins)
- [OpenAI public submission](https://developers.openai.com/plugins/deploy/submission)
- [Anthropic plugin authoring](https://code.claude.com/docs/en/plugins)
- [Anthropic plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Anthropic hosted plugin surfaces](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)
