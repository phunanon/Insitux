import { insituxVersion } from ".";
import { isToken, NamedNodes, parseParams, Node, Token } from "./parse";

type JsBlob = string;
type JsBundle = { [name: string]: JsBlob };
type Resolved = {
  js: string;
  as: ("any" | "null" | "boo" | "num" | "str" | "vec")[];
  bundle?: JsBundle;
};

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
    const noReturnExpressions = resolved.slice(0, -1);
    if (noReturnExpressions.length) {
      bundle[name] = `ops["${name}"] = function(${params}) {
  ${noReturnExpressions.map(x => x.js).join(";\n")};
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
    case "sym":
      return { js: node.text, as: ["any"] };
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
    const op = ops[node.text];
    if (op) return op;
    return (args: Resolved[]) => ({
      js: `ops["${node.text}"](${args.map(x => x.js).join(", ")})`,
      as: ["any"],
    });
  } else {
    //TODO (())
    return () => ({ js: `//!!!!`, as: ["null"] });
  }
}

function resolveArg(arg: Node): Resolved {
  return isToken(arg) ? resolveToken(arg) : resolveExpression(arg);
}

const ops: { [name: string]: Transformer } = {
  inc: ([n]) => ({ js: `${n.js} + 1`, as: ["num"] }),
  dec: ([n]) => ({ js: `${n.js} - 1`, as: ["num"] }),
  "+": args => ({
    js: args.map(x => x.js).join(" + "),
    as: ["num"],
  }),
  "-": args => ({
    js: args.map(x => x.js).join(" - "),
    as: ["num"],
  }),
  "<": args => ({
    js: args
      .slice(0, -1)
      .map((x, i) => `${x.js} < ${args[i + 1].js}`)
      .join(" && "),
    as: ["boo"],
  }),
  str: args => ({
    js: args.map(x => x.js).join(" + "),
    as: ["str"],
  }),
  vec: args => ({ js: `[${args.map(x => x.js).join(", ")}]`, as: ["vec"] }),
  neg: ([n]) => ({ js: `-${n.js}`, as: ["num"] }),
  print: args => ({
    js: `console.log(${args.map(x => x.js).join(" + ")})`,
    as: ["null"],
  }),
  if: ([a, b, c]) => ({
    js: `(${a.js} ? ${b.js} : ${c.js})`,
    as: ["any"],
  }),
  time: () => ({ js: "new Date().getTime()", as: ["num"] }),
  version: () => ({ js: `${insituxVersion}`, as: ["str"] }),
};
