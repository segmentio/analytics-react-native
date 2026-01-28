/**
 * Helper module for retrieving linked data for packages.
 * @module linkHelper
 */
const path = require('path');
const basePath = path.join(__dirname, '..', 'packages');

module.exports = {
  /**
   * Retrieves linked data for the specified packages.
   *
   * @param {string[]} packagesToLink - An array of relative paths to the packages directory to link.
   * @returns {Object} - An object containing the linked data.
   * @property {Object} srcMap - A map of package names to their corresponding source paths.
   * @property {Object} rootMap - A map of package names to their corresponding root paths.
   * @property {Set} peerDeps - A set of unique peer dependencies names.
   *
   * @example
   * const packagesToLink = ['core', 'sovran', 'plugins/plugin-idfa'];
   * const linkedData = getLinkedData(packagesToLink);
   */
  getLinkedData(packagesToLink) {
    let srcMap = {};
    let rootMap = {};
    let peerDeps = new Set();

    for (let relativePath of packagesToLink) {
      const absPath = path.join(basePath, relativePath);
      const packageJsonPath = path.join(absPath, 'package.json');

      const package = require(packageJsonPath);

      srcMap[package.name] = path.join(absPath, package.source);
      rootMap[package.name] = {
        root: absPath,
      };
      Object.keys(package.peerDependencies).forEach((dep) => {
        peerDeps.add(dep);
      });
    }

    return { srcMap, rootMap, peerDeps };
  },
};
