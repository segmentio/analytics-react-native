# How to add a new example app

## Create the Example app with the RN CLI

`npx react-native init ExampleAppName`

If you bump into this issue: [Couldn't find template.config.js file inside "react-native" template. Please make sure the template is valid · Issue #1637 · react-native-community/cli · GitHub](https://github.com/react-native-community/cli/issues/1637)

Then use
`yarn dlx react-native init AnalyticsReactNativeE2E --npm`

or just add `--npm` to the `npx` command above

## Link Workspace Packages

> Note: This is only required if you want to link the packages from the workspace for e2e testing or active development with hot reloading.
>
> If you're only using the app as an example or for on-demand testing strongly consider using symlinked packages through [npm-link](https://docs.npmjs.com/cli/v6/commands/npm-link)
>
> If the app is meant to be a long term kitchen sink for active development do link packages for easier setup.

We have a helper to grab all the data to link the packages to metro, native modules and babel if required. This saves you from having to do all the manual module resolution in 3 different files.

That said you still have to setup some files to make it work.

First create a file (e.g. `workspace.js`, but naming doesn't matter) to initialize the helper. The `getLinkedData` function receives an array of relative paths (from the `packages` directory) to link. e.g. `core`, `sovran` or for specific plugins `plugins/plugin-idfa`.

_NOTE: These are NOT the module names. Nor only the directory name, but the relative path. Be careful with nested packages_

```js
const { getLinkedData } = require('../linkHelper');

module.exports = {
  ...getLinkedData(['core', 'sovran']),
};
```

We will export the returned values to use in our 3 main files:

`react-native.config.js` -> Where native modules configuration gets defined. _This file might not exist in your new RN App by default_

```js
const { rootMap } = require('./workspace'); // Load the linked data

module.exports = {
  dependencies: {
    // Local packages need to be referenced here to be linked to the app
    // This is not required in a standalone production app
    ...rootMap,
  },
};
```

`metro.config.js` -> Where the bundle server is configured, we use this to prevent duplicate peer dependency loading

```js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');
//
// ADDED PART: Load the peer dependency data
const { peerDeps } = require('./workspace');
const modules = [...peerDeps];
// ENDS
//
const root = path.resolve(__dirname, '..', '..');

const defaultSourceExts =
  require('metro-config/src/defaults/defaults').sourceExts;

const config = {
  projectRoot: __dirname,
  watchFolders: [root],

  resolver: {
    unstable_enableSymlinks: true,
    //
    // ADDED PART: Modify the resolver config to blacklist and manually load the peer dependencies
    //
    // We need to make sure that only one version is loaded for peerDependencies
    // So we block them at the root, and alias them to the versions in example's node_modules
    blacklistRE: exclusionList(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
    // ENDS
    //

    sourceExts: defaultSourceExts,
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

`babel.config.js` -> This is only required for Jest tests. If you are not doing E2E Detox or Unit testing you can skip this.

You will also need to install the `babel-plugin-module-resolver` dependency if it isn't there yet.

```js
//
// ADDED
const { srcMap } = require('./workspace');
// END
//

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  //
  // ADDED
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: srcMap,
      },
    ],
  ],
  // END
  //
};
```
