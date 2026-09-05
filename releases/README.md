# Vertical Bar Agent release surface

The public mirror generates the machine-readable release surface from the same exact CrossCheck
commit as its plugin packages. Do not hand-edit generated files in the public repository.

The generated `releases/` directory contains:

- `index.json` — source commit, plugin version, canonical skill digest and four package digests;
- `compatibility.json` — host, transport, skill and desktop-companion requirements;
- `SHA256SUMS` — every file in every marketplace package;
- `PACKAGE-SHA256SUMS` — the four installable package ZIP checksums;
- `VerticalBarAgent-<vendor>-<surface>.zip` — deterministic package archives whose root
  is the vendor manifest (there is no extra wrapping directory);
- `README.md` — the public explanation of these contracts.

Native companion archives and the four package ZIPs are GitHub Release assets. The signed candidate
descriptor closes over their exact bytes and `PACKAGE-SHA256SUMS`; a stable promotion moves the
candidate already verified on next and does not rebuild packages or binaries.

Claude web accepts the Anthropic Hosted ZIP directly in its plugin upload surface. OpenAI's public
plugin portal accepts the final skills bundle and production MCP as separate submission inputs; a
GitHub ZIP is therefore a reproducible release/download surface, not a substitute for portal review.
The ZIPs are exact upload, review, audit, and offline handoff artifacts. Routine Codex and Claude
local installs should use the public repository marketplace commands in the root README; those host
paths also provide tracked updates and do not require a hand-authored local catalog.

The generated catalogs keep Hosted (`verticalbar-agent-hosted`) and Desktop
(`verticalbar-agent`) identities separate. Their prerelease entries append `-next`; private dev
validation uses the generated `verticalbar-agent-candidate` marketplace and never aliases stable.
Stable catalog entries point directly at their vendor package directory, so the package digest in
`index.json` describes the bytes a real install receives. The repository-root Desktop manifest is a
transition surface for previously cached installs, not a fifth release artifact.
