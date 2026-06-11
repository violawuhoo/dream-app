module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@testing-library|nativewind)",
  ],
  moduleNameMapper: {
    "^expo-secure-store$": "<rootDir>/src/__mocks__/expo-secure-store.js",
    "^@supabase/supabase-js$": "<rootDir>/src/__mocks__/supabase-js.js",
    "^react-native-reanimated$": "<rootDir>/src/__mocks__/react-native-reanimated.js",
    "^@react-native-async-storage/async-storage$": "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
  setupFiles: ["<rootDir>/src/__tests__/setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "src/__tests__/setup.js", "/e2e/"],
};
