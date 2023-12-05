const { rootMap } = require('./workspace') // Load the linked data

module.exports = {
  dependencies: {
    ...rootMap
  },
};
