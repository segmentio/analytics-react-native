module.exports = {
  extends: [
    '@react-native-community',
    'prettier',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        quoteProps: 'consistent',
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        useTabs: false,
      },
    ],
    "no-void": [
      "error", 
      { "allowAsStatement": true }
    ],
    "@typescript-eslint/restrict-template-expressions": ["warn", { 
      allowNumber: true,
      allowBoolean: true,
      allowAny: true,
      allowNullish: true
     }],
     "@typescript-eslint/no-explicit-any": "error",
     "@typescript-eslint/strict-boolean-expressions": "error"
  },
  overrides: [
    // Detox tests
    {
      files: ['*.e2e.js'],
      env: {
        jest: true,
      },
    },
    // Jest 
    {
      files: ['**/__tests__/**', '**/__mocks__/**', '**/__helpers__/**'],
      plugins: ['jest'],
      env: {
        jest: true,
      },
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/no-unused-vars": ["error"],
        "@typescript-eslint/unbound-method": "warn",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/ban-ts-comment": "warn"
      },
    },
  ],
  parserOptions: {
    project: ['./tsconfig.linter.json'],
  },
  ignorePatterns: [".eslintrc.js"]
};
