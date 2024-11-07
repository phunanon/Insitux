#!/usr/bin/env node
import { insituxVersion, symbols } from ".";
import { Ctx, defaultCtx, ErrCtx, Val, ValOrErr } from "./types";
import { Operation, ExternalFunctions } from "./types";
import { InvokeOutput, invoker, parensRx, valueInvoker } from "./invoker";
import { tokenise } from "./parse";
import { str, _nul, _str, _vec, num, _num, _key, val2str } from "./val";
import { ixToJs, jsToIx } from "./val-translate";

import { exit } from "process";
import readline = require("readline");
import prompt = require("prompt-sync");
import { execSync, spawn } from "child_process";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "fs";
import { unlinkSync, existsSync, mkdirSync } from "fs";
import { join as pathJoin, dirname } from "path";

const githubRegex = /^(?!https*:)[^\/]+?\/[^\/][^.]*$/;
let colourMode = true;
let coverages: { unvisited: string[]; all: string[] }[] = [];

//#region External operations
function invokeVal(
  ctx: Ctx,
  errCtx: ErrCtx,
  val: Val,
  params: Val[] = [],
): void {
  const result = valueInvoker(ctx, errCtx, val, params);
  if ("errors" in result.result) {
    printErrorOutput(result.output);
  }
}

function read(path: string, asLines: boolean, asBlob = false): Val {
  if (!existsSync(path)) {
    return _nul();
  }
  if (asBlob) {
    const v = new Blob([readFileSync(path)]);
    return { t: "ext", v };
  }
  const content = readFileSync(path).toString();
  return asLines ? _vec(content.split(/\r?\n/).map(_str)) : _str(content);
}

function writeOrAppend(path: string, content: string, isAppend = false) {
  (isAppend ? appendFileSync : writeFileSync)(path, content);
  return _nul();
}

const writingOpDef: Operation = {
  exactArity: 2,
  params: ["str", "str"],
  returns: ["str"],
  hasEffects: true,
};

const dicToRecord = (dic: Val) => {
  const obj: { [key: string]: string } = {};
  if (dic.t !== "dict") {
    return obj;
  }
  const { keys, vals } = dic.v;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key.t !== "str") {
      continue;
    }
    obj[key.v] = val2str(vals[i]);
  }
  return obj;
};

function fetchOp(
  url: string,
  method: string,
  ctx: Ctx,
  errCtx: ErrCtx,
  headersVal?: Val,
  callback?: Val,
  bodyVal?: Val,
  deserialise = false,
) {
  const headers = headersVal ? dicToRecord(headersVal) : undefined;
  setTimeout(async () => {
    let response: Response | null;
    try {
      const bodyObj =
        bodyVal && (bodyVal.v instanceof Blob ? bodyVal.v : ixToJs(bodyVal));
      const body =
        bodyVal && typeof bodyObj === "string"
          ? bodyObj
          : bodyObj instanceof Blob
          ? await bodyObj.arrayBuffer()
          : JSON.stringify(bodyObj);
      response = await fetch(url, { method, body, headers });
    } catch (e) {
      console.log(e);
      response = null;
    }
    if (!callback) return;
    const fetched = await response?.text();
    let obj: Val;
    try {
      obj = fetched
        ? deserialise
          ? jsToIx(JSON.parse(fetched))
          : _str(fetched)
        : _nul();
    } catch (e) {
      obj = _str(fetched);
    }
    const result = valueInvoker(ctx, errCtx, callback, [obj]);
    if ("errors" in result) {
      printErrorOutput(result.output);
    }
  });
}

