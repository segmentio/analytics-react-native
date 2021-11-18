const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>'],
  setupFiles: ['../../core/src/__tests__/__helpers__/setup.js'],
  testPathIgnorePatterns: ['.../../core/src/__tests__/__helpers__/'],
  modulePathIgnorePatterns: ['/lib/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};
