const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This is an npm workspaces monorepo: react and react-native are hoisted to
// the root node_modules and pinned there by root package.json's
// dependencies + overrides. Expo's default config (getDefaultConfig above)
// already configures Metro's monorepo lookup (watchFolders, nodeModulesPaths)
// to find them, so no resolver overrides are needed here. A single copy of
// react and react-native ends up in the bundle — verified in phase 01.3 by
// the source-map single-copy check recorded in 01.3-03-SUMMARY.md.
//
// The shared workspace package @cortege/ibp-domain (packages/ibp-domain) is
// resolved from source through its `react-native` field (Metro's
// resolverMainFields put it first) and Expo's automatic monorepo support,
// which watches every root workspace. No config change and no build step are
// needed; only Node at runtime (the API) uses its built dist (phase 01.8).

module.exports = config;
