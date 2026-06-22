/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/config/swagger.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 8,
      lines: 25,
      statements: 25,
    },
  },
};
