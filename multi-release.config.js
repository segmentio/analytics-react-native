module.exports = {
  tagFormat: "${name}-v${version}",
  deps: {
    bump: 'satisfy', // Do not trigger a release for every package if the only change is a minor/patch upgrade of dependencies
    prefix: '^' // by default all semvers will get set to ^major version
  }
}