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

- `packages/core`: the `@segment/react-native` module
  - `docs`: the generated TypeScript documentation, commited using a `lint-staged` hook
  - `src`: JavaScript module
  - `ios`: iOS native module
  - `android`: Android native module
- `packages/integrations`:
  - `integrations.yml`: the unique source of truth for supported integrations
  - `src`: a set of generators using `integrations.yml`
    - `gen-integrations.js`: generates `@segment/react-native-*` packages in `build/`
    - `gen-readme.js`: updates `README.md` [Integrations](README.md#integrations) section
  - `test-app`:
    - `project`: the generated react-native test-app root
