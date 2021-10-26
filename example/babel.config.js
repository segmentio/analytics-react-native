const path = require('path');

const pak = require('../packages/core/package.json');
const pakFirebase = require('../packages/plugins/plugin-firebase/package.json');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          [pak.name]: path.join(
            __dirname,
            '..',
            'packages',
            'core',
            pak.source
          ),
          [pakFirebase.name]: path.join(
            __dirname,
            '..',
            'packages',
            'plugins',
            'plugin-firebase',
            pak.source
          ),
          react: path.join(__dirname, 'node_modules', 'react'),
        },
      },
    ],
  ],
};
