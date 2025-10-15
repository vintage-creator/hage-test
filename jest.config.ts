// jest.config.ts
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test', '<rootDir>/src'],
    transform: { '^.+\\.ts$': 'ts-jest' },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.spec.json'
      }
    }
  };
  
  