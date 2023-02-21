const { compilerOptions } = require('./tsconfig');

module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>'],
  modulePathIgnorePatterns: ['/lib/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: [compilerOptions.baseUrl],
};
