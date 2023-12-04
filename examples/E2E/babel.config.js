const path = require('path');
// Workspace packages used by the example app
// This is not required in a standalone production app
const corePackage = require('../../packages/core/package.json');
const sovranPackage = require('../../packages/sovran/package.json');

const basePath = path.join(__dirname, '..', '..', 'packages');


module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: {
          [corePackage.name]: path.join(basePath, 'core', corePackage.source),
          [sovranPackage.name]: path.join(basePath, 'sovran', sovranPackage.source),
        },
      },
    ],
  ],
};
