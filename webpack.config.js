const path = require('path');

module.exports = {
  entry: './src/3toroids.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
};
