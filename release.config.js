const changelogFile = 'CHANGELOG.md';

module.exports = {
  branches: [
    'master',
    { name: 'beta', prerelease: true },
  ],
  tagFormat: '${name}-v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/changelog', { changelogFile }],
    ['@semantic-release/npm', { npmPublish: true }],
    ['@semantic-release/github', { successComment: false }],
    ['@semantic-release/git', { assets: [changelogFile, 'package.json'] }],
  ],
  debug: true,
};
