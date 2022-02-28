import readline = require("readline");
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { symbols } from ".";
import { Ctx, defaultCtx, Val, ValOrErr } from "./types";
import { ExternalFunction, Operation } from "./types";
import { InvokeOutput, invoker, parensRx } from "./invoker";
import { tokenise } from "./parse";
import prompt = require("prompt-sync");
import { exit } from "process";

const nullVal: ValOrErr = { kind: "val", value: { t: "null", v: undefined } };

//#region External operations
function read(path: string, asLines: boolean) {
  if (!existsSync(path)) {
    return nullVal;
  }
  const content = readFileSync(path).toString();
  const str = (v: string) => <Val>{ t: "str", v };
  return <ValOrErr>{
    kind: "val",
    value: asLines
      ? { t: "vec", v: content.split(/\r?\n/).map(str) }
      : str(content),
  };
}

function writeOrAppend(path: string, content: string, isAppend = false) {
  (isAppend ? appendFileSync : writeFileSync)(path, content);
  return nullVal;
}

const writingOpDef: Operation = {
  exactArity: 2,
  params: ["str", "str"],
  returns: ["str"],
};

const functions: ExternalFunction[] = [
  {
    name: "read",
    definition: { exactArity: 1, params: ["str"], returns: ["str"] },
    handler: params => read(<string>params[0].v, false),
  },
  {
    name: "read-lines",
    definition: { exactArity: 1, params: ["str"], returns: ["vec"] },
    handler: params => read(<string>params[0].v, true),
  },
  {
    name: "write",
    definition: writingOpDef,
    handler: params => writeOrAppend(<string>params[0].v, <string>params[1].v),
  },
  {
    name: "file-append",
    definition: writingOpDef,
    handler: params =>
      writeOrAppend(<string>params[0].v, <string>params[1].v, true),
  },
  {
    name: "prompt",
    definition: {
      exactArity: 1,
      params: ["str"],
      returns: ["str"],
    },
    handler: params => ({
      kind: "val",
      value: { t: "str", v: prompt()(<string>params[0].v) },
    }),
  },
];
//#endregion

//#region Context
const env = new Map<string, Val>();

function get(key: string): ValOrErr {
  return env.has(key)
    ? { kind: "val", value: env.get(key)! }
    : { kind: "err", err: `key ${key} not found` };
}

function set(key: string, val: Val) {
  env.set(key, val);
  return undefined;
}

const ctx: Ctx = {
  ...defaultCtx,
  get,
  set,
  functions,
  print(str, withNewLine) {
    process.stdout.write(`\x1b[32m${str}\x1b[0m${withNewLine ? "\n" : ""}`);
  },
  exe,
};

function exe(name: string, args: Val[]): ValOrErr {
  if (args.length) {
    const a = args[0];
    if (a.t === "str" && a.v.startsWith("$")) {
      if (args.length === 1) {
        return get(`${a.v.substring(1)}.${name}`);
      } else {
        set(`${a.v.substring(1)}.${name}`, args[1]);
        return { kind: "val", value: args[1] };
      }
    }
  }
  return { kind: "err", err: `operation "${name}" does not exist` };
}
//#endregion

//#region REPL IO
if (process.argv.length > 2) {
  let [x, y, ...args] = process.argv;
  const paths = args.filter(a => !a.startsWith("-"));
  const switches = args.filter(a => a.startsWith("-"));
  paths.filter(existsSync).forEach(path => {
    const code = readFileSync(path).toString();
    printErrorOutput(invoker(ctx, code, path));
  });
  if (!switches.includes("-r")) {
    exit();
  }
}
printErrorOutput(invoker(ctx, `(str "Insitux " (version) " REPL")`));
if (existsSync(".repl.ix")) {
  printErrorOutput(invoker(ctx, readFileSync(".repl.ix").toString()));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "❯ ",
  completer,
  history: existsSync(".repl-history.txt")
    ? readFileSync(".repl-history.txt").toString().split("\n").reverse()
    : [],
});

rl.on("line", line => {
  lines.push(line);
  const input = lines.join("\n");
  if (isFinished(input)) {
    if (lines.length === 1) {
      appendFileSync(".repl-history.txt", `\n${input}`);
    }
    lines = [];
    if (input === "quit") {
      rl.close();
      return;
    }
    if (input.trim()) {
      printErrorOutput(invoker(ctx, input));
    }
    rl.setPrompt("❯ ");
  } else {
    rl.setPrompt("• ");
  }
  rl.prompt();
});

rl.on("close", () => {
  console.log();
});

rl.prompt();

function completer(line: string) {
  const input = line.split(parensRx).pop();
  const completions = symbols(ctx);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter(c => c.startsWith(input));
  return [hits.length ? hits : completions, input];
}

let lines: string[] = [];

function isFinished(code: string): boolean {
  const { tokens } = tokenise(code, "");
  const numL = tokens.filter(t => t.typ === "(").length;
  const numR = tokens.filter(t => t.typ === ")").length;
  return numL <= numR;
}

function printErrorOutput(lines: InvokeOutput) {
  const colours = { error: 31, message: 35 };
  lines.forEach(({ type, text }) => {
    process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
  });
}
//#endregion
