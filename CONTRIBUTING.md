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