function makeFunctions(
  rootDirectory: string,
  workingDirectory = process.cwd(),
) {
  return <ExternalFunctions>{
    read: {
      definition: {
        exactArity: 1,
        params: ["str"],
        returns: ["str"],
        hasEffects: true,
      },
      handler: ([path]) => read(str(path), false),
    },
    "read-blob": {
      definition: {
        exactArity: 1,
        params: ["str"],
        returns: ["str"],
        hasEffects: true,
      },
      handler: ([path]) => read(str(path), false, true),
    },
    "read-lines": {
      definition: {
        exactArity: 1,
        params: ["str"],
        returns: ["vec"],
        hasEffects: true,
      },
      handler: ([path]) => read(str(path), true),
    },
    write: {
      definition: writingOpDef,
      handler: ([path, content]) => writeOrAppend(str(path), str(content)),
    },
    "file-append": {
      definition: writingOpDef,
      handler: params =>
        writeOrAppend(<string>params[0].v, <string>params[1].v, true),
    },
    prompt: {
      definition: {
        exactArity: 1,
        params: ["str"],
        returns: ["str", "null"],
        hasEffects: true,
      },
      handler: params => jsToIx(prompt()(<string>params[0].v)),
    },
    exec: {
      definition: { params: ["str"], hasEffects: true },
      handler: params => {
        try {
          return jsToIx(execSync(str(params[0])).toString());
        } catch (e) {
          let err = `${e}`;
          if (e instanceof Error) err = e.message;
          return { kind: "err", err };
        }
      },
    },
    import: {
      definition: {
        exactArity: 1,
        params: ["str"],
        hasEffects: true,
      },
      handler: params => {
        const p0 = str(params[0]);
        const isGithub = githubRegex.test(p0);
        const isAliased = !p0.endsWith(".ix");
        const path = pathJoin(
          isGithub || isAliased ? rootDirectory : workingDirectory,
          isGithub ? `.ix/${p0}/entry.ix` : isAliased ? `.ix/${p0}.ix` : p0,
        );
        //Error due to missing dependency
        if (!existsSync(path)) {
          if (isGithub) {
            return {
              kind: "err",
              err: `not found, you should run: ix i ${p0}`,
            };
          }
          return { kind: "err", err: `not found: ${path}` };
        }
        //Execute and return
        const code = readFileSync(path).toString();
        const oldFuncs = ctx.functions;
        delete ctx.env.funcs["entry"];
        ctx.functions = makeFunctions(rootDirectory, dirname(path));
        const { result, output } = invoker(ctx, code, path, [], false);
        ctx.functions = oldFuncs;
        if ("kind" in result && result.kind === "errors") {
          printErrorOutput(output);
          return { kind: "err", err: `errors during import of ${path}` };
        }
        return !("kind" in result) ? result : _nul();
      },
    },
    "set-interval": {
      definition: {
        exactArity: 2,
        params: [["func", "clo"], "num"],
        returns: ["ext"],
      },
      handler: ([func, interval], errCtx) => {
        return {
          t: "ext",
          v: setInterval(() => invokeVal(ctx, errCtx, func), num(interval)),
        };
      },
    },
    "set-timeout": {
      definition: { minArity: 2, params: ["func", "num"], returns: ["ext"] },
      handler: ([func, interval, ...args], errCtx) => {
        return {
          t: "ext",
          v: setTimeout(
            () => invokeVal(ctx, errCtx, func, args),
            num(interval),
          ),
        };
      },
    },
    "clear-interval": {
      definition: { exactArity: 1, params: ["ext"], returns: ["null"] },
      handler: ([timer]) => {
        clearInterval(timer.v as NodeJS.Timeout);
      },
    },
    "clear-timeout": {
      definition: { exactArity: 1, params: ["ext"], returns: ["null"] },
      handler: ([timer]) => {
        clearTimeout(timer.v as NodeJS.Timeout);
      },
    },
    "GET-str": {
      definition: {
        minArity: 2,
        maxArity: 3,
        params: [["func", "clo"], "dict", "str"],
        returns: ["str"],
      },
      handler: ([callback, headers, url], errCtx) => {
        fetchOp(str(url), "GET", ctx, errCtx, headers, callback);
      },
    },
    "POST-str": {
      definition: {
        minArity: 2,
        maxArity: 4,
        params: ["str", "any", "dict", "func"],
        returns: ["str"],
      },
      handler: ([url, body, headers, callback], errCtx) => {
        fetchOp(str(url), "POST", ctx, errCtx, headers, callback, body);
      },
    },
    GET: {
      definition: {
        exactArity: 3,
        params: [["func", "clo"], "dict", "str"],
      },
      handler: ([callback, headers, url], errCtx) => {
        fetchOp(
          str(url),
          "GET",
          ctx,
          errCtx,
          headers,
          callback,
          undefined,
          true,
        );
      },
    },
    POST: {
      definition: {
        minArity: 2,
        maxArity: 4,
        params: ["str", "any", "dict", "func"],
      },
      handler: ([url, body, headers, callback], errCtx) => {
        fetchOp(str(url), "POST", ctx, errCtx, headers, callback, body, true);
      },
    },
    blob: {
      definition: {
        minArity: 1,
        returns: ["ext"],
      },
      handler: params => {
        let blob = new Blob();
        params.forEach(param => {
          if (
            param.t === "str" ||
            (param.t === "ext" && param.v instanceof Blob)
          ) {
            blob = new Blob([blob, param.v as string | Blob], {
              type: "application/octet-stream",
            });
          } else if (param.t === "num") {
            const byteUint8Array = new Uint8Array(1);
            byteUint8Array[0] = param.v;
            blob = new Blob([blob, byteUint8Array], {
              type: "application/octet-stream",
            });
          }
        });
        return { t: "ext", v: blob };
      },
    },
    "blob-len": {
      definition: {
        exactArity: 1,
        params: ["ext"],
        returns: ["num"],
      },
      handler: ([blob]) => {
        if (blob.v instanceof Blob) {
          return { t: "num", v: blob.v.size };
        }
      },
    },
  };
}
//#endregion

