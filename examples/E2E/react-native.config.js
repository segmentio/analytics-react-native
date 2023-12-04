const path = require('path');
const corePackage = require('../../packages/core/package.json');
const sovranPackage = require('../../packages/sovran/package.json');

const basePath = path.join(__dirname, '..', '..', 'packages');

module.exports = {
  dependencies: {
    // Local packages need to be referenced here to be linked to the app
    // This is not required in a standalone production app
    [corePackage.name]: {
      root: path.join(basePath, 'core'),
    },
    [sovranPackage.name]: {
      root: path.join(basePath, 'sovran'),
    },
  },
};
