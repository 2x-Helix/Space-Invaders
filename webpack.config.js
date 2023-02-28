const path = require('path');

var fs = require('fs');

const onlyUnique = function(value, index, self) {
  return self.indexOf(value) === index;
}

//Ignore node_modules and non ts files
const files = fs.readdirSync('.')
  .filter(x => x.includes("."))
  .map(x => x.split(".").pop())
  .filter(x => x != "ts")
  .filter(onlyUnique)
  .map(x => path.posix.resolve("**." + x))
  .concat(path.posix.resolve("./node_modules/**"))

module.exports = {
  mode: "development",
  watch: true,
  watchOptions: {
    ignored: files
  },
  entry: {
    spaceinvaders:'./spaceinvaders.ts',
  },
  devtool: 'inline-source-map',
  stats: {
    version: false,
    hash: false,
    entrypoints: false,
    assets : false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
};
