/**
 * Metro configuration for React Native workspace
 * This config is a fallback when Metro resolves to the workspace root.
 * It won't work properly, but provides a clearer error message.
 */

const path = require('path');

module.exports = {
  projectRoot: __dirname,
  watchFolders: [__dirname],
  resolver: {
    sourceExts: ['js', 'json', 'ts', 'tsx'],
  },
};
