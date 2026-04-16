# Prerelease Setup Guide

## Overview

This repository uses branch-specific prerelease channels for publishing packages from feature branches and fix branches. Each branch category gets its own npm dist-tag:

- `fix/*` → `2.22.1-fix.1` (dist-tag: `fix`)
- `feat/*` → `2.22.1-feat.1` (dist-tag: `feat`)
- `beta` → `2.22.1-beta.1` (dist-tag: `beta`)

Note: `chore/*` branches do not publish - they're for internal changes not meant for client distribution.

## GitHub Environment Setup

### 1. Create the Publish-Prerelease Environment

1. Go to: https://github.com/segmentio/analytics-react-native/settings/environments
2. Click "New environment"
3. Name: `Publish-Prerelease`
4. Click "Configure environment"

### 2. Configure Branch Protection (Optional)

Since semantic-release now controls which branches can publish based on `release.config.js`, you can either:

**Option A: Allow any branch** (Recommended)
- Leave "Deployment branches and tags" set to "All branches"
- semantic-release will handle branch filtering

**Option B: Restrict to specific patterns**
- Select "Protected branches and tags only"
- Add patterns: `fix/*`, `feat/*`, `beta`

### 3. Add Required Reviewers (Optional)

If you want manual approval before publishing:
- Enable "Required reviewers"
- Add reviewers from your team
- Set wait timer if desired

### 4. Add Environment Secrets

The environment needs access to npm for publishing. You have two options:

#### Option A: npm Token (Traditional)

1. Generate an npm automation token:
   ```bash
   npm login
   npm token create --type=automation
   ```

2. Add the token as a secret:
   - Click "Add secret"
   - Name: `NPM_TOKEN`
   - Value: `npm_xxx...` (your automation token)

3. Update the workflow to use the token:
   ```yaml
   - name: Release (prerelease)
     run: |
       BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
       devbox run -e GITHUB_REF=refs/heads/$BRANCH_NAME release
     env:
       GH_TOKEN: ${{ github.token }}
       NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

#### Option B: npm Provenance with OIDC (Recommended)

The current setup uses npm provenance with OIDC, which doesn't require storing an NPM_TOKEN. This is more secure because:
- No long-lived tokens to manage
- Automatic provenance attestation
- Built-in supply chain security

**No additional npm setup needed!** The workflow already has:
- `id-token: write` permission
- `@semantic-release/npm` with `provenance: true`

npm will automatically authenticate using GitHub's OIDC provider.

**Requirements:**
- The `@segment` npm organization must have publishing from GitHub Actions enabled
- The package must be public or the org must be on a paid npm plan

To verify OIDC is configured:
1. Go to: https://www.npmjs.com/settings/segment/packages
2. Check that "Publish" permissions include GitHub Actions
3. If not, contact npm org admin to enable it

## Testing the Setup

### 1. Test with Dry Run

```bash
# From your feature branch
gh workflow run release.yml -f type=dry-run
```

This will:
- Run CI checks
- Simulate the release process
- Show what would be published (without actually publishing)

### 2. Publish a Prerelease

```bash
# From a fix/feat/chore branch
gh workflow run release.yml -f type=beta
```

This will:
- Run CI checks
- Run E2E tests
- Publish to npm with the appropriate dist-tag
- Create a GitHub release

### 3. Verify on npm

```bash
# Check dist-tags
npm dist-tag ls @segment/analytics-react-native

# Should show something like:
# latest: 2.22.0
# beta: 2.22.1-beta.1
# fix: 2.22.1-fix.1
# feat: 2.22.1-feat.2
```

### 4. Install a Prerelease

```bash
# Install a specific prerelease channel
npm install @segment/analytics-react-native@fix
npm install @segment/analytics-react-native@feat

# Or a specific version
npm install @segment/analytics-react-native@2.22.1-fix.1
```

## Troubleshooting

### "semantic-release says no version will be published"

Check that your branch name matches one of the configured patterns in `release.config.js`:
- `fix/*` - bug fixes for client distribution
- `feat/*` - new features for client distribution  
- `beta` - explicit beta channel
- `master` - production releases
- Version branches like `1.x` or `1.2.x` - maintenance releases

Note: `chore/*` branches intentionally don't publish as they're for internal changes.

### "npm publish failed with 403"

If using Option A (npm token):
- Verify `NPM_TOKEN` is set in the environment secrets
- Check the token has publish permissions: `npm token list`
- Ensure the token hasn't expired

If using Option B (OIDC):
- Verify the GitHub Actions OIDC provider is configured in npm org settings
- Check that `id-token: write` permission is set in the workflow
- Ensure `provenance: true` is set in semantic-release npm plugin config

### "Environment branch policy blocking publish"

If you set "Protected branches only" in the environment:
- Make sure your branch pattern is added to the protection rules
- Or switch to "All branches" and rely on semantic-release filtering

## How It Works

1. **Branch Detection**: When you run the release workflow with `type=beta`, the workflow reads your current branch name
2. **semantic-release Matching**: semantic-release checks if your branch matches any pattern in `release.config.js`
3. **Version Calculation**: Based on conventional commits, it determines the next version and appends the prerelease suffix
4. **npm Publish**: Publishes to npm with the corresponding dist-tag
5. **GitHub Release**: Creates a GitHub release (marked as prerelease)

## Migrating from Old "Beta" Setup

The old setup used `{ name: '*', prerelease: 'beta' }` which made ALL non-master branches publish as "beta". This was confusing because:
- Fix branches weren't actually beta releases
- You couldn't have multiple prerelease channels
- The GitHub environment was called "Publish-Beta" but handled all prereleases

The new setup is more explicit and semantically correct:
- Each branch category gets its own channel
- The environment is now "Publish-Prerelease" to reflect its broader scope
- "beta" is now an explicit channel for the `beta` branch only
