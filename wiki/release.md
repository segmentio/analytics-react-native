## Release guide

This repo uses semantic-release with multi-semantic-release to version and publish all public workspaces. Tags follow `${name}-v${version}` and releases are cut from `master` (stable) and `beta` (prerelease).

### Prerequisites
- Secrets: `GH_TOKEN` (repo `contents` write) and `NPM_TOKEN` (publish). CI also passes `YARN_NPM_AUTH_TOKEN` (same as `NPM_TOKEN`).
- Git history: full clone (`fetch-depth: 0`) so semantic-release can find prior tags.
- Commit format: conventional commits; commitlint is already configured.

### What runs
- Config files: `release.config.js` (single-package defaults) and `multi-release.config.js` (multi-package orchestration, sequential init/prepare, ignore private packages, tag format/branches).
- Plugins: commit analyzer + release notes, changelog (`CHANGELOG.md`), npm publish, GitHub release (no success comment), and git commit of changelog + package.json.
- Script: root `yarn release` runs `multi-semantic-release` with the above config per public package.

### CI/CD path (recommended)
1) Ensure `master`/`beta` are green. Merges must use conventional commits.
2) Trigger `Publish` workflow in Actions. Inputs are tokens only; workflow fetches full history, installs flox, then runs the flake shell to execute `flox/scripts/release.sh`.
3) Outputs: package tags (`${name}-vX.Y.Z`), npm publishes, GitHub releases, and updated changelog commits pushed back via the workflow token.

### Local dry run
1) `GH_TOKEN=<token> NPM_TOKEN=<token> YARN_NPM_AUTH_TOKEN=<token>` (GH token needs `contents` write; npm token can be automation/classic publish).
2) `flox activate . --devshell default -- bash flox/scripts/release.sh -- --dry-run` to see what would publish. Omit `--dry-run` to actually publish (only do this if you intend to release from your machine).

### Tips and gotchas
- Only public packages release; private workspaces (e.g., `packages/shared`) are ignored.
- Tag pattern is important: keep `${name}-v${version}` if you create manual tags for debugging.
- If adding a new branch for releases, update both `release.config.js` and `multi-release.config.js`.
- Keep yarn.lock in sync before releasing to avoid install differences between CI and local.
