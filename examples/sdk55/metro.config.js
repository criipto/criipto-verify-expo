// Fixture metro config — watches the repo root so the local @criipto/verify-expo
// package (installed via a relative file: dep) is picked up without `npm link`.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, "../..")];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    return { type: "sourceFile", filePath: require.resolve("react") };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
