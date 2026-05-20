module.exports = {
  testRunner: {
    args: { $0: "jest", config: "e2e/jest.config.js" },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/Veil.app",
      build:
        "xcodebuild -workspace ios/Veil.xcworkspace -scheme Veil -sdk iphonesimulator -configuration Debug -derivedDataPath ios/build | xcpretty",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/Veil.app",
      build:
        "xcodebuild -workspace ios/Veil.xcworkspace -scheme Veil -sdk iphonesimulator -configuration Release -derivedDataPath ios/build | xcpretty",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 15" },
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
