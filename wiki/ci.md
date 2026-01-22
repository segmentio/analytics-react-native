## CI workflows

We split CI to keep PRs fast while still covering E2E regularly.

- `ci-fast.yml`: runs on push/PR to `master`/`beta` (docs ignored). Uses `flox/install-flox-action@v2.2.0` then runs `scripts/build.sh` (install, build, lint, unit tests). Concurrency cancels superseded runs per ref.
- `ci-e2e-optional.yml`: E2E on-demand. Triggers via PR label `run-e2e` or `workflow_dispatch` (with optional `platforms` input). Uses the flox install action, runs iOS latest (Xcode 26.1.1, runtime 26.1) and Android latest (API 33) with flox-managed simulators/emulators.
- `ci-e2e-nightly.yml`: scheduled 06:00 UTC (and manual dispatch). Uses the flox install action and runs full matrix: iOS min (Xcode 16.1, runtime 18.5) and latest (26.1), Android min (API 21) and latest (API 33). Uses flox services for bootstrapping devices.

Tips:
- Keep PRs green with `ci-fast`. Add the `run-e2e` label to a PR to kick off optional E2E or dispatch manually from Actions.
- Nightly runs are authoritative for regression coverage; adjust matrices there when bumping platform minimums.

### Helpful yarn commands
- `yarn test:fast`: lint + typecheck + unit tests.
- `yarn test:full`: lint + typecheck + workspace builds + all workspace tests.
- `yarn format` / `yarn format:check`: treefmt (prettier + nixfmt-rfc-style + taplo + shfmt) for JS/TS/MD/YAML/JSON/Nix/TOML/shell.
- Updates: `yarn update:yarn` (deps), `yarn update:gradle`, `yarn update:pods`, `yarn update:nix` (flake inputs), `yarn update:flox` (flox locks + package managers).
- Cleans: `yarn clean:all` (workspaces + Android emulator reset + Gradle caches + iOS sim/DerivedData + nix gc + flox gc); targeted variants (`clean:workspaces`, `clean:android`, `clean:ios`, `clean:nix`, `clean:flox`).
- `yarn lint:fix`: eslint with auto-fix.
- `yarn e2e:android` / `yarn e2e:ios`: run platform E2E flows (assumes flox env provides emulator/simulator).
- `yarn update:flox`: regenerate flox lockfiles in dependency-safe order (requires Nix flake support).
