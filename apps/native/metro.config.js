// const { getDefaultConfig } = require("expo/metro-config");
// const { withUniwindConfig } = require("uniwind/metro");

// /** @type {import('expo/metro-config').MetroConfig} */
// const config = getDefaultConfig(__dirname);

// const uniwindConfig = withUniwindConfig(config, {
//   cssEntryFile: "./global.css",
//   dtsFile: "./uniwind-types.d.ts",
// });

// module.exports = uniwindConfig;

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// ✅ Config monorepo pnpm
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// ✅ Exclure les dossiers inutiles
config.resolver.blockList = [
    /.*\/apps\/web\/.*/,
    /.*\/.git\/.*/,
    /.*\/\.turbo\/.*/,
];

const uniwindConfig = withUniwindConfig(config, {
    cssEntryFile: "./global.css",
    dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;