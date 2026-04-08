## Release guide

This repo uses semantic-release with multi-semantic-release to version and publish all public workspaces. Tags follow `${name}-v${version}` and releases are cut from `master` (stable) or any feature branch (prerelease).

### Prerequisites

- Secrets: npm trusted publishing (OIDC) is configured per-package on npmjs.com. The workflow uses `github.token` for GitHub operations.
- Git history: full clone (`fetch-depth: 0`) so semantic-release can find prior tags.
- Commit format: conventional commits; commitlint is already configured.

### What runs

- Config files: `release.config.js` (single-package defaults) and `multi-release.config.js` (multi-package orchestration, sequential init/prepare, ignore private packages, tag format/branches).
- Plugins: commit analyzer + release notes, npm publish (with provenance), and GitHub release (no success comment).
- Script: root `yarn release` runs `multi-semantic-release` with the above config per public package.

### CI/CD path (recommended)

1. Ensure target branch is green. Merges must use conventional commits.
2. Trigger `Release` workflow in Actions:
   - **Production release**: Run from `master` with type `production` → publishes stable versions (e.g., `2.23.0`)
   - **Fix candidate/beta**: Run from any feature branch with type `beta` → publishes prerelease versions (e.g., `2.23.0-fix-retry-bug.1`)
   - **Dry run**: Run from any branch with type `dry-run` to preview what would be published
3. Outputs: package tags (`${name}-vX.Y.Z`), npm publishes, and GitHub releases.

**Beta/fix candidate workflow:**

- Push your feature branch (e.g., `fix/customer-issue-123`)
- Run Release workflow from that branch with type `beta`
- Publishes with branch name in version: `2.23.0-fix-customer-issue-123.1`
- Customer installs with: `npm install @segment/analytics-react-native@fix-customer-issue-123`
- No branch management or syncing required
- Each feature branch gets its own npm dist-tag

Note: version bumps and changelogs are **not** committed back to the repo. The source of truth for versions is the git tags and npm registry. To sync the repo's `package.json` versions with npm, run `devbox run --config=shells/devbox-fast.json sync-versions` and include the changes in a PR.

### Local dry run

1. `GH_TOKEN=<token> devbox run --config=shells/devbox-fast.json release-dry-run` (GH token needs `contents` read).
2. Omit `--dry-run` to actually publish (only do this if you intend to release from your machine; npm auth is handled via OIDC in CI).

### Tips and gotchas

- Only public packages release; private workspaces (e.g., `packages/shared`) are ignored.
- Tag pattern is important: keep `${name}-v${version}` if you create manual tags for debugging.
- Branch name becomes part of prerelease identifier: use descriptive branch names (e.g., `fix/retry-logic` not `fix123`).
- Keep yarn.lock in sync before releasing to avoid install differences between CI and local.
- `.npmrc` contains `workspaces-update=false` to prevent `npm version` from failing on Yarn's `workspace:` protocol.
- Multiple fix candidates can coexist on npm simultaneously with different dist-tags.
