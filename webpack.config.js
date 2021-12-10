const path = require("path");
const webpack = require('webpack');

const standard = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "esbuild-loader",
        options: {
          loader: "ts",
          target: "es2020",
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  devtool: "source-map",
};

module.exports = [
  //Web
  {
    ...standard,
    entry: `./src/invoker.ts`,
    target: ["web"],
    output: {
      filename: "insitux.js",
      path: path.resolve(__dirname, "out"),
      library: "insitux",
      libraryTarget: "window",
      libraryExport: "invoker",
    },
    optimization: { minimize: true },
  },
  //Node
  {
    ...standard,
    entry: `./src/repl.ts`,
    target: ["node"],
    output: {
      filename: "repl.js",
      path: path.resolve(__dirname, "out"),
    },
    plugins: [
      new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
    ],
    optimization: { minimize: false },
  },
  //Web tokenise
  {
    ...standard,
    entry: `./src/parse.ts`,
    target: ["web"],
    output: {
      filename: "insitux-tokenise.js",
      path: path.resolve(__dirname, "website"),
      library: "insituxTokenise",
      libraryTarget: "window",
      libraryExport: "tokenise",
    },
    optimization: { minimize: true },
  },
];