//#region Context
const ctx: Ctx = {
  ...defaultCtx,
  functions: {},
  print(str, withNewLine) {
    process.stdout.write(`\x1b[32m${str}\x1b[0m${withNewLine ? "\n" : ""}`);
  },
};
//#endregion

//#region REPL IO

function printErrorAndExit(message: string) {
  printErrorOutput([{ type: "error", text: message + "\n" }]);
  exit();
}

type DependencyResolution =
  | { kind: "http install"; url: string; alias: string }
  | { kind: "Github install"; repo: string }
  | { kind: "alias remove"; alias: string }
  | { kind: "Github remove"; repo: string };

/** Checks a dependency is or isn't present, and downloads if necessary. */
async function dependencyResolve(dependency: DependencyResolution) {
  if (!existsSync(".ix")) {
    mkdirSync(".ix");
  }
  try {
    if (dependency.kind === "http install") {
      console.log("Downloading", dependency.url);
      const response = await fetch(dependency.url);
      if (!response.ok) {
        throw `${response.status}: ${response.statusText}: ${dependency.url}`;
      }
      const text = await response.text();
      writeFileSync(`.ix/${dependency.alias}.ix`, text);
    } else if (dependency.kind === "alias remove") {
      unlinkSync(`.ix/${dependency.alias}.ix`);
    } else if (
      dependency.kind === "Github install" ||
      dependency.kind === "Github remove"
    ) {
      const path = `.ix/${dependency.repo}`;
      if (existsSync(path)) {
        rmSync(`.ix/${dependency.repo.split("/")[0]}`, {
          recursive: true,
          force: true,
        });
      }
      if (dependency.kind === "Github install") {
        console.log("Cloning", dependency.repo);
        const url = `https://github.com/${dependency.repo}.git`;
        await new Promise((resolve, reject) => {
          const proc = spawn("git", ["clone", "--depth", "1", url, path]);
          proc.on("close", status => {
            if (!status) {
              resolve(0);
            } else {
              const e = `git clone --depth 1 ${url} ${path}\nfailed with status ${status}`;
              reject(new Error(e));
            }
          });
        });
      }
    }
  } catch (err) {
    const message =
      typeof err === "object" && err && "message" in err
        ? (err as { message: string })["message"]
        : `${err}`;
    printErrorAndExit(message);
  }
  const name = "alias" in dependency ? dependency.alias : dependency.repo;
  console.log(`${dependency.kind} of ${name} succeeded.`);
}

async function depsFileAction(action: "install" | "remove") {
  const path = "deps.txt";
  if (!existsSync(path)) {
    console.log(`${path} not found.`);
    return;
  }
  const deps = readFileSync(path)
    .toString()
    .split("\n")
    .map(x => x.trim())
    .filter(x => x);
  if (!deps.length) {
    console.log(`${path} is empty.`);
    return;
  }
  for (const dep of deps) {
    await processCliArguments([action[0], ...dep.trim().split(" ")]);
  }
}

