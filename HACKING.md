
## Environment

This project is a Yarn workspace, npm is not supported. To install dependencies run : 

```bash
$ yarn
```

### Useful commands

- Build everything:
  ```bash
  $ yarn build
  ```
- Build the `@segment/react-native` package:
  ```bash
  $ yarn core build
  ```

### Architecture

- `packages/core`: the `@segment/react-native` module
  - `docs`: the generated TypeScript documentation, commited using a `lint-staged` hook
- `packages/integration-build`: 
  - `integrations.yml`: the unique source of truth for supported integrations
  - `generators`: a set of generators using `integrations.yml`
    - `gen-integrations.js`: generates `@segment/react-native-*` packages in `build/`
    - `gen-readme.js`: updates `README.md` [Integrations](README.md#integrations) section
  - `test-app`
