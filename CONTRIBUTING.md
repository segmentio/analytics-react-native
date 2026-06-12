# Contributing

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project.

## Prerequisites

Follow the official guide for getting your [RN Environment setup](https://reactnative.dev/docs/0.72/environment-setup)

React Native requires different versions of the tools/languages you might be using already. Even among RN releases there might be different versions required. We recommend using the following tools to manage your toolsets:

- [Xcodes](https://github.com/XcodesOrg/XcodesApp)
  - To manage different releases of Xcode. The latest release of RN is usually supported by the latest Xcode release but previous releases might not.
- [Mise](https://mise.jdx.dev/dev-tools/) or [ASDF](https://asdf-vm.com/guide/getting-started.html) for everything else
  - Node, Ruby and Java version support might change amongst RN releases. These version managers let you manage multiple versions of them.

## Development workflow

To get started with the project, install the dependencies for each package. The recommended path is to enter the Devbox shell, whose init hook runs `yarn install` for you (see [wiki/devbox.md](/wiki/devbox.md)):

```sh
devbox shell
```

If you are not using Devbox, install dependencies directly with:

```sh
yarn install
```

While developing, you can run the [example app](/examples/AnalyticsReactNativeExample/) to test your changes.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typecheck
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

There are also end-to-end tests, driven by Detox through Devbox in the example workspaces under `examples/` (`e2e-latest` and `e2e-compat`). The E2E scripts live in each example's `devbox.json`, not the repo root. From an example directory you build, then test:

```sh
cd examples/e2e-latest   # or examples/e2e-compat

# iOS
devbox run build:ios
devbox run test:ios

# Android
devbox run build:android
devbox run test:android
```

See [wiki/e2e/setup.md](/wiki/e2e/setup.md) for the full setup, and `.github/workflows/e2e-tests.yml` for how CI orchestrates these runs.

To edit the Objective-C / Swift files, open `examples/AnalyticsReactNativeExample/ios/AnalyticsReactNativeExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > @segment/analytics-react-native`.

To edit the Kotlin files, open `examples/AnalyticsReactNativeExample/android` in Android studio and find the source files at `segmentanalyticsreactnative` under `Android`.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, eg add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, [Jest](https://jestjs.io/) for unit testing and [Detox](https://github.com/wix/Detox) for end-to-end tests.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Scripts

The root `package.json` file contains various scripts for common tasks:

- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn build`: build all public workspaces.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

End-to-end tests are run from the example workspaces via Devbox (see above and `examples/<example>/devbox.json`):

- `devbox run build:ios` / `devbox run test:ios`: build and run the iOS E2E suite with Detox.
- `devbox run build:android` / `devbox run test:android`: build and run the Android E2E suite with Detox.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

## Release

Release is automated in GitHub Actions. By default `yarn release` won't let you trigger a release from your personal computer.

To trigger a release, go to Actions, select the `Release` workflow, click "Run workflow", and choose a release type (`dry-run`, `beta`, or `production`).

The workflow analyzes the conventional-commit history, bumps versions, builds, and publishes to npm the packages that need it. See [RELEASING.md](/RELEASING.md) for the full release guide (release types, beta/fix-candidate flow, and version syncing).

The CI/CD is automated using [semantic-release](https://github.com/semantic-release/semantic-release) and [multi-semantic-release](https://github.com/qiwi/multi-semantic-release).
