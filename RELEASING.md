# Releasing

We automatically publish Github tagged releases from our CI to NPM.

We use [`standard-version`](https://github.com/conventional-changelog/standard-version) to prepare a release. `standard-version` will be automatically installed by running `yarn`.

Depending on the release you're making, you may want to use different flags, e.g.:

- To practice with a dry-run: `yarn core release --dry-run`
- To release a beta: `yarn core release --prerelease beta`
- To release a specific version: `yarn core release --release-as 0.0.1`

You can combine these flags as needed, refer to the `standard-version` documentation for more details.

After preparing the release with the commands above, run `git push --follow-tags origin master` to publish the tag, and the CI will take care of the rest.

Be careful to not run `npm publish` locally as the CI will handle this step. Do not do this even though you might be prompted to run it (you may be prompted with a message like `ℹ Run "git push --follow-tags origin master && npm publish" to publish`).
