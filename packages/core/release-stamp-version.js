const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STAMPED_FILES = [
  'src/info.ts',
  'lib/commonjs/info.js',
  'lib/module/info.js',
];

// Local semantic-release plugin: rebuilds core with the version semantic-release just computed, so the published lib/ reports it.
async function prepare(_pluginConfig, { cwd, nextRelease, logger }) {
  const { version } = nextRelease;
  logger.log(`Stamping ${version} into libraryInfo and rebuilding`);

  execFileSync('yarn', ['build'], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, SEGMENT_LIBRARY_VERSION: version },
  });

  const quoted = new RegExp(`['"]${version.replace(/[.+]/g, '\\$&')}['"]`);
  for (const file of STAMPED_FILES) {
    const contents = fs.readFileSync(path.join(cwd, file), 'utf8');
    if (!quoted.test(contents)) {
      throw new Error(
        `${file} is not stamped with ${version}; refusing to publish`
      );
    }
  }
}

module.exports = { prepare };
