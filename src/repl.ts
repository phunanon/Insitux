import readline = require("readline");
import fs = require("fs");
import { invoke, symbols, visStr } from ".";
import { Ctx, Val, ValAndErr } from "./types";
const rf = (f: string) => fs.readFileSync(f).toString();
const env = new Map<string, Val>();

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
      process.stdout.write(args[0].v as string);
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
        if (args.length == 1) {
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

function completer(line: string) {
  const input = line.split(/[\(\) ]/).pop();
  const completions = symbols(ctx);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter(c => c.startsWith(input));
  return [hits.length ? hits : completions, input];
}

rl.prompt();

async function invoker(code: string) {
  process.stdout.write("\x1b[32m");
  const errors = await invoke(ctx, code, "repl", true);
  process.stdout.write("\x1b[0m");
  errors.forEach(({ e, m, errCtx: { line, col } }) =>
    console.log(`\x1b[35m${e} Error ${line}:${col}: ${m}.\x1b[0m`)
  );
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
