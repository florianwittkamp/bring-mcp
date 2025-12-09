module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    // Handle module path aliases if you have them in tsconfig.json
    // For example: '^@/(.*)$': '<rootDir>/src/$1'
    // Need to handle .js extension for ES modules if src/index.ts imports like './bringClient.js'
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'cjs', 'mjs'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
