module.exports = {
  testRunner: {
    args: { $0: "jest", config: "e2e/jest.config.js" },
    jest: { setupTimeout: 300000 },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/Veil.app",
      build:
        "export PATH=$PATH:/opt/homebrew/bin && pod install --project-directory=ios && xcodebuild -workspace ios/Veil.xcworkspace -scheme Veil -sdk iphonesimulator -configuration Debug -derivedDataPath ios/build -arch arm64 EXCLUDED_ARCHS=x86_64",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/Veil.app",
      build:
        "export PATH=$PATH:/opt/homebrew/bin && pod install --project-directory=ios && xcodebuild -workspace ios/Veil.xcworkspace -scheme Veil -sdk iphonesimulator -configuration Release -derivedDataPath ios/build -arch arm64 EXCLUDED_ARCHS=x86_64",
      launchArgs: {
        // Tell the Detox synchronizer (and EarlGrey beneath it) to ignore
        // long-running LLM streaming and Supabase REST calls so that
        // assertions are not held up waiting for background requests.
        detoxURLBlacklistRegex: '\\(".*supabase\\.co.*",".*api/dream-chat.*",".*api/generate-poster.*",".*clerk.*",".*clerk-telemetry.*"\\)',
      },
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 16 Pro" },
    },
    simulator_se: {
      type: "ios.simulator",
      device: { type: "iPhone SE (3rd generation)" },
    },
  },
  configurations: {
    "ios.sim.debug": { device: "simulator", app: "ios.debug" },
    "ios.sim.release": { device: "simulator", app: "ios.release" },
    "ios.sim.se": { device: "simulator_se", app: "ios.debug" },
  },
};
