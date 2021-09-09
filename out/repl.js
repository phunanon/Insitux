"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoker = void 0;
const readline = require("readline");
const fs = require("fs");
const _1 = require(".");
const poly_fills_1 = require("./poly-fills");
const env = new Map();
async function get(key) {
    return env.has(key)
        ? { value: env.get(key), err: undefined }
        : {
            value: { v: undefined, t: "null" },
            err: `key ${key} not found`,
        };
}
async function set(key, val) {
    env.set(key, val);
    return undefined;
}
const ctx = {
    env: { funcs: {}, vars: {}, lets: [] },
    get,
    set,
    exe,
    loopBudget: 10000,
    rangeBudget: 1000,
    callBudget: 100000000,
    recurBudget: 10000,
};
async function exe(name, args) {
    const nullVal = { v: undefined, t: "null" };
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
            printErrorOutput(await invoker(ctx, args[0].v));
            return { value: nullVal };
        }
        case "read": {
            const path = args[0].v;
            if (!fs.existsSync(path)) {
                return { value: nullVal };
            }
            return {
                value: { t: "str", v: fs.readFileSync(path).toString() },
            };
        }
        default:
            if (args.length && _1.visStr(args[0]) && args[0].v.startsWith("$")) {
                if (args.length === 1) {
                    return await get(`${args[0].v.substring(1)}.${name}`);
                }
                else {
                    set(`${args[0].v.substring(1)}.${name}`, args[1]);
                    return { value: args[1] };
                }
            }
            return { value: nullVal, err: `operation ${name} does not exist` };
    }
    return { value: nullVal };
}
function completer(line) {
    const input = line.split(parensRx).pop();
    const completions = _1.symbols(ctx);
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
rl.on("line", async (line) => {
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
function printErrorOutput(lines) {
    const colours = { error: 31, message: 35 };
    lines.forEach(({ type, text }) => {
        process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
    });
}
const invocations = new Map();
const parensRx = /[\[\]\(\) ]/;
async function invoker(ctx, code) {
    const uuid = poly_fills_1.getTimeMs().toString();
    invocations.set(uuid, code);
    const errors = await _1.invoke(ctx, code, uuid, true);
    let out = [];
    errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
        const lineText = invocations.get(invocationId).split("\n")[line - 1];
        const sym = lineText.substring(col - 1).split(parensRx)[0];
        const half1 = lineText.substring(0, col - 1).trimStart();
        out.push({ type: "message", text: `${line}`.padEnd(4) + half1 });
        if (!sym) {
            const half2 = lineText.substring(col);
            out.push({ type: "error", text: lineText[col - 1] });
            out.push({ type: "message", text: `${half2}\n` });
        }
        else {
            const half2 = lineText.substring(col - 1 + sym.length);
            out.push({ type: "error", text: sym });
            out.push({ type: "message", text: `${half2}\n` });
        }
        out.push({ type: "message", text: `${e} Error: ${m}.\n` });
    });
    return out;
}
exports.invoker = invoker;
//# sourceMappingURL=repl.js.map