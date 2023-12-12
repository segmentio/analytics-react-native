const { rootMap } = require('./workspace') // Load the linked data

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true
    }
  },
  dependencies: {
    ...rootMap
  },
}