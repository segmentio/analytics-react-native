module.exports = {
  preset: 'react-native',
  setupFiles: ['./packages/core/src/__tests__/__helpers__/setup.js'],
  testPathIgnorePatterns: ['./packages/core/src/__tests__/__helpers__/'],
  modulePathIgnorePatterns: ['/lib/'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
