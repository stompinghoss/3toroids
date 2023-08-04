const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: '3 toroids',
      template: './src/index.html', // Path to your template file
    }),
  ],
};