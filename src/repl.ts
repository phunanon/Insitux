import readline = require("readline");
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { unlinkSync, existsSync, mkdirSync } from "fs";
import { insituxVersion, invoke, symbols } from ".";
import { join as pathJoin } from "path";
import { Ctx, defaultCtx, ExternalFunctions, Val, ValOrErr } from "./types";
import { Operation } from "./types";
import { InvokeOutput, invoker, parensRx } from "./invoker";
import { tokenise } from "./parse";
import prompt = require("prompt-sync");
import { exit } from "process";
import { str, _nul, _str, _vec } from "./val";
import fetch from "cross-fetch";
import clone = require("git-clone/promise");

const _val = (value: Val) => <ValOrErr>{ kind: "val", value };
const githubRegex = /^(?!https*:)[^\/]+?\/[^\/]+$/;

//#region External operations
function read(path: string, asLines: boolean) {
  if (!existsSync(path)) {
    return _val(_nul());
  }
  const content = readFileSync(path).toString();
  return <ValOrErr>{
    kind: "val",
    value: asLines ? _vec(content.split(/\r?\n/).map(_str)) : _str(content),
  };
}

function writeOrAppend(path: string, content: string, isAppend = false) {
  (isAppend ? appendFileSync : writeFileSync)(path, content);
  return _val(_nul());
}

const writingOpDef: Operation = {
  exactArity: 2,
  params: ["str", "str"],
  returns: ["str"],
};

type ReplCtx = {
  workingDirectory: string;
};

const functions: ExternalFunctions<ReplCtx> = {
  read: {
    definition: { exactArity: 1, params: ["str"], returns: ["str"] },
    handler: async ([path]) => read(str(path), false),
  },
  "read-lines": {
    definition: { exactArity: 1, params: ["str"], returns: ["vec"] },
    handler: async ([path]) => read(str(path), true),
  },
  write: {
    definition: writingOpDef,
    handler: async ([path, content]) => writeOrAppend(str(path), str(content)),
  },
  "file-append": {
    definition: writingOpDef,
    handler: async params =>
      writeOrAppend(<string>params[0].v, <string>params[1].v, true),
  },
  prompt: {
    definition: {
      exactArity: 1,
      params: ["str"],
      returns: ["str"],
    },
    handler: async params => ({
      kind: "val",
      value: { t: "str", v: prompt()(<string>params[0].v) },
    }),
  },
  import: {
    definition: {
      minArity: 1,
      maxArity: 2,
      params: ["str", "str"],
    },
    handler: async (params, ctx) => {
      const p0 = str(params[0]);
      const isGithub = params.length === 1 && githubRegex.test(p0);
      const isAliased = params.length === 2;
      const workingDir = pathJoin(
        ctx.innerCtx.workingDirectory,
        isGithub ? `./ix/${p0}` : isAliased ? ".ix" : "",
      );
      const fileName = isGithub ? "entry.ix" : p0;
      const path = pathJoin(workingDir, fileName);
      //Try to resolve missing dependency
      if (!existsSync(path)) {
        if (isGithub) {
          await dependencyResolve({ kind: "Github install", repo: p0 });
        } else if (isAliased) {
          await dependencyResolve({
            kind: "http install",
            alias: p0,
            url: str(params[1]),
          });
        } else {
          return { kind: "err", err: `not found: ${path}` };
        }
      }
      //Execute and return
      const code = readFileSync(path).toString();
      const { result, output } = await invoker(ctx, code, path, false);
      if (result.kind === "errors") {
        printErrorOutput({ output });
        return { kind: "err", err: `errors in importing ${path}` };
      }
      return {
        kind: "val",
        value: result.kind === "val" ? result.value : _nul(),
      };
    },
  },
};
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

const ctx: Ctx<ReplCtx> = {
  ...defaultCtx,
  innerCtx: { workingDirectory: process.cwd() },
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
        return _val(args[1]);
      }
    }
  }
  return { kind: "err", err: `operation "${name}" does not exist` };
}
//#endregion

//#region REPL IO

function printErrorAndExit(message: string) {
  printErrorOutput({output: [{ type: "error", text: message + "\n" }]});
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
    switch (dependency.kind) {
      case "http install": {
        const response = await fetch(dependency.url);
        if (!response.ok) {
          throw `${response.status}: ${response.statusText}: ${dependency.url}`;
        }
        const text = await response.text();
        writeFileSync(`.ix/${dependency.alias}.ix`, text);
        break;
      }
      case "alias remove":
        unlinkSync(`.ix/${dependency.alias}.ix`);
        break;
      case "Github install": {
        const path = `.ix/${dependency.repo}`;
        if (existsSync(path)) {
          unlinkSync(`.ix/${dependency.repo}`);
        }
        await clone(`https://github.com/${dependency.repo}.git`, path, {
          shallow: true,
        });
        break;
      }
      case "Github remove":
        unlinkSync(`.ix/${dependency.repo}`);
        break;
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

$ ix i user/repo    #clone Github repository into the .ix directory
$ ix r user/repo    #delete Github repository from the .ix directory
$ ix i alias http…  #download file via HTTP into the .ix directory as alias.ix
$ ix r alias        #remove file downloaded earlier over HTTP by alias

If you have Visual Studio Code, install the syntax highlighter!
$ code --install-extension insitux.insitux-syntax`;

async function startCli([nodePath, workingDir, ...args]: string[]) {
  if (!args.length) {
    startRepl();
    return;
  }

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
      printErrorOutput(await invoker(ctx, code, path));
    }
  } else if (matchParts([/^i$/, githubRegex])) {
    //Install dependency via Github
    await dependencyResolve({ kind: "Github install", repo: arg1 });
  } else if (matchParts([/^i$/, /.+/, /https*:/])) {
    //Install dependency via HTTP
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "http install", url: arg2, alias: arg1 });
  } else if (arg0 === "i") {
    //Incorrect `ix i` usage
    console.log(`Provide either a Github repository e.g.
$ ix i username/repo
or an alias and HTTP URL e.g.
$ ix i dependency-name https://…`);
    exit();
  } else if (matchParts([/^r$/, githubRegex])) {
    //Remove Github dependency
    await dependencyResolve({ kind: "Github remove", repo: arg1 });
  } else if (matchParts([/^r$/, /.+/])) {
    //Remove aliased dependency
    exitIfBadAlias(arg1);
    await dependencyResolve({ kind: "alias remove", alias: arg1 });
  } else if (arg0 === "r") {
    //Incorrect `ix r` usage
    console.log(`Provide either a Github repository e.g.
$ ix r username/repo
or an alias e.g.
$ ix r dependency-name`);
    exit();
  } else {
    //Execute files
    for (const path of parts) {
      if (!existsSync(path)) {
        console.log(`${path} not found - ignored.`);
      } else {
        const code = readFileSync(path).toString();
        printErrorOutput(await invoker(ctx, code, path));
      }
    }
  }

  if (openReplAfter) {
    startRepl();
  }
}

async function startRepl() {
  printErrorOutput(await invoker(ctx, `(str "Insitux " (version) " REPL")`));

  if (existsSync(".repl.ix")) {
    printErrorOutput(await invoker(ctx, readFileSync(".repl.ix").toString()));
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

  rl.on("line", async line => {
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
        printErrorOutput(await invoker(ctx, input));
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

startCli(process.argv);

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
    process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
  });
}
//#endregion
