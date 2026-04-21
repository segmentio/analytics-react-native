module.exports = {
  branches: [
    'master',
    { name: '+([0-9])?(.{+([0-9]),x}).x', prerelease: true }, // support branches (e.g., 1.x, 1.2.x)
    { name: 'beta', prerelease: true }, // explicit beta channel
    { name: 'fix/*', prerelease: true }, // fix branches → x.x.x-fix.N
    { name: 'feat/*', prerelease: true }, // feature branches → x.x.x-feat.N
  ],
  tagFormat: '${name}-v${version}',
  deps: {
    bump: 'satisfy', // Do not trigger a release for every package if the only change is a minor/patch upgrade of dependencies
    prefix: '^', // by default all semvers will get set to ^major version
  },
  ignorePrivate: true,
  sequentialInit: true,
  sequentialPrepare: true,
};
