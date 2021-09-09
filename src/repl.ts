import readline = require("readline");
import fs = require("fs");
import { invoke, symbols, visStr } from ".";
import { Ctx, Val, ValAndErr } from "./types";
import { getTimeMs } from "./poly-fills";
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
  callBudget: 100000000,
  recurBudget: 10000,
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
      if (args.length) {
        const a = args[0];
        if (visStr(a) && a.v.startsWith("$")) {
          if (args.length === 1) {
            return await get(`${a.v.substring(1)}.${name}`);
          } else {
            await set(`${a.v.substring(1)}.${name}`, args[1]);
            return { value: args[1] };
          }
        }
      }
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal };
}

function completer(line: string) {
  const input = line.split(parensRx).pop();
  const completions = symbols(ctx);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter(c => c.startsWith(input));
  return [hits.length ? hits : completions, input];
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

rl.on("line", async line => {
  if (line === "quit") {
    rl.close();
    return;
  }
  if (line.trim()) {
    fs.appendFileSync(".repl-history", `\n${line}`);
    printErrorOutput(await invoker(ctx, line));
  }
  rl.prompt();
});

rl.prompt();

type ErrorOutput = {
  type: "message" | "error";
  text: string;
}[];

function printErrorOutput(lines: ErrorOutput) {
  const colours = { error: 31, message: 35 };
  lines.forEach(({ type, text }) => {
    process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
  });
}

const invocations = new Map<string, string>();
const parensRx = /[\[\]\(\) ]/;

export async function invoker(ctx: Ctx, code: string): Promise<ErrorOutput> {
  const uuid = getTimeMs().toString();
  invocations.set(uuid, code);
  const errors = await invoke(ctx, code, uuid, true);
  let out: ErrorOutput = [];
  errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
    const lineText = invocations.get(invocationId)!.split("\n")[line - 1];
    const sym = lineText.substring(col - 1).split(parensRx)[0];
    const half1 = lineText.substring(0, col - 1).trimStart();
    out.push({ type: "message", text: `${line}`.padEnd(4) + half1 });
    if (!sym) {
      const half2 = lineText.substring(col);
      out.push({ type: "error", text: lineText[col - 1] });
      out.push({ type: "message", text: `${half2}\n` });
    } else {
      const half2 = lineText.substring(col - 1 + sym.length);
      out.push({ type: "error", text: sym });
      out.push({ type: "message", text: `${half2}\n` });
    }
    out.push({ type: "message", text: `${e} Error: ${m}.\n` });
  });
  return out;
}
