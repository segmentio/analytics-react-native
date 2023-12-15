module.exports = {
  plugins: [
    [
      '@semantic-release/commit-analyzer', 
      { preset: 'conventionalcommits' }
    ],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits' },
    ],
    '@semantic-release/changelog',
    'semantic-release-yarn',
    '@semantic-release/github',
    '@semantic-release/git',
  ],
};
