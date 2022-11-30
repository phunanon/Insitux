#!/usr/bin/env node
import readline = require("readline");
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "fs";
import { unlinkSync, existsSync, mkdirSync } from "fs";
import { insituxVersion, symbols } from ".";
import { join as pathJoin, dirname } from "path";
import { Ctx, defaultCtx, ExternalFunctions, Val, ValOrErr } from "./types";
import { Operation } from "./types";
import { InvokeOutput, invoker, parensRx } from "./invoker";
import { tokenise } from "./parse";
import prompt = require("prompt-sync");
import { exit } from "process";
import { jsToIx, str, _nul, _str, _vec } from "./val";
import fetch from "cross-fetch";
import clone = require("git-clone/promise");
const execSync = require("child_process").execSync;

const _val = (value: Val) => <ValOrErr>{ kind: "val", value };
const githubRegex = /^(?!https*:)[^\/]+?\/[^\/]+$/;
let colourMode = true;

//#region External operations
function read(path: string, asLines: boolean) {
  if (!existsSync(path)) {
    return _val(_nul());
  }
  const content = readFileSync(path).toString();
  return _val(asLines ? _vec(content.split(/\r?\n/).map(_str)) : _str(content));
}

function writeOrAppend(path: string, content: string, isAppend = false) {
  (isAppend ? appendFileSync : writeFileSync)(path, content);
  return _val(_nul());
}

const writingOpDef: Operation = {
  exactArity: 2,
  params: ["str", "str"],
  returns: ["str"],
  hasEffects: true,
};

function makeFunctions(workingDirectory = process.cwd()) {
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
        returns: ["str"],
        hasEffects: true,
      },
      handler: params => _val(jsToIx(prompt()(<string>params[0].v))),
    },
    exec: {
      definition: { params: ["str"], hasEffects: true },
      handler: params => {
        try {
          return _val(jsToIx(execSync(str(params[0])).toString()));
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
          workingDirectory,
          isGithub ? `.ix/${p0}/entry.ix` : isAliased ? `.ix/${p0}.ix` : p0,
        );
        //Error due to missing dependency
        if (!existsSync(path)) {
          return { kind: "err", err: `not found: ${path}` };
        }
        //Execute and return
        const code = readFileSync(path).toString();
        const oldFuncs = ctx.functions;
        delete ctx.env.funcs["entry"];
        ctx.functions = makeFunctions(dirname(path));
        const { result, output } = invoker(ctx, code, path, false);
        ctx.functions = oldFuncs;
        if (result.kind === "errors") {
          printErrorOutput({ output });
          return { kind: "err", err: `errors in importing ${path}` };
        }
        return _val(result.kind === "val" ? result.value : _nul());
      },
    },
  };
}
//#endregion

//#region Context
const env = new Map<string, Val>();

function get(key: string): ValOrErr {
  return env.has(key)
    ? _val(env.get(key)!)
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
  functions: makeFunctions(),
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
        return _val(args[1]);
      }
    }
  }
  return { kind: "err", err: `operation "${name}" does not exist` };
}
//#endregion

//#region REPL IO

function printErrorAndExit(message: string) {
  printErrorOutput({ output: [{ type: "error", text: message + "\n" }] });
  exit();
}

type DependencyResolution =
  | { kind: "http install"; url: string; alias: string }
  | { kind: "Github install"; repo: string }
  | { kind: "alias remove"; alias: string }
  | { kind: "Github remove"; repo: string };

/** Checks a dependency is or isn't present, and downloads if necessary. */
async function dependencyResolve(dependency: DependencyResolution) {
  mkdirSync(".ix", { recursive: true });
  try {
    if (dependency.kind === "http install") {
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
        await clone(`https://github.com/${dependency.repo}.git`, path, {
          shallow: true,
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
  console.log(`${dependency.kind} succeeded.`);
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
$ ix . -r           #… then open a REPL session
$ ix file.ix        #execute file.ix in the working directory
$ ix file.ix -r     #… then open a REPL session

$ ix i              #installs dependencies listed in deps.txt
$ ix r              #remove dependencies listed in deps
$ ix i user/repo    #clone Github repository into the .ix directory
$ ix r user/repo    #delete Github repository from the .ix directory
$ ix i alias http…  #download file via HTTP into the .ix directory as alias.ix
$ ix r alias        #remove file downloaded earlier over HTTP by alias

If you have Visual Studio Code, install the syntax highlighter!
$ code --install-extension insitux.insitux-syntax`;

async function processCliArguments(args: string[]) {
  if (!args.length) {
    startRepl();
    return;
  }

  colourMode = false;

  const openReplAfter = args.includes("-r");
  const parts = openReplAfter ? args.filter(a => a !== "-r") : args;

  const matchParts = (b: RegExp[]) =>
    parts.length === b.length &&
    parts.every((part, i) => b[i] && b[i].test(part));

  const [arg0, arg1, arg2] = parts;
  if (["help", "-h"].includes(arg0)) {
    console.log(helpText);
    exit();
  } else if (matchParts([/^\.$/])) {
    //Execute entry.ix in working directory
    const path = "entry.ix";
    if (!existsSync(path)) {
      console.log("entry.ix does not exist in this directory.");
    } else {
      const code = readFileSync(path).toString();
      printErrorOutput(invoker(ctx, code, path));
    }
  } else if (matchParts([/^i$/, githubRegex])) {
    //Install dependency via Github
    await dependencyResolve({ kind: "Github install", repo: arg1 });
  } else if (matchParts([/^i$/, /.+/, /https*:/])) {
    //Install dependency via HTTP
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "http install", url: arg2, alias: arg1 });
  } else if (arg0 === "i") {
    await depsFileAction("install");
    exit();
  } else if (matchParts([/^r$/, githubRegex])) {
    //Remove Github dependency
    await dependencyResolve({ kind: "Github remove", repo: arg1 });
  } else if (matchParts([/^r$/, /.+/])) {
    //Remove aliased dependency
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "alias remove", alias: arg1 });
  } else if (arg0 === "r") {
    await depsFileAction("install");
    exit();
  } else {
    //Execute files
    for (const path of parts) {
      if (!existsSync(path)) {
        console.log(`${path} not found - ignored.`);
      } else {
        const code = readFileSync(path).toString();
        printErrorOutput(invoker(ctx, code, path));
      }
    }
  }

  if (openReplAfter) {
    colourMode = true;
    startRepl();
  }
}

function startRepl() {
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
    if (haveFinishedEntry(input)) {
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

function printErrorOutput({ output: lines }: { output: InvokeOutput }) {
  const colours = { error: 31, message: 35 };
  lines.forEach(({ type, text }) => {
    if (colourMode) {
      process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
    } else {
      process.stdout.write(text);
    }
  });
}
//#endregion
