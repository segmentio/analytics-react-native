const fs = require('fs');
const packageJson = require('./package.json');

const body = `
export const libraryInfo = {
  name: '${packageJson.name}',
  version: '${packageJson.version}',
}
`;

fs.writeFile('./src/info.ts', body, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Configuration file has generated');
});
