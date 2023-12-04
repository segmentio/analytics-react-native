const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');
// Workspace packages used by the example app
// This is not required in a standalone production app
const corePackage = require('../../packages/core/package.json');
const sovranPackage = require('../../packages/sovran/package.json');

const root = path.resolve(__dirname, '..', '..');
const modules = Object.keys({ 
  ...corePackage.peerDependencies, 
  ...sovranPackage.peerDependencies 
});

const defaultSourceExts =
  require('metro-config/src/defaults/defaults').sourceExts;

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  watchFolders: [root],

  // We need to make sure that only one version is loaded for peerDependencies
  // So we block them at the root, and alias them to the versions in example's node_modules
  resolver: {
    unstable_enableSymlinks: true,
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

    // Used for E2E tests: Replaces files with the extensions specified if any. e.g. RN_SRC_EXT=e2e.mock.ts,e2e.mock.js
    sourceExts: process.env.RN_SRC_EXT
      ? process.env.RN_SRC_EXT.split(',').concat(defaultSourceExts)
      : defaultSourceExts,
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
