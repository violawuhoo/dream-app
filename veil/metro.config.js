const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// @clerk/clerk-react (pulled in transitively by @clerk/clerk-expo) tries to
// import react-dom, which doesn't exist in React Native. Stub it out so the
// bundler doesn't fail during release builds.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
