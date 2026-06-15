// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const path = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Make the example app work with `npm link @criipto/verify-expo` for local testing
config.watchFolders = [path.resolve(__dirname, "..")];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    // React is installed in the root project as well. However, there can be only one copy of react.
    // So whenever we get a request for react, resolve to the version installed in the example project.
    return {
      type: "sourceFile",
      filePath: require.resolve("react"),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
