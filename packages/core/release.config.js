const { plugins } = require('../../release.config.js');

module.exports = {
  extends: ['../../release.config.js'],
  // Runs right after @semantic-release/npm's prepare (version bump) and before its publish.
  plugins: plugins.flatMap((plugin) =>
    [].concat(plugin)[0] === '@semantic-release/npm'
      ? [plugin, './release-stamp-version.js']
      : [plugin]
  ),
};
