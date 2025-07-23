export default {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: false
    }],
    '@babel/preset-react'
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object'
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-export-default-from',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object'
      ]
    }
  }
};