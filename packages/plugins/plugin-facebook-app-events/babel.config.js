const path = require('path');

const pak = require('../../core/package.json');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          [pak.name]: path.join(__dirname, '..', '..', 'core', pak.source),
        },
      },
    ],
  ],
};
