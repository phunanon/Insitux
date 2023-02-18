import { isToken, NamedNodes, parseParams, Node, Token } from "./parse";
import { insituxVersion, ops, ParamsShape, syntaxes } from "./types";
const { floor } = Math;

type JsBlob = string | ((...args: any[]) => any);
type JsBundle = { [name: string]: JsBlob };
type Resolved = {
  js: string;
  sym?: true;
  key?: string;
  bundle?: JsBundle;
};

const joinJs = (list: Resolved[], text = ", ") =>
  list.map(x => x.js).join(text);

export function transpileNamedNodes(funcs: NamedNodes[]): JsBundle {
  let bundle: JsBundle = {
    global: `const ops = {};\nconst para = {};\nconst lets = {};\n`,
  };
  funcs.forEach(({ name, nodes }) => {
    const { shape, errors } = parseParams(nodes, false);
    const resolved = nodes.map(resolveNode);
    for (const expression of resolved) {
      bundle = { ...bundle, ...expression.bundle };
    }
    const allButReturn = resolved.slice(0, -1);
    if (name === "entry") {
      const a =
        joinJs(allButReturn, ";\n") + (allButReturn.length ? ";\n" : "");
      const b = resolved[resolved.length - 1].js;
      bundle[name] = `${a}console.log(${b});`;
      return;
    }
    const inner = allButReturn.length
      ? `${joinJs(allButReturn, ";\n")};
  return ${resolved[resolved.length - 1].js};`
      : `return ${resolved[0].js};`;
    const outer = `ops["${name}"] = function(...params) {
  const para = {};
  const lets = {};
${destructureParams(shape)}
  ${inner}
};`;
    bundle[name] = outer;
  });
  return bundle;
}

function destructureParams(shape: ParamsShape): string {
  const destructurings = shape
    .flat(Infinity)
    .map(
      ({ position, name }) =>
        `  para["${name}"] = params${safeDestructure(position)};`,
    );
  return destructurings.join("\n");
}

function safeDestructure(position: number[]): string {
  return `${position.map(x => `?.[${x}]`).join("")} ?? null`;
}

const resolveNode = (n: Node) =>
  isToken(n) ? resolveToken(n) : resolveExpression(n);

function resolveToken(node: Token): Resolved {
  switch (node.typ) {
    case "num":
      return { js: node.text };
    case "str":
      return { js: `\`${node.text}\`` };
    case "sym": {
      if (ops[node.text]) {
        const bundle = definitions[node.text]?.standalone;
        if (!bundle) {
          console.warn(node.text, "not implemented");
          return { js: `ops['${node.text}']` };
        }
        return { js: `ops['${node.text}']`, bundle };
      }
      if (node.text.startsWith(":")) {
        return { js: `"${node.text}"`, key: node.text.slice(1) };
      }
      return {
        js: `(para["${node.text}"] ?? lets["${node.text}"] ?? globalThis["${node.text}"] ?? null)`,
        sym: true,
      };
    }
  }
  return { js: "?", sym: true };
}

const resolveExpression = ([head, ...body]: Node[]): Resolved => {
  const resolvedArgs = body.map(resolveArg);
  const resolved = getOp(head)(resolvedArgs);
  resolved.bundle = {
    ...resolved.bundle,
    ...resolvedArgs.reduce(
      (acc, { bundle }) => ({ ...acc, ...bundle }),
      {} as JsBundle,
    ),
  };
  resolved.js = `(${resolved.js})`;
  return resolved;
};

type Transformer = (args: Resolved[]) => Resolved;

function getOp(node: Node): Transformer {
  if (isToken(node)) {
    const op = definitions[node.text];
    if (op) {
      const { inline, standalone } = op;
      return inline
        ? args => inline(args)
        : args => ({
            js: `ops[${node.text}](${joinJs(args, ", ")})`,
            bundle: standalone,
          });
    }
    return (args: Resolved[]) => ({
      js: `ops["${node.text}"](${joinJs(args, ", ")})`,
    });
  } else {
    const { js, bundle } = resolveExpression(node);
    return args => ({
      js: `${js}(${joinJs(args, ", ")})`,
      bundle,
    });
  }
}

function resolveArg(arg: Node): Resolved {
  return isToken(arg) ? resolveToken(arg) : resolveExpression(arg);
}

type ResolvedOperation = { inline?: Transformer; standalone: JsBundle };

const asBool = (x: unknown) => !(x === false || x === undefined || x === null);

const partition = <T>(n: number, arr: T[]) => {
  const result = [];
  for (let i = 0; i < arr.length; i += n) {
    result.push(arr.slice(i, i + n));
  }
  return result;
};
const evenArgs = <T>(args: T[]) => args.slice(0, floor(args.length / 2) * 2);

