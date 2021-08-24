const { readFileSync, writeFileSync } = require("fs");
const block = JSON.parse(readFileSync("Deadline.json"))
  ["index.ts"].list.map(
    ({ description: [example, ...body] }) =>
      `${example}\n;; ${body.join("\n;; ")}`
  )
  .join("\n\n");
const md = readFileSync("Deadline.md").toString();
writeFileSync(
  "Deadline.md",
  md.replace(/#defs:index\.ts(.|\s)+?`/, "#defs:index.ts\n\n" + block + "\n`")
);
