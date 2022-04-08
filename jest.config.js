const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: [
    './packages/core/src/__tests__/__helpers__/',
    './packages/plugins/plugin-mixpanel/src/methods/__tests__/__helpers__',
  ],
  modulePathIgnorePatterns: ['/lib/'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};