function exitIfBadAlias(alias: string) {
  const aliasValidator = /^[\w-]+$/;
  if (!aliasValidator.test(alias)) {
    console.log(`Ensure alias matches regular expression: ${aliasValidator}`);
    exit();
  }
}

const helpText = `Insitux ${insituxVersion} REPL
$ ix help           #or -h, to show this help
$ ix                #open a REPL session (exit with Ctrl+D or Ctrl+C)
$ ix .              #execute entry.ix in the working directory
$ ix file.ix        #execute file.ix in the working directory
$ ix -e "PI"        #execute provided string
$ ix -b             #disable REPL budgets (loops, recur, etc)
$ ix [args] -r      #… then open a REPL session
$ ix [...] -- [...] #seperation between ix args and program args (e.g. %0)
Most arguments/switches can be mixed with one another.

$ ix i              #installs dependencies listed in deps.txt
$ ix r              #remove dependencies listed in deps
$ ix i user/repo    #clone Github repository into the .ix directory
$ ix r user/repo    #delete Github repository from the .ix directory
$ ix i alias http…  #download file via HTTP into the .ix directory as alias.ix
$ ix r alias        #remove file downloaded earlier over HTTP by alias

If you have Visual Studio Code, install the syntax highlighter!
$ code --install-extension insitux.insitux-syntax`;

const extractSwitch = (args: string[], arg: string) => {
  let on = false;
  const idx = args.indexOf(arg);
  if (idx !== -1) {
    on = true;
    args.splice(idx, 1);
  }
  return on;
};

async function processCliArguments(args: string[]) {
  if (extractSwitch(args, "-unv")) {
    if (args.length) {
      ctx.coverageReport = collectCoverages;
    } else {
      console.log("-unv was ignored.");
    }
  }

  const safeMode = extractSwitch(args, "-s");
  if (!safeMode) {
    ctx.functions = makeFunctions(process.cwd());
  }

  if (!args.length) {
    startRepl();
    return;
  }

  const programArgs: string[] = [];
  if (args.includes("--")) {
    const programArgsIdx = args.indexOf("--");
    programArgs.push(...args.slice(programArgsIdx + 1));
    args = args.slice(0, programArgsIdx);
  }
  const params = programArgs.map(_str);

  let executeInline = "";
  const executeInlineIdx = args.indexOf("-e");
  if (executeInlineIdx !== -1) {
    if (executeInlineIdx + 1 === args.length) {
      console.error(
        "Argument after -e (the code to be executed inline) was not provided.",
      );
    } else {
      executeInline = args[executeInlineIdx + 1];
      args.splice(executeInlineIdx, 2);
    }
  }

  const openReplAfter = extractSwitch(args, "-r");
  const disableBudgets = extractSwitch(args, "-nb");
  colourMode = !extractSwitch(args, "-nc");

  if (!colourMode) {
    ctx.print = (str, withNewLine) => {
      process.stdout.write(`${str}${withNewLine ? "\n" : ""}`);
    };
  }

  if (disableBudgets) {
    ctx.callBudget = Infinity;
    ctx.loopBudget = Infinity;
    ctx.rangeBudget = Infinity;
    ctx.recurBudget = Infinity;
    if (!args.length) {
      startRepl();
    }
  }

  const matchArgs = (b: RegExp[]) =>
    args.length === b.length && args.every((arg, i) => b[i]?.test(arg));

  const invoke = (code: string, id = code) =>
    printErrorOutput(invoker(ctx, code, id, params).output);

  const entryDotIdx = args.indexOf(".");
  if (entryDotIdx !== -1) {
    args[entryDotIdx] = "entry.ix";
  }

  const [arg0, arg1, arg2] = args;
  if (["help", "-h"].includes(arg0)) {
    console.log(helpText);
    exit();
  } else if (matchArgs([/^i$/, githubRegex])) {
    //Install dependency via Github
    await dependencyResolve({ kind: "Github install", repo: arg1 });
  } else if (matchArgs([/^i$/, /.+/, /https*:/])) {
    //Install dependency via HTTP
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "http install", url: arg2, alias: arg1 });
  } else if (arg0 === "i") {
    await depsFileAction("install");
    exit();
  } else if (matchArgs([/^r$/, githubRegex])) {
    //Remove Github dependency
    await dependencyResolve({ kind: "Github remove", repo: arg1 });
  } else if (matchArgs([/^r$/, /.+/])) {
    //Remove aliased dependency
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "alias remove", alias: arg1 });
  } else if (arg0 === "r") {
    await depsFileAction("remove");
    exit();
  } else {
    //Execute files
    for (const path of args) {
      try {
        if (!existsSync(path)) {
          console.log(`${path} not found - ignored.`);
        } else {
          const code = readFileSync(path).toString();
          invoke(code, path);
        }
      } catch (e) {
        console.error(
          `Error executing "${path}":`,
          typeof e === "object" && e && "message" in e ? e.message : e,
        );
      }
    }
    //Execute optional inline
    if (executeInline) {
      invoke(executeInline, "inline code");
    }
  }

  if (ctx.coverageReport) {
    generateCoverageReport();
  }

  if (openReplAfter) {
    startRepl();
  }
}

