const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig');

Object.entries(compilerOptions.paths).map(([key, value]) => {
  compilerOptions.paths[key] = value.map((p) =>
    path.resolve(__dirname, '../../', p)
  );
});

module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['/lib/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)', // Anything under __tests__
    '**/?(*.)+(spec|test).[jt]s?(x)', // Test files with .spect.ts(x) or .test.ts(x)
    '!**/__helpers__/**', // Do not run helpers as tests
    '!**/__mocks__/**', // Do not run mocks as tests
  ],
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!@react-native|react-native)',
    'node_modules/(?!@react-native|react-native)',
  ],
  roots: [
    path.resolve(__dirname, '__mocks__'), // Include shared mocks
    '<rootDir>', // Include the source code of the current package
  ],
  setupFiles: [path.resolve(__dirname, 'src/setup.ts')],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};
