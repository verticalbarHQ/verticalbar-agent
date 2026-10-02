# Vertical Bar Agent release surface

The public mirror generates the machine-readable release surface from the same exact CrossCheck
commit as its plugin packages. Do not hand-edit generated files in the public repository.

The generated `releases/` directory contains:

- `index.json` — source commit, plugin version, canonical skill digest and the two package digests;
- `compatibility.json` — host, transport and skill matrix per package;
- `SHA256SUMS` — every file in every marketplace package;
- `PACKAGE-SHA256SUMS` — the two installable package ZIP checksums;
- `VerticalBarAgent-<vendor>-hosted.zip` — deterministic package archives whose root is the vendor
  manifest (there is no extra wrapping directory);
- `README.md` — the public explanation of these contracts.

The ZIPs live in the repository tree, not on GitHub Releases. A stable promotion fast-forwards the
default branch to the `next` commit already verified; it does not rebuild packages.

Claude web accepts the Anthropic Hosted ZIP directly in its plugin upload surface. OpenAI's public
plugin portal accepts the final skills bundle and production MCP as separate submission inputs; a
ZIP is therefore a reproducible download surface, not a substitute for portal review. The ZIPs are
exact upload, review, audit, and offline handoff artifacts. Routine Codex and Claude installs should
use the public repository marketplace commands in the root README; those host paths also provide
tracked updates and do not require a hand-authored local catalog.

The generated catalogs list the Hosted plugin (`verticalbar-agent-hosted`) and its prerelease entry
(`verticalbar-agent-hosted-next`); private dev validation uses the generated
`verticalbar-agent-candidate` marketplace and never aliases stable. Stable catalog entries point
directly at their vendor package directory, so the package digest in `index.json` describes the bytes
a real install receives. Agent Desktop (`verticalbar-agent`) was retired in RND-4759 and is no longer
listed.
