import readline = require("readline");
import fs = require("fs");
import { invoke, symbols, visStr } from ".";
import { Ctx, Val, ValAndErr } from "./types";
import { randomUUID } from "crypto";
const env = new Map<string, Val>();
const invocations = new Map<string, string>();

async function get(key: string) {
  return env.has(key)
    ? { value: env.get(key)!, err: undefined }
    : {
        value: <Val>{ v: undefined, t: "null" },
        err: `key ${key} not found`,
      };
}

async function set(key: string, val: Val) {
  env.set(key, val);
  return undefined;
}

const ctx: Ctx = {
  env: { funcs: {}, vars: {}, lets: [] },
  get,
  set,
  exe,
  loopBudget: 10000,
  rangeBudget: 1000,
  callBudget: 1000,
};

async function exe(name: string, args: Val[]): Promise<ValAndErr> {
  const nullVal: Val = { v: undefined, t: "null" };
  switch (name) {
    case "print":
    case "print-str":
      process.stdout.write(`\x1b[32m${args[0].v}\x1b[0m`);
      if (name === "print") {
        process.stdout.write("\n");
      }
      break;
    case "eval": {
      delete ctx.env.funcs["entry"];
      await invoker(args[0].v as string);
      return { value: nullVal };
    }
    case "read": {
      const path = args[0].v as string;
      if (!fs.existsSync(path)) {
        return { value: nullVal };
      }
      return {
        value: { t: "str", v: fs.readFileSync(path).toString() },
      };
    }
    default:
      if (args.length && visStr(args[0]) && args[0].v.startsWith("$")) {
        if (args.length === 1) {
          return await get(`${args[0].v.substring(1)}.${name}`);
        } else {
          set(`${args[0].v.substring(1)}.${name}`, args[1]);
          return { value: args[1] };
        }
      }
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
  completer,
  history: fs.existsSync(".repl-history")
    ? fs.readFileSync(".repl-history").toString().split("\n").reverse()
    : [],
});

const parensRx = /[\[\]\(\) ]/;

function completer(line: string) {
  const input = line.split(parensRx).pop();
  const completions = symbols(ctx);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter(c => c.startsWith(input));
  return [hits.length ? hits : completions, input];
}

rl.prompt();

async function invoker(code: string) {
  const uuid = randomUUID();
  invocations.set(uuid, code);
  const errors = await invoke(ctx, code, uuid, true);
  errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
    const lineText = invocations.get(invocationId)!.split("\n")[line - 1];
    const sym = lineText.substring(col - 1).split(parensRx)[0];
    const half1 = lineText.substring(0, col - 1).trimStart();
    process.stdout.write(`\x1b[35m${`${line}`.padEnd(4)}${half1}\x1b[31m`);
    if (!sym) {
      const half2 = lineText.substring(col);
      console.log(`${lineText[col - 1]}\x1b[35m${half2}`);
    } else {
      const half2 = lineText.substring(col - 1 + sym.length);
      console.log(`${sym}\x1b[35m${half2}\x1b[35m`);
    }
    console.log(`${e} Error: ${m}.\x1b[0m`);
  });
}

rl.on("line", async line => {
  if (line === "quit") {
    rl.close();
    return;
  }
  if (line.trim()) {
    fs.appendFileSync(".repl-history", `\n${line}`);
    await invoker(line);
  }
  rl.prompt();
});