function readHistory() {
  try {
    return existsSync(".repl-history.txt")
      ? readFileSync(".repl-history.txt").toString().split("\n").reverse()
      : [];
  } catch (e) {
    return [];
  }
}

function startRepl() {
  const coverageCallback = ctx.coverageReport;
  ctx.coverageReport = undefined;
  printErrorOutput(invoker(ctx, `(str "Insitux " (version) " REPL")`).output);
  ctx.coverageReport = coverageCallback;

  if (existsSync(".repl.ix")) {
    printErrorOutput(invoker(ctx, readFileSync(".repl.ix").toString()).output);
  }

  const history = readHistory();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "❯ ",
    completer,
    history,
  });
  const params: Val[] = [];

  rl.on("line", line => {
    lines.push(line);
    const input = lines.join("\n");
    if (haveFinishedEntry(input)) {
      if (lines.length === 1) {
        try {
          appendFileSync(".repl-history.txt", `\n${input}`);
        } catch (e) {}
      }
      lines = [];
      if (input === "quit") {
        rl.close();
        return;
      }
      if (input.trim()) {
        const { output, result } = invoker(ctx, input, undefined, params);
        if (!("kind" in result)) {
          params.unshift(result);
          if (params.length > 8) {
            params.pop();
          }
        }
        printErrorOutput(output);
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
}

processCliArguments(process.argv.slice(2));

function completer(line: string) {
  const input = line.split(parensRx).pop();
  const completions = symbols(ctx.env);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter(c => c.startsWith(input));
  return [hits.length ? hits : completions, input];
}

let lines: string[] = [];

function haveFinishedEntry(code: string): boolean {
  const { tokens } = tokenise(code, "");
  const numL = tokens.filter(t => t.typ === "(").length;
  const numR = tokens.filter(t => t.typ === ")").length;
  return numL <= numR;
}

function printErrorOutput(lines: InvokeOutput) {
  const colours = { error: 31, message: 35 };
  lines.forEach(({ type, text }) => {
    if (colourMode) {
      process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
    } else {
      process.stdout.write(text);
    }
  });
}

function collectCoverages(unvisited: string[], all: string[]) {
  coverages.push({ unvisited, all });
}

function generateCoverageReport() {
  const unvisited = coverages.flatMap(c => c.unvisited);
  const all = coverages.reduce((n, c) => n + c.all.length, 0);
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  unvisited.sort(collator.compare);
  writeFileSync(
    "unvisited.txt",
    unvisited.map(u => (u.startsWith("-") ? u.substring(1) : u)).join("\n") +
      "\n",
  );
  const coverage = Math.round(((all - unvisited.length) / all) * 1000) / 10;
  console.log(
    "unvisited.txt generated:",
    unvisited.length,
    `unvisited (${coverage}% coverage)`,
  );
}
//#endregion
