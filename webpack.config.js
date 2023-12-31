const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: '3 toroids',
      template: './src/index.html', // Path to your existing template file
    }),
    new HtmlWebpackPlugin({
      title: 'Toroid',
      filename: 'toroid.html',  // Output file name
      template: './src/toroid.html', // Path to your new template file
    }),
    new LicenseWebpackPlugin({
      // options go here, e.g.:
      perChunkOutput: false, // set this to true if you want one file per chunk
      outputFilename: '[name].licenses.txt',
    }),
  ],
};
