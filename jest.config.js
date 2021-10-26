module.exports = {
  preset: 'react-native',
  setupFiles: ['./packages/core/src/__tests__/__helpers__/setup.js'],
  testPathIgnorePatterns: ['./packages/core/src/__tests__/__helpers__/'],
  modulePathIgnorePatterns: ['/lib/'],
};
