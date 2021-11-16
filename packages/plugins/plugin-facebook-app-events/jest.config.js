module.exports = {
  preset: 'react-native',
  setupFiles: ['./src/__tests__/__helpers__/setup.js'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/__helpers__/'],
  modulePathIgnorePatterns: ['/lib/'],
};
