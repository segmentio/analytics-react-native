# Contributing

If you would like to contribute code to `analytics-react-native` you can do so through
GitHub by forking the repository and sending a pull request.

When submitting code, please make every effort to follow existing conventions
and style in order to keep the code as readable as possible. Please also make
sure your code runs by [building](#building) and [testing](#testing).

## Style Guide

We use [prettier](https://www.github.com/prettier/prettier) to format our code, and [commitzen](http://commitizen.github.io/cz-cli/) to format commits.

## Building an integration

To build an integration you'll first need to integrate it using the native Analytics SDK, here's a documentation to do so [for iOS](https://github.com/segmentio/analytics-ios/blob/master/CONTRIBUTING.md) or [for Android](https://github.com/segmentio/analytics-android/blob/master/CONTRIBUTING.md).
When your integration is ready you'll need to add it to [`integrations.yml`](https://github.com/segmentio/analytics-react-native/blob/develop/packages/integrations/integrations.yml) and check it works by [building](#building) and [testing](#testing).

## Environment

This project is a Yarn workspace, npm is not supported. To install dependencies run :

```bash
$ yarn
```

### Building

- Build the `@segment/react-native` package:
  ```bash
  $ yarn core build
  ```
- Build the `@segment/react-native-*` packages:
  ```bash
  $ yarn integrations build
  ```
- Build the test application for iOS and Android:
  ```bash
  $ yarn test-app build
  ```
- Launch these three steps one by one:
  ```bash
  $ yarn build
  ```

## Testing

```bash
$ yarn test
```

### End-to-end testing

End-to-end testing is done using [Detox](https://github.com/wix/Detox).

These tests are primarily built to be run on CI. The following instructions describe how to run them locally.

Tested on Mac only.

#### iOS

First, install your dependencies as described in [Step 1: Install dependencies](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md#step-1-install-dependencies).

```bash
yarn # install project dependencies
yarn build # build project and integrations
cd packages/test-app
yarn test:ios:cocoapods # or test:ios:vanilla
```

For subsequent runs, you may need to do `rm -rf project && ./generate.sh` before running the test command.

### Android

Set up an Android emulator locally. The easiest way to do this is to install and launch Android Studio, and [manage your virtual devices](https://developer.android.com/studio/run/managing-avds) through the UI.

Check you have at least one emulator installed with `emulator -list-avds`. Now open `./packages/test-app/package.json` and ensure that the `name` under `"android.emu.release"` is one of the emulators in your list (change it if not, but do not commit this change).

```bash
yarn # install project dependencies
yarn build # build project and integrations
cd packages/test-app
SEGMENT_WRITE_TOKEN=test yarn test:android
```

**Note:** A non-empty value of SEGMENT_WRITE_TOKEN is required for Android (but not iOS), because the native library will do a not null check for it and your application will crash.

**Note:** you can also run the emulator in debug mode, but you'll have to start the packager manually. Assuming you've already installed dependencies and built the project:

Build the android project and start the packager:

```bash
cd packages/test-app
SEGMENT_WRITE_TOKEN=test detox build -c android.emu.debug
cd project
yarn start
```

In a new terminal window, run:

```bash
detox test -c android.emu.debug
```

### Architecture

- `packages/core`: the `@segment/analytics-react-native` module
  - `docs`: the generated TypeScript documentation, commited using a `lint-staged` hook
  - `src`: JavaScript module
  - `ios`: iOS native module
  - `android`: Android native module
- `packages/integrations`:
  - `integrations.yml`: the unique source of truth for supported integrations
  - `src`: a set of generators using `integrations.yml`
    - `gen-integrations.ts`: generates `@segment/react-native-*` packages in `build/`
    - `gen-readme.ts`: updates `README.md` [Integrations](README.md#integrations) section
  - `test-app`:
    - `project`: the generated react-native test-app root
