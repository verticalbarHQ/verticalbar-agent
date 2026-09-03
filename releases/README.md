# VerticalBar Agent release surface

The public mirror generates the machine-readable release surface from the same exact CrossCheck
commit as its plugin packages. Do not hand-edit generated files in the public repository.

The generated `releases/` directory contains:

- `index.json` — source commit, plugin version, canonical skill digest and four package digests;
- `compatibility.json` — host, transport, skill and desktop-companion requirements;
- `SHA256SUMS` — every file in every marketplace package;
- `README.md` — the public explanation of these contracts.

Native companion archives remain signed GitHub Release assets. A stable promotion moves the exact
candidate already verified on next; it does not rebuild packages or binaries.

The generated catalogs keep Hosted (`verticalbar-agent-hosted`) and Desktop
(`verticalbar-agent`) identities separate. Their prerelease entries append `-next`; private dev
validation uses the generated `verticalbar-agent-candidate` marketplace and never aliases stable.
Stable catalog entries point directly at their vendor package directory, so the package digest in
`index.json` describes the bytes a real install receives. The repository-root Desktop manifest is a
transition surface for previously cached installs, not a fifth release artifact.
