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

To get started with the project, run `yarn bootstrap` in the root directory to install the required dependencies for each package:

```sh
yarn bootstrap
```

While developing, you can run the [example app](/example/) to test your changes.
code
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
yarn typescript
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

The are also end-to-end tests. First you will have to build the app and then run the tests:

```
# Start the server (*note there's a separate e2e command*)
yarn e2e start:e2e

# iOS
yarn e2e e2e:build:ios
yarn e2e e2e:test:ios

# Android
yarn e2e e2e:build:android
yarn e2e e2e:test:android
```

To edit the Objective-C / Swift files, open `example/ios/AnalyticsReactNativeExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > @segment/analytics-react-native`.

To edit the Kotlin files, open `example/android` in Android studio and find the source files at `segmentanalyticsreactnative` under `Android`.

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

The `package.json` file contains various scripts for common tasks:

- `yarn bootstrap`: setup project by installing all dependencies and pods.
- `yarn typescript`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.
- `yarn e2e e2e:build:ios`: builds the e2e app using detox
- `yarn e2e e2e:test:ios`: runs the e2e on a simulator(headless if not ran manually)
- `yarn e2e e2e:build:android`: builds the e2e app using detox
- `yarn e2e e2e:test:android`: runs the e2e on an emulator
- `yarn e2e ios:deeplink`: opens the ios app via deep link (example app must already be installed)
- `yarn e2e android:deeplink`: opens the Android app via deep link (example app must already be installed)

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

## Release

Release is automated in GHA. By default `yarn release` won't let you trigger a release from your personal computer.

To trigger a release go to Actions. Select the `Publish` workflow and trigger a new job.

Automatically the workflow will analyze the commits, bump versions, create changesets, build and release to NPM the packages that need so.

The CI/CD is automated using [semantic-release](https://github.com/semantic-release/semantic-release).
