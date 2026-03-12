const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const coreDir = path.resolve(__dirname, '../packages/core');
const infoFile = path.join(coreDir, 'src/info.ts');

// Generate info.ts if it doesn't exist (required by context.ts)
if (!fs.existsSync(infoFile)) {
  console.log('Generating packages/core/src/info.ts...');
  execSync('node constants-generator.js', { cwd: coreDir, stdio: 'inherit' });
}

esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, 'src/cli.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.resolve(__dirname, 'dist/cli.js'),
  alias: {
    'react-native': path.resolve(__dirname, 'src/stubs/react-native.ts'),
    '@segment/sovran-react-native': path.resolve(
      __dirname,
      'src/stubs/sovran.ts'
    ),
    'react-native-get-random-values': path.resolve(
      __dirname,
      'src/stubs/react-native-get-random-values.ts'
    ),
  },
  external: ['uuid', 'deepmerge', '@react-native-async-storage/async-storage'],
  logLevel: 'info',
});
