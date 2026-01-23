## Flox environments

The repo keeps two local Flox environments: a default dev env in `.flox/` (named `dev`) and a common env in `env/common/` for CI layering. Shared settings live in `env/common/`, and Node tooling is sourced from templates (clone `segment-integrations/templates` next to this repo at `../templates`). Activation exports `PROJECT_ROOT` and prefers the env-provided toolchains.

Platform-specific envs live in the templates repo under `env/android/{common,min,max}` and `env/ios/{common,min,max}` and are layered by CI jobs with the `env/common` env. These envs provide Flox services for emulator/simulator setup.

Visual dependency graph (local envs):
```
.flox/env/manifest.toml (dev)
└─ env/common
```

Install flox from https://flox.dev/docs/install and ensure `~/.flox/bin` is on `PATH`. Run the full build, lint, and test suite with `flox activate -- bash scripts/build.sh`.

For Android E2E, activate a platform env (from templates) and start the emulator service first, then run:
```
flox activate . --devshell default -- bash -lc "yarn install --immutable && yarn e2e install && yarn build && yarn e2e build:android && yarn e2e test:android"
```
For iOS E2E on macOS, activate a platform env (from templates) and start the simulator service first, then run:
```
flox activate . --devshell default -- bash -lc "yarn install --immutable && yarn e2e install && yarn e2e pods && yarn build && yarn e2e build:ios && yarn e2e test:ios"
```
