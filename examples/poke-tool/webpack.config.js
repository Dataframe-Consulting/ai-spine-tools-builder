const path = require('path');
const nodeExternals = require('webpack-node-externals');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

module.exports = {
  mode: isProduction ? 'production' : 'development',
  target: 'node',
  entry: './src/index.ts',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    clean: true
  },

  resolve: {
    extensions: ['.ts', '.js', '.json'],
    modules: ['node_modules', path.resolve(__dirname, 'src')]
  },

  externals: [nodeExternals()],

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment,
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          }
        ]
      },
      {
        test: /\.json$/,
        type: 'json'
      }
    ]
  },

  devtool: isDevelopment ? 'source-map' : false,

  optimization: {
    minimize: isProduction,
    nodeEnv: process.env.NODE_ENV
  },

  stats: {
    errorDetails: true,
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false
  },

  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};