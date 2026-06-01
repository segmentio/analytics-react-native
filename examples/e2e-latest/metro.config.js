const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');
const escape = require('escape-string-regexp');
const {peerDeps} = require('./workspace');
const modules = [...peerDeps];
const root = path.resolve(__dirname, '..', '..');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  projectRoot: __dirname,
  watchFolders: [root],

  resolver: {
    unstable_enableSymlinks: true,
    blockList: new RegExp(
      modules
        .map(m => `^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
        .join('|'),
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
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

module.exports = mergeConfig(defaultConfig, config);
