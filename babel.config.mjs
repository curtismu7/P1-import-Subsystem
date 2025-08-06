/**
 * Babel configuration as an ES module
 * Configured to properly support ESM in both Node.js and Jest environments
 * Version: 7.0.2.4
 * 
 * This configuration provides bulletproof ESM support for Jest testing
 */
export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
      // Use false for ESM support, we'll handle modules natively
      modules: false,
      useBuiltIns: 'usage',
      corejs: 3,
    }],
    '@babel/preset-react',
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object',
  ],
  sourceType: 'module',
  // Add environment-specific settings
  env: {
    test: {
      // For Jest tests, we need to use commonjs modules for .js files
      // but preserve ESM for .mjs files
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: false // Always preserve ESM for tests
        }]
      ],
      plugins: [
        // Add any test-specific plugins here (none needed for ESM)
      ]
    },
    production: {
      // Production optimizations
      presets: [
        ['minify', { builtIns: false }]
      ]
    }
  }
};
