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

// Add current branch explicitly with a sanitized (semver-safe) prerelease identifier
if (!isStableBranch && !isBetaBranch) {
  branches.push({ name: currentBranch, prerelease });
}

module.exports = {
  branches,
  tagFormat: '${name}-v${version}',
  deps: {
    bump: 'satisfy', // Do not trigger a release for every package if the only change is a minor/patch upgrade of dependencies
    prefix: '^', // by default all semvers will get set to ^major version
  },
  ignorePrivate: true,
  sequentialInit: true,
  sequentialPrepare: true,
};
