const config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  preset: 'ts-jest',
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "\\\\node_modules\\\\",
    "\\\\dist\\\\"
 ],
  //moduleDirectories: ['node_modules', 'src'],
  transform: {
     '^.+\\.{tsx,ts}?$': [ 
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  verbose: true
};

module.exports = config;