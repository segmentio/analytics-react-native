const fs = require('fs');
const packageJson = require('./package.json');

// The release passes the computed version here because package.json on master is not bumped (see release-stamp-version.js).
const version = process.env.SEGMENT_LIBRARY_VERSION || packageJson.version;

const body = `
export const libraryInfo = {
  name: '${packageJson.name}',
  version: '${version}',
}
`;

fs.writeFileSync('./src/info.ts', body);

console.log(`Configuration file has generated (version ${version})`);
