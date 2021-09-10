const path = require("path");

module.exports = ({ target }) => {
  const isWeb = target === "web";
  return {
    entry: `./src/${isWeb ? "invoker" : "repl"}.ts`,
    target: isWeb ? ["web"] : ["node"],
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".ts"],
    },
    output: isWeb
      ? {
          filename: "insitux.js",
          path: path.resolve(__dirname, "out"),
          library: "insitux",
          libraryTarget: "window",
          libraryExport: "invoker",
        }
      : {
          filename: "repl.js",
          path: path.resolve(__dirname, "out"),
        },
  };
};
