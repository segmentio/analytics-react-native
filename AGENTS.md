# Repository Guidelines

## Project Structure & Module Organization
- Yarn workspaces live under `packages`: `core` (SDK runtime), `sovran` (state store), `shared` (cross-package utilities), and `plugins/*` (destination and helper plugins). Native iOS/Android sources reside in each package’s `ios` and `android` folders.
- Example apps sit in `examples/AnalyticsReactNativeExample` (manual QA) and `examples/E2E` (Detox). Scripts live in `flox/scripts`; configuration lives alongside packages (e.g., `tsconfig.json`, `babel.config.js`, `jest.config.js`).

## Build, Test, and Development Commands
- `yarn bootstrap`: install root + workspace deps and pod install for example/e2e apps.
- `yarn build`: run workspace builds in topo order.
- `yarn testAll` / `yarn test`: workspace Jest suite or root Jest run.
- `yarn lint`; `yarn lint --fix`: ESLint across the monorepo.
- `yarn typescript`: type-check without emitting.
- Example app: `yarn example start | ios | android`. Detox: `yarn e2e start:e2e` then platform builds/tests (e.g., `yarn e2e e2e:build:ios` + `yarn e2e e2e:test:ios`).

## Flox Environment Practices
- Use `flox activate -d <dir> -- <cmd>` for non-interactive runs; avoid ad-hoc local tooling installs.
- Treat `.flox/env/manifest.toml` as the source of truth; use `flox edit` and `flox install` so validation runs.
- Compose environments via `[include]` and keep common toolchains in shared envs; remember later includes override earlier ones.
- After updating shared envs, run `flox include upgrade -d <dir>` to pull changes into composed envs.
- Use `[vars]` for static environment variables, `[hook]` for activation-time setup, and `[profile]` for aliases/functions.
- Use `[services]` for long-running processes and manage them with `flox services start|status|logs|stop`.

## Coding Style & Naming Conventions
- TypeScript-first; native code should mirror existing Swift/Obj-C/Kotlin style. Two-space indentation and Prettier formatting via ESLint rules.
- Prefer camelCase for variables/functions, PascalCase for React components/classes, and UPPER_SNAKE for constants. Plugin packages follow `plugin-*` folder naming and publish as scoped `@segment/*`.
- Keep public APIs typed and documented; colocate utilities with their feature module (e.g., `src/plugins`, `src/__tests__`).

## Testing Guidelines
- Unit tests use Jest with tests under `__tests__` near source; snapshots live in `__tests__/__snapshots__`.
- End-to-end coverage uses Detox in `examples/E2E`; build and run per platform before pushing. Add regression tests for new behaviors and keep existing snapshots updated only when intentional.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat`, `fix`, `chore`, etc.); enforced by commitlint and release automation.
- For PRs, keep scope narrow, link issues when relevant, and note user-facing changes. Ensure `yarn lint`, `yarn typescript`, and the relevant `yarn test*`/Detox flows pass. Include screenshots only when UI changes affect the example app.

## Security & Configuration Tips
- Do not commit real Segment write keys or private endpoints; use placeholder values in examples and tests. Keep secrets out of `examples/` and CI config. When testing proxies/CDN settings, prefer environment-driven config rather than hardcoding.
