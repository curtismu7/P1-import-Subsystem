export default {
  entries: ['src/client/app.js'],
  transform: [
    [
      'babelify',
      {
        configFile: './config/babel.config.json',
        presets: [
          '@babel/preset-env'
        ],
        plugins: [
          '@babel/plugin-transform-runtime'
        ]
      }
    ]
  ],
  debug: process.env.NODE_ENV === 'development',
  standalone: 'PingOneImportApp',
  browserField: false,
  builtins: false,
  commondir: false,
  insertGlobalVars: {
    process: undefined,
    global: undefined,
    'Buffer.isBuffer': undefined,
    Buffer: undefined
  },
  detectGlobals: false
};