const definitions: { [name: string]: ResolvedOperation } = {
  "+": {
    inline: args => ({ js: joinJs(args, " + ") }),
    standalone: {
      "+": `ops['+'] = (...args) => args.reduce((a, b) => a + b);`,
    },
  },
  "-": {
    inline: args => ({ js: joinJs(args, " - ") }),
    standalone: {
      "-": `ops['-'] = (...args) => args.reduce((a, b) => a - b);`,
    },
  },
  "*": {
    inline: args => ({ js: joinJs(args, " * ") }),
    standalone: {
      "*": `ops['*'] = (...args) => args.reduce((a, b) => a * b);`,
    },
  },
  "/": {
    inline: args => ({ js: joinJs(args, " / ") }),
    standalone: {
      "/": `ops['/'] = (...args) => args.reduce((a, b) => a / b);`,
    },
  },
  "<": {
    inline: args => ({
      js: args
        .slice(0, -1)
        .map((x, i) => `${x.js} < ${args[i + 1].js}`)
        .join(" && "),
    }),
    standalone: {
      "<": `ops['<'] = (...args) => { while (args.length) { const n = args.shift(); if (n >= args[0]) return false; } return true; };`,
    },
  },
  neg: { inline: ([n]) => ({ js: `-${n.js}` }), standalone: {} },
  inc: {
    inline: ([n]) => ({ js: `${n.js} + 1` }),
    standalone: { inc: "ops['inc'] = ([n]) => n + 1;" },
  },
  dec: {
    inline: ([n]) => ({ js: `${n.js} - 1` }),
    standalone: { dec: "ops['dec'] = ([n]) => n + 1;" },
  },
  floor: {
    inline: ([n]) => ({ js: `Math.floor(${n.js})` }),
    standalone: { floor: "ops['floor'] = ([n]) => Math.floor(n);" },
  },
  sin: {
    inline: args => ({ js: `Math.sin(${args[0].js})` }),
    standalone: { sin: `ops['sin'] = ([n]) => Math.sin(n);` },
  },
  str: {
    inline: args => ({ js: joinJs(args, " + ") }),
    standalone: { str: `ops['str'] = (...args) => args.join('');` },
  },
  vec: {
    inline: args => ({ js: `[${joinJs(args, ", ")}]` }),
    standalone: { vec: `ops['vec'] = (...args) => args;` },
  },
  dict: {
    inline: args => ({
      js: `new Map([${partition(2, evenArgs(args))
        .map(x => joinJs(x))
        .map(x => `[${x}]`)
        .join(", ")}])`,
    }),
    standalone: {
      dict: `ops['dict'] = (...args) => new Map([partition(2, evenArgs(args))]);`,
      evenArgs,
      partition,
    },
  },
  "to-vec": {
    inline: ([x]) => ({ js: `Array.from(${x.js})` }),
    standalone: { "to-vec": `ops['to-vec'] = ([x]) => Array.from(x);` },
  },
  freqs: {
    inline: ([x]) => ({ js: `freqs(${x.js})` }),
    standalone: {
      freqs: `ops['freqs'] = ([...x]) => {
  const result = new Map();
  for (const item of x) {
    result.set(item, (result.get(item) || 0) + 1);
  }
  return result;
}`,
    },
  },
  print: {
    inline: args => ({
      js: `console.log(${joinJs(args, " + ")})`,
    }),
    standalone: {
      print: `ops['print'] = (...args) => { console.log(...args); return null; };`,
    },
  },
  if: {
    inline: ([a, b, c]) => ({
      js: `(asBool(${a.js}) ? ${b.js} : ${c.js})`,
      bundle: { asBool },
    }),
    standalone: {},
  },
  when: {
    inline: ([a, b]) => ({
      js: `(asBool(${a.js}) ? ${b.js} : null)`,
      bundle: { asBool },
    }),
    standalone: {},
  },
  time: {
    inline: () => ({ js: "new Date().getTime()" }),
    standalone: { time: "ops['time'] = () => new Date().getTime();" },
  },
  version: {
    inline: () => ({ js: `${insituxVersion}` }),
    standalone: { version: `ops['version'] = () => ${insituxVersion};` },
  },
  var: {
    inline: ([name, value]) => ({
      js: `globalThis[${name.sym ? `"${name.js}"` : name.js}] = ${value.js}`,
    }),
    standalone: {},
  },
};

const opNames = [...Object.keys(ops), ...syntaxes];
const transpilable = Object.keys(definitions).filter(t => opNames.includes(t));
const [numOp, numTran] = [opNames.length, transpilable.length];
console.log(
  `Transpilable: ${numTran}/${numOp} ${((numTran / numOp) * 100).toFixed(2)}%`,
);
