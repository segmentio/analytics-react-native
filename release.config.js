const { execSync } = require('child_process');

// Detect current branch: GITHUB_REF_NAME (Actions) → GITHUB_REF → git
function getCurrentBranch() {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  if (process.env.GITHUB_REF)
    return process.env.GITHUB_REF.replace('refs/heads/', '');
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
}

const currentBranch = getCurrentBranch();

// Sanitize branch name for semver: replace any non-alphanumeric/hyphen char with '-'
const prerelease = currentBranch
  .replace(/[^a-zA-Z0-9-]/g, '-')
  .replace(/^-+|-+$/g, '');

const isStableBranch =
  currentBranch === 'master' || /^\d+(\.\d+)*\.x$/.test(currentBranch);
const isBetaBranch = currentBranch === 'beta';

const branches = [
  'master',
  { name: '+([0-9])?(.{+([0-9]),x}).x', prerelease: true }, // support branches (e.g., 1.x, 1.2.x)
  { name: 'beta', prerelease: 'beta' }, // explicit beta channel
];

// Add current branch explicitly with sanitized (semver-safe) prerelease and dist-tag channel
if (!isStableBranch && !isBetaBranch) {
  branches.push({ name: currentBranch, prerelease, channel: prerelease });
}

module.exports = {
  branches,
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
