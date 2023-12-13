module.exports = {
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits' },
    ],
    '@semantic-release/changelog',
    [
      'semantic-release-yarn',
      {
        npmPublish: false,
        tarballDir: "dist"
      }
    ],
    // '@semantic-release/github',
    // '@semantic-release/git',
  ],
  debug: true,
};
