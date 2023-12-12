const baseConfig = require('@segment/analytics-rn-shared/jest.config.base');

module.exports = {
  ...baseConfig,
  roots: [...baseConfig.roots, '<rootDir>/src']
};
