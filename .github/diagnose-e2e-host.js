/**
 * TEMPORARY diagnostic - remove along with its workflow step.
 *
 * Determines why the e2e suite sees zero requests in CI but passes locally.
 *
 * sdk-e2e-tests' MockServer binds 127.0.0.1 explicitly, while the tests pass
 * the SDK `http://localhost:PORT`. If Linux resolves localhost to ::1 first,
 * every request is refused and the server records nothing - matching the
 * observed failures exactly. This starts one server bound the same way the
 * harness binds it, then drives the real CLI at both spellings of it.
 *
 * Reads CLI_PATH from the environment.
 */

const http = require('http');
const dns = require('dns');
const { execFile } = require('child_process');

const CLI_PATH = process.env.CLI_PATH;

function runCLI(apiHost) {
  return new Promise((resolve) => {
    const input = JSON.stringify({
      writeKey: 'diagnostic-key',
      apiHost,
      cdnHost: apiHost,
      sequences: [
        {
          delayMs: 0,
          events: [{ type: 'track', event: 'Diag', userId: 'u1' }],
        },
      ],
      config: { flushAt: 1, flushInterval: 1, timeout: 15 },
    });
    execFile(
      'node',
      [CLI_PATH, '--input', input],
      { timeout: 60000 },
      (err, stdout, stderr) => {
        resolve({
          err: err ? err.code ?? err.signal ?? err.message : null,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }
    );
  });
}

async function main() {
  console.log('=== DNS resolution of localhost ===');
  try {
    const all = await dns.promises.lookup('localhost', { all: true });
    for (const a of all) {
      console.log(`  ${a.address}  (IPv${a.family})`);
    }
    console.log(`  -> first result wins: ${all[0]?.address}`);
  } catch (e) {
    console.log(`  lookup failed: ${e.message}`);
  }

  console.log('\n=== Node / platform ===');
  console.log(`  node ${process.version} on ${process.platform}`);
  // Happy Eyeballs: when enabled, a ::1-first resolution can still fall back
  // to 127.0.0.1, which would rule this hypothesis out.
  const autoSelect =
    typeof require('net').getDefaultAutoSelectFamily === 'function'
      ? require('net').getDefaultAutoSelectFamily()
      : 'n/a';
  console.log(`  autoSelectFamily default: ${autoSelect}`);

  // Bind exactly the way sdk-e2e-tests' MockServer does.
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push(req.url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        req.url.includes('settings')
          ? '{"integrations":{"Segment.io":{"apiKey":"k"}}}'
          : '{}'
      );
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`\n=== MockServer bound to 127.0.0.1:${port} ===`);

  for (const host of [`http://localhost:${port}`, `http://127.0.0.1:${port}`]) {
    received.length = 0;
    console.log(`\n--- CLI against ${host} ---`);
    const r = await runCLI(host);
    console.log(`  exit/err : ${r.err}`);
    console.log(`  --- full stdout ---\n${r.stdout || '(empty)'}`);
    console.log(`  --- full stderr ---\n${r.stderr || '(empty)'}`);
    console.log(
      `  requests received: ${received.length}  ${JSON.stringify(received)}`
    );
    console.log(
      `  VERDICT: ${received.length > 0 ? 'REACHED SERVER' : 'ZERO REQUESTS'}`
    );
  }

  server.close();

  // The first run showed both spellings falling back to production Segment
  // endpoints, meaning getURL() threw - but without its own "Invalid URL has
  // been passed" log, which should have preceded the fallback. Probe the real
  // helpers directly to see what they actually return here.
  console.log('\n=== Direct probe of core getURL/validateURL ===');
  try {
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    const repoRoot = path.resolve(__dirname, '..');
    const esbuild = require(path.join(
      repoRoot,
      'e2e-cli/node_modules/esbuild'
    ));
    const stubs = path.join(repoRoot, 'e2e-cli/src/stubs');
    const out = path.join(os.tmpdir(), 'core-url-probe.js');

    esbuild.buildSync({
      stdin: {
        contents: `export { getURL, validateURL } from './packages/core/src/util';`,
        resolveDir: repoRoot,
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: out,
      alias: {
        'react-native': path.join(stubs, 'react-native.ts'),
        '@segment/sovran-react-native': path.join(stubs, 'sovran.ts'),
        'react-native-get-random-values': path.join(
          stubs,
          'react-native-get-random-values.ts'
        ),
      },
      external: [
        'uuid',
        'deepmerge',
        '@react-native-async-storage/async-storage',
      ],
      logLevel: 'silent',
    });

    const { getURL, validateURL } = require(out);
    const cases = [
      [`http://localhost:${port}`, '/b'],
      [`http://127.0.0.1:${port}`, '/b'],
      [`http://localhost:${port}`, '/projects/diagnostic-key/settings'],
      ['http://localhost:12345', '/b'],
    ];
    for (const [host, p] of cases) {
      const joined = `${host}${p}`;
      let result;
      try {
        result = `getURL -> ${getURL(host, p)}`;
      } catch (e) {
        result = `getURL THREW: ${e.message}`;
      }
      console.log(`  validateURL(${joined}) = ${validateURL(joined)}`);
      console.log(`    ${result}`);
    }
    fs.unlinkSync(out);
  } catch (e) {
    console.log(`  probe failed to build/run: ${e.message}`);
  }
}

main();
