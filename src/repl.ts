import readline = require("readline");
import fs = require("fs");
import { symbols, insituxVersion } from ".";
import { Ctx, Val, ValOrErr } from "./types";
import { InvokeOutput, invoker, parensRx } from "./invoker";
import { tokenise } from "./parse";
const env = new Map<string, Val>();

async function get(key: string): Promise<ValOrErr> {
  return env.has(key)
    ? { kind: "val", value: env.get(key)! }
    : {
        kind: "err",
        err: `key ${key} not found`,
      };
}

async function set(key: string, val: Val) {
  env.set(key, val);
  return undefined;
}

const ctx: Ctx = {
  env: { funcs: {}, vars: {} },
  get,
  set,
  exe,
  loopBudget: 1e6,
  rangeBudget: 1e4,
  callBudget: 1e8,
  recurBudget: 1e4,
};

async function exe(name: string, args: Val[]): Promise<ValOrErr> {
  const nullVal: Val = { v: undefined, t: "null" };
  switch (name) {
    case "print":
    case "print-str":
      process.stdout.write(`\x1b[32m${args[0].v}\x1b[0m`);
      if (name === "print") {
        process.stdout.write("\n");
      }
      return { kind: "val", value: nullVal };
    case "read": {
      const path = args[0].v as string;
      if (!fs.existsSync(path)) {
        return { kind: "val", value: nullVal };
      }
      return {
        kind: "val",
        value: { t: "str", v: fs.readFileSync(path).toString() },
      };
    }
  }
  if (args.length) {
    const a = args[0];
    if (a.t === "str" && a.v.startsWith("$")) {
      if (args.length === 1) {
        return await get(`${a.v.substring(1)}.${name}`);
      } else {
        await set(`${a.v.substring(1)}.${name}`, args[1]);
        return { kind: "val", value: args[1] };
      }
    }
  }
  return { kind: "err", err: `operation ${name} does not exist` };
}

if (process.argv.length > 2) {
  const [x, y, path] = process.argv;
  if (fs.existsSync(path)) {
    const code = fs.readFileSync(path).toString();
    invoker(ctx, code).then(printErrorOutput);
  }
} else {
  console.log(`Insitux ${insituxVersion} REPL.`);

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
    lines.push(line);
    const input = lines.join("\n");
    if (isFinished(input)) {
      if (lines.length === 1) {
        fs.appendFileSync(".repl-history", `\n${input}`);
      }
      lines = [];
      if (input === "quit") {
        rl.close();
        return;
      }
      if (input.trim()) {
        printErrorOutput(await invoker(ctx, input));
      }
      rl.setPrompt("> ");
    } else {
      rl.setPrompt(". ");
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log();
  });

  rl.prompt();
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
