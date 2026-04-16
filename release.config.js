module.exports = {
  branches: [
    'master',
    { name: '+([0-9])?(.{+([0-9]),x}).x', prerelease: true }, // support branches (e.g., 1.x, 1.2.x)
    { name: 'beta', prerelease: 'beta' }, // explicit beta channel
    { name: 'fix/*', prerelease: 'fix' }, // fix branches → x.x.x-fix.N
    { name: 'feat/*', prerelease: 'feat' }, // feature branches → x.x.x-feat.N
    { name: 'chore/*', prerelease: 'chore' }, // chore branches → x.x.x-chore.N
  ],
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
