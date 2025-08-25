/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // hast just needs to mapped to something
    hast: "<rootDir>/package.json",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
};
