const { rootMap } = require('./workspace') // Load the linked data

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    }
  },
  dependencies: {
    // Local packages need to be referenced here to be linked to the app
    // This is not required in a standalone production app
    ...rootMap
  },
};
