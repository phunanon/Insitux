import { isToken, NamedNodes, parseParams, Node, Token } from "./parse";
import { insituxVersion, Operation, ops } from "./types";

type JsBlob = string;
type JsBundle = { [name: string]: JsBlob };
type Resolved = {
  js: string;
  as?: Operation["params"];
  bundle?: JsBundle;
};

const joinJs = (list: Resolved[], text: string) =>
  list.map(x => x.js).join(text);

export function transpileNamedNodes(funcs: NamedNodes[]): JsBundle {
  let bundle: JsBundle = {
    global: `const ops = {};\n`,
  };
  funcs.forEach(({ name, nodes }) => {
    const { shape, errors } = parseParams(nodes, false);
    const resolved = nodes.map(resolveNode);
    for (const expression of resolved) {
      bundle = { ...bundle, ...expression.bundle };
    }
    const params = shape.map(x => x.name).join(", ");
    const sansReturn = resolved.slice(0, -1);
    if (name === "entry") {
      const a = joinJs(sansReturn, ";\n") + (sansReturn.length ? ';\n' : '');
      const b = resolved[resolved.length - 1].js;
      bundle[name] = `${a}console.log(${b});`;
      return;
    }
    if (sansReturn.length) {
      bundle[name] = `ops["${name}"] = function(${params}) {
  ${joinJs(sansReturn, ";\n")};
  return ${resolved[resolved.length - 1].js};
}`;
    } else {
      bundle[name] = `ops["${name}"] = (${params}) => ${resolved[0].js};`;
    }
  });
  return bundle;
}

const resolveNode = (n: Node) =>
  isToken(n) ? resolveToken(n) : resolveExpression(n);

function resolveToken(node: Token): Resolved {
  switch (node.typ) {
    case "num":
      return { js: node.text, as: ["num"] };
    case "str":
      return { js: `"${node.text}"`, as: ["str"] };
    case "sym": {
      if (ops[node.text]) {
        return {
          js: `ops['${node.text}']`,
          bundle: transOps[node.text].standalone,
        };
      }
      return { js: node.text, as: ["any"] };
    }
  }
  return { js: "?", as: ["null"] };
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
    const op = transOps[node.text];
    if (op) {
      const { inline, standalone } = op;
      return inline
        ? args => ({ ...inline(args), as: ops[node.text]?.returns ?? ["any"] })
        : args => ({
            js: `ops[${node.text}](${joinJs(args, ", ")})`,
            bundle: standalone,
          });
    }
    return (args: Resolved[]) => ({
      js: `ops["${node.text}"](${joinJs(args, ", ")})`,
      as: ["any"],
    });
  } else {
    const { js, bundle } = resolveExpression(node);
    return args => ({
      js: `${js}(${joinJs(args, ", ")})`,
      as: ["any"],
      bundle,
    });
  }
}

function resolveArg(arg: Node): Resolved {
  return isToken(arg) ? resolveToken(arg) : resolveExpression(arg);
}

type ResolvedOperation = { inline?: Transformer; standalone: JsBundle };

const asBool =
  "const asBool = x => !(x === false || x === undefined || x === null);";

const transOps: { [name: string]: ResolvedOperation } = {
  inc: {
    inline: ([n]) => ({ js: `${n.js} + 1` }),
    standalone: { inc: "ops['inc'] = ([n]) => n + 1;" },
  },
  dec: {
    inline: ([n]) => ({ js: `${n.js} - 1` }),
    standalone: { dec: "ops['dec'] = ([n]) => n + 1;" },
  },
  "+": {
    inline: args => ({
      js: joinJs(args, " + "),
    }),
    standalone: {
      "+": `ops['+'] = (...args) => args.reduce((a, b) => a + b);`,
    },
  },
  "-": {
    inline: args => ({
      js: joinJs(args, " - "),
    }),
    standalone: {
      "-": `ops['-'] = (...args) => args.reduce((a, b) => a - b);`,
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
  str: {
    inline: args => ({
      js: joinJs(args, " + "),
    }),
    standalone: { str: `ops['str'] = (...args) => args.join('');` },
  },
  vec: {
    inline: args => ({ js: `[${joinJs(args, ", ")}]` }),
    standalone: { vec: `ops['vec'] = (...args) => args;` },
  },
  neg: { inline: ([n]) => ({ js: `-${n.js}` }), standalone: {} },
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
      as: ["any"],
      bundle: { asBool },
    }),
    standalone: {},
  },
  when: {
    inline: ([a, b]) => ({
      js: `(asBool(${a.js}) ? ${b.js} : null)`,
      as: ["any"],
      bundle: { asBool },
    }),
    standalone: {},
  },
  time: {
    inline: () => ({ js: "new Date().getTime()", as: ["num"] }),
    standalone: { time: "ops['time'] = () => new Date().getTime();" },
  },
  version: {
    inline: () => ({ js: `${insituxVersion}` }),
    standalone: { version: `ops['version'] = () => ${insituxVersion};` },
  },
};
