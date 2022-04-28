const fsPath = require("path");
const webpack = require("webpack");
const path = fsPath.resolve(__dirname, "dist");

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
  resolve: { extensions: [".ts", ".js"] },
  devtool: "source-map",
  mode: "production",
};

module.exports = [
  //Web library
  {
    ...standard,
    entry: `./src/invoker.ts`,
    target: ["web"],
    output: {
      filename: "insitux.lib.min.js",
      path,
      library: "insitux",
      libraryTarget: "window",
      libraryExport: "invoker",
    },
    optimization: { minimize: true },
  },
  //Web
  {
    ...standard,
    entry: `./src/web.ts`,
    target: ["web"],
    output: { filename: "insitux.min.js", path },
    optimization: { minimize: true },
  },
  //NodeJS
  {
    ...standard,
    entry: `./src/repl.ts`,
    target: ["node"],
    output: { filename: "repl.js", path },
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
      path,
      library: "insituxTokenise",
      libraryTarget: "window",
      libraryExport: "tokenise",
    },
    optimization: { minimize: true },
  },
];
