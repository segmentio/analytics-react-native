module.exports = {
  branches: ['master', { name: 'beta', prerelease: true }],
  tagFormat: '${name}-v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits' },
    ],
    ['@semantic-release/npm', { npmPublish: true, provenance: true }],
    ['@semantic-release/github', { successComment: false }],
  ],
  debug: true,
};
