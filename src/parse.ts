import { arityCheck, keyOpErr, numOpErr, typeCheck } from "./checks";
import { makeClosure } from "./closure";
import * as pf from "./poly-fills";
const { has, push, isNum, len } = pf;
const { substr, subIdx } = pf;
import { ParamsShape, Func, Funcs, Ins, ops, Val, syntaxes } from "./types";
import { assertUnreachable, InvokeError, ErrCtx } from "./types";
import { _key, _num, val2str } from "./val";

export type Token = {
  typ: "str" | "num" | "sym" | "rem" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
export type DefAndVals = { def: Ins; val: Ins[] };

type Node = Token | Node[];
type ErrIns = { typ: "err"; value: string; errCtx: ErrCtx };
type ParserIns = Ins | ErrIns;
const nullVal: Val = { t: "null", v: undefined };
const falseVal = <Val>{ t: "bool", v: false };
type NamedNodes = { name: string; nodes: Node[] };

const isToken = (node: Node | undefined): node is Token =>
  !!node && "errCtx" in node;
const symAt = (node: Node, pos = 0) => {
  if (isToken(node)) {
    return "";
  }
  const arg = node[pos];
  return (isToken(arg) && ["sym", "str"].includes(arg.typ) && arg.text) || "";
};
const token2str = ({ typ, text }: Token): string =>
  typ === "str" ? `"${text}"` : text;
function node2str(nodes: Node[]): string {
  const sym0 = symAt(nodes, 0);
  const isClosure = ["#", "@"].includes(sym0);
  if (isClosure) {
    nodes = nodes.slice(1);
  }
  return `${isClosure ? sym0 : ""}(${nodes
    .map(n => (isToken(n) ? token2str(n) : node2str(n)))
    .join(" ")})`;
}

/** Inserts pop instruction after penultimate body expression */
const poppedBody = (expressions: ParserIns[][]): ParserIns[] => {
  if (len(expressions) === 1) {
    return expressions.flat();
  }
  const lastExp = expressions[len(expressions) - 1];
  const truncatedExps = expressions.slice(0, len(expressions) - 1);
  const popIns = <ParserIns>{
    typ: "pop",
    value: len(truncatedExps),
    errCtx: lastExp[0].errCtx,
  };
  return [...truncatedExps.flat(), popIns, ...lastExp];
};

export function tokenise(
  code: string,
  invokeId: string,
  doTransforms = true,
  emitComments = false,
) {
  const rawTokens: Token[] = [];
  const isDigit = (ch: string) => ch && "0123456789".includes(ch);
  let inString = false as false | "'" | '"';
  let [line, col, inStringAt] = [1, 0, [1, 0] as [number, number]];
  let [inSymbol, inNumber, inHex] = [false, false, false];
  for (let i = 0, l = code.length; i < l; ++i) {
    const c = code[i];
    const nextCh = i + 1 !== l ? code[i + 1] : "";
    ++col;
    if (c === "\\" && inString) {
      rawTokens[len(rawTokens) - 1].text += doTransforms
        ? { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'" }[nextCh] ||
          (nextCh === "\\" ? "\\" : `\\${nextCh}`)
        : `\\${nextCh}`;
      ++col;
      ++i;
      continue;
    }
    const errCtx: ErrCtx = { invokeId, line, col };
    if ((c === '"' || c === "'") && (!inString || inString === c)) {
      inString = inString ? false : c;
      if (inString) {
        inStringAt = [line, col];
        rawTokens.push({ typ: "str", text: "", errCtx });
      }
      inNumber = inSymbol = false;
      continue;
    }
    const isWhite = " \t\n\r,".includes(c);
    if (!inString && isWhite) {
      inSymbol = false;
      inNumber &&= c === ",";
      if (c === "\n") {
        ++line;
        col = 0;
      }
      continue;
    }
    if (inString && c === "\n") {
      ++line;
      col = 0;
      rawTokens[len(rawTokens) - 1].text += c;
      continue;
    }
    if (!inString && c === ";") {
      const nl = subIdx(substr(code, ++i), "\n");
      const text = substr(code, i, nl > 0 ? nl : l - i);
      i += text.length;
      ++line;
      col = 0;
      if (emitComments) {
        rawTokens.push({ typ: "rem", text, errCtx });
      }
      continue;
    }
    const isParen = "()[]{}".includes(c);
    //Allow one . per number, or hex, or binary, else convert into symbol
    if (inNumber && !isDigit(c)) {
      const hexStart = c === "x" && rawTokens[len(rawTokens) - 1].text === "0";
      inHex = inHex || hexStart;
      inNumber =
        (c === "b" && rawTokens[len(rawTokens) - 1].text === "0") ||
        (c === "." && !rawTokens[len(rawTokens) - 1].text.includes(".")) ||
        (inHex && (hexStart || "ABCDEFabcdef".includes(c)));
      if (!inNumber && !isParen && !isWhite) {
        inSymbol = true;
        rawTokens[len(rawTokens) - 1].typ = "sym";
      }
    }
    //Stop scanning symbol if a paren
    if (inSymbol && isParen) {
      inSymbol = false;
    }
    //If we just finished concatenating a token
    if (!inString && !inSymbol && !inNumber) {
      if (isParen) {
        const text = subIdx("[{(", c) === -1 ? ")" : "(";
        rawTokens.push({ typ: text, text: doTransforms ? text : c, errCtx });
        if (doTransforms && (c === "[" || c === "{")) {
          rawTokens.push({
            typ: "sym",
            text: c === "[" ? "vec" : "dict",
            errCtx,
          });
        }
        continue;
      }
      inNumber =
        isDigit(c) ||
        (c === "." && isDigit(nextCh)) ||
        (c === "-" && (isDigit(nextCh) || nextCh === "."));
      inHex = inSymbol = !inNumber;
      const typ: Token["typ"] = inSymbol ? "sym" : "num";
      rawTokens.push({ typ, text: "", errCtx });
    }
    rawTokens[len(rawTokens) - 1].text += c;
  }
  //Handle string interpolation
  let innerStringError: [number, number] | undefined;
  const tokens = rawTokens.flatMap((token): Token[] => {
    if (!doTransforms) return [token];
    if (token.typ !== "str") return [token];
    if (!token.text.includes("{")) return [token];
    //e.g. "Hello, {name}!" becomes (str "Hello, " name "!")
    //e.g. "2 + 2 = {+ 2 2}" becomes (str "2 + 2 = " (+ 2 2))
    //e.g. "Result: {(func)}" becomes (str "Result: " (func))
    //e.g. "{"{2}"}" becomes (str 2)
    //e.g. #'<p>{%}</p>' becomes #(str "<p>" % "</p>")
    //e.g. "Hello, \{name\}" stays the same
    let intTokens: Token[] = [
      { ...token, typ: "(" },
      { ...token, typ: "sym", text: "str" },
    ];
    let escaped = false;
    let buffer = "";
    let depth = 0;
    for (let c = 0; c < token.text.length; ++c) {
      const ch = token.text[c]!;
      if (escaped) {
        escaped = false;
        buffer += ch;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (!depth) {
        //When outer, check if we need to switch to inner
        if (ch === "{") {
          ++depth;
          if (buffer) intTokens.push({ ...token, typ: "str", text: buffer });
          buffer = "";
        } else {
          buffer += ch;
        }
      } else {
        //When inner
        if (ch === "{" || ch === "(" || ch === "[") {
          ++depth;
        } else if (ch === "}" || ch === ")" || ch === "]") {
          --depth;
          if (depth <= 0 && ch === "}") {
            const { tokens, stringError } = tokenise(buffer, invokeId);
            if (stringError) innerStringError = stringError;
            if (tokens.length !== 1) intTokens.push({ ...token, typ: "(" });
            intTokens.push(...tokens);
            if (tokens.length !== 1) intTokens.push({ ...token, typ: ")" });
            buffer = "";
            continue;
          }
        }
        buffer += ch;
      }
    }
    if (depth) buffer += "{"; //Unclosed
    if (buffer) intTokens.push({ ...token, typ: "str", text: buffer });
    return [...intTokens, { ...token, typ: ")", text: ")" }];
  });
  const stringError = inString ? inStringAt : innerStringError || undefined;
  return { tokens, stringError };
}

/** Parses tokens into a tree where each node is a token or token list. */
function treeise(tokens: Token[]): Node[] {
  const nodes: Node[] = [];
  const _treeise = (tokens: Token[]): Node => {
    let prefix: Token | undefined;
    if (
      len(tokens) > 1 &&
      tokens[0].typ === "sym" &&
      "@#".includes(tokens[0].text) &&
      tokens[1].typ === "("
    ) {
      prefix = tokens.shift()!;
    }
    const token = tokens.shift();
    if (!token) {
      return [];
    }
    if (token.typ !== "(" && token.typ !== ")") {
      return token;
    }
    const nodes: Node[] = prefix ? [prefix] : [];
    while (tokens[0].typ !== ")") {
      nodes.push(_treeise(tokens));
    }
    tokens.shift();
    return nodes;
  };
  while (len(tokens)) {
    nodes.push(_treeise(tokens));
  }
  return nodes;
}

/** Separates function nodes and non-function nodes,
 * with non-function nodes collected into (function entry ...)
 * if there are any.*/
function collectFuncs(
  nodes: Node[],
): ({ name: string; nodes: Node[] } | { err: string; errCtx: ErrCtx })[] {
  const funcs: ReturnType<typeof collectFuncs> = [];
  const entries: Node[] = [];
  nodes.forEach(node => {
    if (!isToken(node) && isToken(node[0]) && symAt(node) === "function") {
      const name = symAt(node, 1);
      const errCtx = node[0].errCtx;
      if (!name) {
        funcs.push({ err: "nameless function", errCtx });
      } else if (len(node) < 3) {
        funcs.push({ err: "empty function body", errCtx });
      } else if (ops[name]) {
        funcs.push({ err: "redeclaration of built-in operation", errCtx });
      } else {
        funcs.push({ name, nodes: node.slice(2) });
      }
    } else {
      entries.push(node);
    }
  });
  if (len(entries)) {
    funcs.push({ name: "entry", nodes: entries });
  }
  return funcs;
}

const parseNode = (node: Node, params: ParamsShape) =>
  isToken(node) ? parseArg(node, params) : parseForm(node, params);

function parseForm(
  nodes: Node[],
  params: ParamsShape,
  doArityCheck = true,
): ParserIns[] {
  if (!len(nodes)) {
    return [];
  }
  const formParams = [...params];

  const nodeParser = (node: Node) => parseNode(node, formParams);
  let firstNode = nodes.shift()!;
  let head = nodeParser(firstNode);
  const { errCtx } = head[0];

  if (isToken(firstNode) && firstNode.typ === "sym") {
    //1-off arity deficiency rewritten as closure
    if (firstNode.text in ops) {
      const { exactArity, minArity } = ops[firstNode.text];
      const a = exactArity ?? minArity;
      if (a && a !== 1 && len(nodes) + 1 === a) {
        nodes.unshift(firstNode);
        firstNode = { typ: "sym", text: "@", errCtx: firstNode.errCtx };
      }
    }
    if (
      ["var", "let"].includes(firstNode.text) &&
      len(nodes) &&
      len(nodes) % 2
    ) {
      nodes.unshift(firstNode);
      nodes.push({ typ: "sym", text: "%", errCtx: firstNode.errCtx });
      firstNode = { typ: "sym", text: "#", errCtx: firstNode.errCtx };
    }
    const { text: op, errCtx } = firstNode;
    const err = (m: string, eCtx = errCtx) => [
      <ParserIns>{ typ: "err", value: m, errCtx: eCtx },
    ];

    const parseDefVal = (
      op: "var" | "let",
      def: Node,
      val: Node,
    ): ParserIns[] | DefAndVals | "shapeless" => {
      const valIns = nodeParser(val);
      const okValIns: Ins[] = [];
      for (const ins of valIns) {
        if (ins.typ === "err") {
          return [ins];
        }
        okValIns.push(ins);
      }
      if (isToken(def)) {
        const [defIns] = nodeParser(def);
        if (defIns.typ === "val" && defIns.value.t === "wild") {
          return { val: okValIns, def: { typ: op, value: "_", errCtx } };
        }
        if (defIns.typ === "val" && defIns.value.t === "str") {
          return err(
            `${op} name must be a symbol, not a literal string`,
            defIns.errCtx,
          );
        }
        if (defIns.typ === "ref") {
          if (has(syntaxes, defIns.value)) {
            return err(`"${defIns.value}" cannot be redefined: already exists`);
          }
          return {
            val: okValIns,
            def: { typ: op, value: defIns.value, errCtx },
          };
        }
        const errMsg =
          defIns.typ === "val"
            ? `"${val2str(defIns.value)}" cannot be redefined: already exists`
            : `invalid ${op} name`;
        return err(errMsg, defIns.errCtx);
      } else {
        const { shape, errors } = parseParams([def], true);
        if (len(errors)) {
          return errors;
        }
        if (!len(shape)) {
          return "shapeless";
        }
        const typ = op === "var" ? "dva" : "dle";
        return { val: okValIns, def: { typ, value: shape, errCtx } };
      }
    };

    const needsCond = ["if", "if-not", "when", "unless", "match", "satisfy"];
    if (has(needsCond, op) && !len(nodes)) {
      return err("provide a condition");
    } else if (op === "if" || op === "if-not") {
      if (len(nodes) === 1) {
        return err("provide at least one branch");
      } else if (len(nodes) > 3) {
        return err(`provide one or two branches, not ${len(nodes)}`);
      }
      const parsed = nodes.map(nodeParser);
      const [cond, branch1] = parsed;
      let branch2 = parsed[2];
      const ifN = op === "if-not" && [
        <Ins>{ typ: "val", value: { t: "func", v: "not" }, errCtx },
        <Ins>{ typ: "exe", value: 1, errCtx },
      ];
      if (!branch2) {
        branch2 = [{ typ: "val", value: nullVal, errCtx }];
      }
      return [
        ...cond,
        ...(ifN || []),
        { typ: "if", value: len(branch1) + 1, errCtx },
        ...branch1,
        { typ: "jmp", value: len(branch2), errCtx },
        ...branch2,
      ];
    } else if (op === "when" || op === "unless") {
      if (len(nodes) === 1) {
        return err("provide a body");
      }
      const parsed = nodes.map(nodeParser);
      const [cond, body] = [parsed[0], parsed.slice(1)];
      const bodyIns = poppedBody(body);
      const unlessIns: Ins[] =
        op === "unless"
          ? [
              { typ: "val", value: { t: "func", v: "not" }, errCtx },
              { typ: "exe", value: 1, errCtx },
            ]
          : [];
      return [
        ...cond,
        ...unlessIns,
        { typ: "if", value: len(bodyIns) + 1, errCtx },
        ...bodyIns,
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: nullVal, errCtx },
      ];
    } else if (op === "match" || op === "satisfy") {
      const opIns: Ins["typ"] = op === "match" ? "mat" : "sat";
      const parsed = nodes.map(nodeParser);
      const [cond, args] = [parsed[0], parsed.slice(1)];
      const otherwise: ParserIns[] = len(args) % 2 ? args.pop()! : [];
      if (!len(args)) {
        return err("provide at least one case");
      }
      const ins: ParserIns[] = cond;
      for (let i = 0, max = len(args) - 1; i < max; i += 2) {
        const [a, when] = [args[i], args[i + 1]];
        push(ins, a);
        ins.push({ typ: opIns, value: len(when) + 1, errCtx: a[0].errCtx });
        push(ins, when);
        ins.push({ typ: "jmp", value: 0, errCtx });
      }
      ins.push({ typ: "pop", value: 1, errCtx });
      if (len(otherwise)) {
        push(ins, otherwise);
      } else {
        ins.push({ typ: "val", value: falseVal, errCtx });
      }
      //Calculate jmp-to-ends
      for (let i = 0, max = len(ins); i < max; ++i) {
        const next = ins[i];
        if (next.typ === "jmp" && !next.value) {
          next.value = max - i - 1;
        }
      }
      return ins;
    } else if (op === "catch") {
      if (len(nodes) < 2) {
        return err("provide at least 2 arguments");
      }
      const when = nodeParser(nodes.pop()!);
      const body = nodes.flatMap(nodeParser);
      return [...body, { typ: "cat", value: len(when), errCtx }, ...when];
    } else if (op === "and" || op === "or" || op === "while") {
      const args = nodes.map(nodeParser);
      if (len(args) < 2) {
        return err("provide at least 2 arguments");
      }
      const ins: ParserIns[] = [];
      if (op === "while") {
        const [head, body] = [args[0], args.slice(1)];
        const flatBody = poppedBody(body);
        const ifJmp = len(flatBody) + 2;
        const looJmp = -(len(head) + len(flatBody) + 3);
        ins.push({ typ: "val", value: nullVal, errCtx });
        push(ins, head);
        ins.push({ typ: "if", value: ifJmp, errCtx });
        ins.push({ typ: "pop", value: 1, errCtx });
        push(ins, flatBody);
        ins.push({ typ: "loo", value: looJmp, errCtx });
        //Replace break/continue with calculated jumps
        for (let i = 0, max = len(ins); i < max; ++i) {
          if (ins[i].typ === "brk") {
            ins[i] = { typ: "jmp", value: max - i - 1, errCtx };
          } else if (ins[i].typ === "cnt") {
            ins[i] = { typ: "jmp", value: -i, errCtx };
          }
        }
        return ins;
      }
      let insCount = args.reduce((acc, a) => acc + len(a), 0);
      insCount += len(args); //+1 for each if/or ins
      insCount += Number(op === "and");
      const typ = op === "and" ? "if" : "or";
      for (let a = 0; a < len(args); ++a) {
        push(ins, args[a]);
        insCount -= len(args[a]);
        ins.push({ typ, value: insCount, errCtx });
        --insCount;
      }
      if (op === "and") {
        push(ins, [
          { typ: "val", value: <Val>{ t: "bool", v: true }, errCtx },
          { typ: "jmp", value: 1, errCtx },
        ]);
      }
      ins.push({ typ: "val", value: falseVal, errCtx });
      return ins;
    } else if (op === "loop") {
      if (len(nodes) < 3) {
        return err("provide at least 3 arguments");
      }
      const parsed = nodes.map(nodeParser);
      const symNode = nodes[1];
      const body = poppedBody(parsed.slice(2));
      if (!isToken(symNode)) {
        return err("argument 2 must be symbol");
      }
      //(let sym 0 sym-limit n) ... body ...
      //(if (< (let sym (inc sym)) sym-limit) <exit> <loo>)
      const ins: ParserIns[] = [
        { typ: "val", value: { t: "num", v: 0 }, errCtx },
        { typ: "let", value: symNode.text, errCtx },
        ...parsed[0],
        { typ: "let", value: symNode.text + "-limit", errCtx },
        { typ: "pop", value: 1, errCtx },
        ...body,
        { typ: "ref", value: symNode.text, errCtx },
        { typ: "val", value: { t: "func", v: "inc" }, errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "let", value: symNode.text, errCtx },
        { typ: "ref", value: symNode.text + "-limit", errCtx },
        { typ: "val", value: { t: "func", v: "<" }, errCtx },
        { typ: "exe", value: 2, errCtx },
        { typ: "if", value: 2, errCtx },
        { typ: "pop", value: 1, errCtx },
        { typ: "loo", value: -(len(body) + 10), errCtx },
      ];
      return ins;
    } else if (op === "var" || op === "let") {
      const defs = nodes.filter((n, i) => !(i % 2));
      const vals = nodes.filter((n, i) => !!(i % 2));
      if (!len(defs)) {
        return err("provide at least 1 declaration name and value");
      } else if (len(defs) > len(vals)) {
        return err("provide a value after each declaration name");
      }
      const ins: ParserIns[] = [];
      for (let d = 0, lim = len(defs); d < lim; ++d) {
        const def = defs[d];
        const val = vals[d];
        const parsedDefVal = parseDefVal(op, def, val);
        if (parsedDefVal === "shapeless") {
          return err(
            `${op} name must be a symbol or destructuring, not expression`,
          );
        }
        if (Array.isArray(parsedDefVal)) {
          return parsedDefVal; //Errors
        }
        push(ins, parsedDefVal.val);
        ins.push(parsedDefVal.def);
      }
      return ins;
    } else if (op === "var!" || op === "let!") {
      //Rewrite e.g. (var! a + 1) -> (var a (+ 1 a))
      if (len(nodes) < 2) {
        return err("provide 1 declaration name and 1 function");
      }
      const parsed = nodes.map(nodeParser);
      const [def, func, args] = [parsed[0][0], parsed[1], parsed.slice(2)];
      if (def.typ !== "ref") {
        return err("declaration name must be symbol", def.errCtx);
      }
      const typ = op === "var!" ? "var" : "let";
      const ins: ParserIns[] = [
        ...args.flat(),
        { typ: "ref", value: def.value, errCtx },
        ...func,
        { typ: "exe", value: len(args) + 1, errCtx },
        { typ, value: def.value, errCtx },
      ];
      return ins;
    } else if (op === "#" || op === "@" || op === "fn") {
      const pins: ParserIns[] = [];
      const name = node2str([firstNode, ...nodes]);
      /** Used to exclude from capturing in makeClosure. */
      const cloParams: string[] = [];
      /** Used within the closure, with shadowing of formParams as needed. */
      const cloFormParams: ParamsShape = [];
      /** Informs capturing of child-closure references to parent params. */
      const outerParams = formParams.map(p => p.name);
      /** E.g. `(fn x)` */
      let monoFnBody = false;
      if (op === "fn") {
        const { shape, errors } = parseParams(nodes, false);
        const paramNames = shape.map(p => p.name);
        push(cloParams, paramNames);
        push(pins, errors);
        //Closures are allowed to see both parent parameters and their own as
        //  they then pick from them to capture appropriately. However, we need
        //  to shadow parent parameters with the same name as child parameters.
        const shadowed = outerParams.filter(p => has(paramNames, p));
        push(
          cloFormParams,
          formParams.filter(p => !has(shadowed, p.name)),
        );
        push(cloFormParams, shape);

        if (!len(nodes)) {
          return err("provide a body");
        }
        monoFnBody = len(nodes) === 1;
        nodes.unshift({ typ: "sym", text: "do", errCtx });
      } else {
        push(cloFormParams, formParams);
      }
      //Rewrite partial closure to #(... [body] args)
      if (op === "@") {
        const firstSym = symAt(nodes, 0);
        if (has(syntaxes, firstSym)) {
          const { errCtx } = nodes[0] as Token;
          return err(
            `"${firstSym}" syntax unavailable in partial closure`,
            errCtx,
          );
        }
        nodes = [
          { typ: "sym", text: "...", errCtx },
          ...nodes,
          { typ: "sym", text: "args", errCtx },
        ];
      }
      push(pins, parseForm(nodes, cloFormParams, op !== "@"));
      const cins = <Ins[]>pins.filter(i => i.typ !== "err");
      const errors = pins.filter(i => i.typ === "err");
      if (len(errors)) {
        return errors;
      }
      //Remove do exe when fn body is only one expression
      if (monoFnBody) {
        cins.pop();
        cins.pop();
      }
      const value = makeClosure(name, outerParams, cloParams, cins);
      return [{ typ: "clo", value, errCtx }, ...cins];
    } else if (op === "->") {
      if (!len(nodes)) {
        return err(`missing body`, errCtx);
      }
      const newNodes = nodes.reduce((acc, node) => [node, acc]) as Node[];
      const parsed = parseForm(newNodes, formParams);
      return parsed;
    } else if (op === "for") {
      const defAndVals: DefAndVals[] = [];
      let bodyAt = 0;
      //Separate body from def/val pairs
      for (let n = 0, lim = len(nodes); n < lim; ++n) {
        if (
          n === lim - 1 ||
          (!isToken(nodes[n]) && symAt(nodes[n]) !== "vec")
        ) {
          bodyAt = n;
          break;
        }
        const parsedDefVal = parseDefVal("let", nodes[n], nodes[n + 1]);
        if (parsedDefVal === "shapeless") {
          bodyAt = n;
          break;
        }
        //If this is an error, return it
        if (Array.isArray(parsedDefVal)) {
          return parsedDefVal;
        }
        defAndVals.push(parsedDefVal);
        ++n;
      }
      if (!len(defAndVals)) {
        return err("at least one collection is required");
      }
      if (!bodyAt) {
        return err("body is required");
      }
      const body = poppedBody(nodes.slice(bodyAt).map(nodeParser));
      const okBody: Ins[] = [];
      const errors: ErrIns[] = [];
      for (const ins of body) {
        if (ins.typ === "err") {
          errors.push(ins);
        } else {
          okBody.push(ins);
        }
      }
      if (len(errors)) {
        return errors;
      }
      const collInsLens = defAndVals.map(dav => 1 + len(dav.val));
      const bodyLen = len(okBody);
      const totalLen = collInsLens.reduce((sum, l) => sum + l, bodyLen);
      return [
        { typ: "for", collInsLens, bodyLen, totalLen, errCtx },
        ...defAndVals.flatMap(dav => [dav.def, ...dav.val]),
        ...okBody,
      ];
    } else if (op === "continue" || op === "break") {
      return [{ typ: op === "break" ? "brk" : "cnt", errCtx }];
    }

    //Operation arity check, optionally disabled for partial closures
    if (ops[op] && doArityCheck) {
      const errors = arityCheck(op, len(nodes), errCtx);
      const err = (value: string, eCtx = errCtx) => [
        <ParserIns>{ typ: "err", value, errCtx: eCtx },
      ];
      push(head, errors?.map(e => err(e.m)[0]) ?? []);
      if (!errors) {
        //Upgrade some math and logic functions to their faster counterparts
        if (len(nodes) === 2 && ops[`fast${op}`]) {
          head = nodeParser({ typ: "sym", text: `fast${op}`, errCtx });
        }
      }
    }
  }

  const args = nodes.map(nodeParser);
  const firstSym = symAt([firstNode]);
  if (firstSym === "return-when" || firstSym === "return-unless") {
    if (len(args) < 1) {
      return [{ typ: "err", value: "provide a condition", errCtx }];
    }
    const cond = args[0];
    const params = args.slice(1);
    const flatParams = params.flat();
    const unlessIns: Ins[] =
      firstSym === "return-unless"
        ? [
            { typ: "val", value: { t: "func", v: "not" }, errCtx },
            { typ: "exe", value: 1, errCtx },
          ]
        : [];
    return [
      ...cond,
      ...unlessIns,
      <ParserIns>{ typ: "if", value: len(flatParams) + 1, errCtx },
      ...flatParams,
      <ParserIns>{ typ: "ret", value: !!(len(args) - 1), errCtx },
    ];
  }
  const ins: ParserIns[] = args.flat();
  if (firstSym === "return") {
    return [...ins, { typ: "ret", value: !!len(args), errCtx }];
  } else if (firstSym === "recur") {
    return [...ins, { typ: "rec", value: len(args), errCtx }];
  } else if (len(head) === 1 && head[0].typ === "ref") {
    //Transform potential external function into string
    const { value: v, errCtx } = head[0];
    head[0] = { typ: "val", value: { t: "str", v }, errCtx };
  }
  push(ins, head);
  const typ =
    len(head) > 1 || ["npa", "upa"].includes(head[0].typ) ? "exa" : "exe";
  return [...ins, { typ, value: len(args), errCtx }];
}

function errCtxDict(errCtx: ErrCtx): Val {
  const keys: Val[] = [_key(":line"), _key(":col")];
  const vals: Val[] = [_num(errCtx.line), _num(errCtx.col)];
  return { t: "dict", v: { keys, vals } };
}

function parseArg(node: Node, params: ParamsShape): ParserIns[] {
  if (!isToken(node)) {
    return len(node) ? parseForm(node, params) : [];
  }

  const { errCtx } = node;
  if (node.typ === "str") {
    return [{ typ: "val", value: { t: "str", v: node.text }, errCtx }];
  } else if (node.typ === "num") {
    return [{ typ: "val", value: { t: "num", v: Number(node.text) }, errCtx }];
  } else if (node.typ === "sym") {
    const { text } = node;
    const paramNames = params.map(({ name }) => name);
    if (text === "true" || text === "false") {
      return [
        { typ: "val", value: <Val>{ t: "bool", v: text === "true" }, errCtx },
      ];
    } else if (text === "null") {
      return [{ typ: "val", value: nullVal, errCtx }];
    } else if (text === "_") {
      return [{ typ: "val", value: { t: "wild", v: undefined }, errCtx }];
    } else if (text.startsWith(":")) {
      return [{ typ: "val", value: <Val>{ t: "key", v: text }, errCtx }];
    } else if (
      text === "%" ||
      (text.startsWith("%") && isNum(substr(text, 1)))
    ) {
      const value = text === "%" ? 0 : Number(substr(text, 1));
      if (value < 0) {
        return [{ typ: "val", value: nullVal, errCtx }];
      }
      return [{ typ: "upa", value, text, errCtx }];
    } else if (has(paramNames, text)) {
      const { position, rest } = params.find(({ name }) => name === text)!;
      if (len(position) === 1 && !rest) {
        return [{ typ: "npa", value: position[0], text, errCtx }];
      }
      return [{ typ: "dpa", value: position, rest, text, errCtx }];
    } else if (text === "args") {
      return [{ typ: "upa", value: -1, text: "args", errCtx }];
    } else if (text === "err-ctx") {
      return [{ typ: "val", value: errCtxDict(errCtx), errCtx }];
    } else if (text === "PI" || text === "E") {
      const v = text === "PI" ? 3.141592653589793 : 2.718281828459045;
      return [{ typ: "val", value: { t: "num", v }, errCtx }];
    } else if (ops[text]) {
      return [{ typ: "val", value: <Val>{ t: "func", v: text }, errCtx }];
    }
    return [{ typ: "ref", value: text, errCtx }];
  }
  return [];
}

/** Consumes some tokens and returns ParamsShape.
 * Example inputs:
 * "(fn "   a [b [c]] d [d c b a]
 * "(var " [a] [1 2] b [1 2]
 * "(function " [x] (print x) x
 * "(function " x [x]
 * "(fn "
 * "(function "
 * */
function parseParams(
  nodes: Node[],
  consumeLast: boolean,
  position: number[] = [],
): { shape: ParamsShape; errors: ErrIns[] } {
  const shape: ParamsShape = [];
  const errs: ErrIns[] = [];
  for (
    let n = 0;
    len(nodes) > (consumeLast ? 0 : 1) &&
    (isToken(nodes[0]) || symAt(nodes[0]) === "vec");
    ++n
  ) {
    const param = nodes.shift()!;

    if (!isToken(param)) {
      param.shift(); //remove vec
      const parsed = parseParams(param, true, [...position, n]);
      push(shape, parsed.shape);
      push(errs, parsed.errors);
      continue;
    }

    const { typ, errCtx } = param;
    const err = (value: string) => errs.push({ typ: "err", value, errCtx });

    if (typ === "sym") {
      if (param.text === "&") {
        if (!len(nodes)) {
          err("provide rest parameter name");
          continue;
        }
        const rest = nodes.shift()!;
        if (!isToken(rest) || rest.typ !== "sym") {
          err("rest parameter must be a symbol");
          continue;
        }
        shape.push({ name: rest.text, position: [...position, n], rest: true });
      } else {
        shape.push({ name: param.text, position: [...position, n] });
      }
    } else if (typ !== "str") {
      err("provide parameter name");
    }
  }
  return { shape, errors: errs };
}

function compileFunc({ name, nodes }: NamedNodes): Func | InvokeError {
  const { shape: params, errors } = parseParams(nodes, false);
  const ins = [...errors, ...nodes.flatMap(node => parseArg(node, params))];
  //Check for useless tail return
  const lastIns = ins[len(ins) - 1];
  if (lastIns && lastIns.typ === "ret") {
    ins.push({
      typ: "err",
      value: "useless tail return - put the value itself",
      errCtx: lastIns.errCtx,
    });
  }
  //Check for parse errors
  for (let i = 0, lim = len(ins); i < lim; i++) {
    const errIns = ins[i];
    if (errIns.typ === "err") {
      const { value, errCtx } = errIns;
      return <InvokeError>{ e: "Parse", m: value, errCtx };
    }
  }
  return { name, ins: <Ins[]>ins };
}

function findParenImbalance(
  tokens: Token[],
  numL: number,
  numR: number,
): [number, number] {
  //Scan for first instance of untimely closed
  //  or last instance of unclosed open
  const untimely = numR >= numL;
  const [l, r] = [untimely ? "(" : ")", untimely ? ")" : "("];
  const direction = untimely ? 1 : -1;
  for (
    let lim = len(tokens), t = untimely ? 0 : lim - 1, depth = 0;
    untimely ? t < lim : t >= 0;
    t += direction
  ) {
    const {
      typ,
      errCtx: { line, col },
    } = tokens[t];
    depth += Number(typ === l) - Number(typ === r);
    if (depth < 0) {
      return [line, col];
    }
  }
  return [0, 0];
}

function tokenErrorDetect(
  stringError: [number, number] | undefined,
  tokens: Token[],
) {
  const invokeId = len(tokens) ? tokens[0].errCtx.invokeId : "";
  const errors: InvokeError[] = [];
  const err = (m: string, errCtx: ErrCtx) =>
    errors.push({ e: "Parse", m, errCtx });

  //Check for string imbalance
  if (stringError) {
    const [line, col] = stringError;
    err("unclosed string", { invokeId, line, col });
    return errors;
  }

  //Check for paren imbalance
  const countTyp = (t: Token["typ"]) =>
    len(tokens.filter(({ typ }) => typ === t));
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { invokeId: invokeId, line, col });
    }
  }

  //Check for any empty expressions
  let emptyHead: Token | undefined;
  for (let t = 0, lastWasL = false; t < len(tokens); ++t) {
    const token = tokens[t];
    //To catch (#) and (@)
    if (token.typ === "sym" && (token.text === "#" || token.text === "@")) {
      continue;
    }
    if (lastWasL && token.typ === ")") {
      emptyHead = token;
      break;
    }
    lastWasL = token.typ === "(";
  }
  if (emptyHead) {
    err("empty expression forbidden", emptyHead.errCtx);
  }

  return errors;
}

/** The for instruction is a descriptor of its following instructions -
 * this extracts them. */
export function forReader(
  { collInsLens, bodyLen, totalLen }: Extract<Ins, { typ: "for" }>,
  nextInsAt: number,
  funcIns: Ins[],
): { defAndVals: DefAndVals[]; body: Ins[] } {
  const defAndVals: DefAndVals[] = [];
  let coll = 0;
  let i = nextInsAt;
  let imax = nextInsAt + (totalLen - bodyLen);
  while (i < imax) {
    const def = funcIns[i];
    const val = funcIns.slice(i + 1, i + collInsLens[coll++]);
    defAndVals.push({ def, val });
    i += 1 + len(val);
  }
  const body = funcIns.slice(
    nextInsAt + (totalLen - bodyLen),
    nextInsAt + totalLen,
  );
  return { body, defAndVals };
}

//TODO: investigate Node implementation replacement
/** Basic argument type error detection */
function insErrorDetect(fins: Ins[], inFor = false): InvokeError[] | undefined {
  type TypeInfo = {
    types?: Val["t"][];
    val?: Val;
  };
  const stack: TypeInfo[] = [];
  for (let i = 0, lim = len(fins); i < lim; ++i) {
    const ins = fins[i];
    switch (ins.typ) {
      case "val":
        stack.push({ types: [ins.value.t], val: ins.value });
        break;
      case "exa":
      case "exe": {
        const head = stack.pop()!;
        const args = stack.splice(len(stack) - ins.value, ins.value);
        const badMatch = (okTypes: Val["t"][]) =>
          args.findIndex(
            ({ types }) => types && !okTypes.find(t => has(types, t)),
          );
        const headType = head.val
          ? head.val.t
          : head.types && len(head.types) === 1 && head.types[0];
        if (head.val && head.val.t === "func") {
          if (head.val.v === "recur") {
            stack.splice(len(stack) - ins.value, ins.value);
            break;
          }
          const errors = typeCheck(
            head.val.v,
            args.map(a => a.types ?? []),
            ins.errCtx,
            true,
          );
          if (errors) {
            return errors;
          }
          const { returns, numeric: onlyNum } = ops[head.val.v];
          stack.push(
            onlyNum && onlyNum !== "in only"
              ? { types: ["num"] }
              : { types: returns },
          );
        } else if (headType === "num") {
          const badArg = badMatch(["str", "dict", "vec"]);
          if (badArg !== -1) {
            return numOpErr(ins.errCtx, args[badArg].types!);
          }
          stack.push({});
        } else if (headType === "key") {
          const badArg = badMatch(["dict", "vec"]);
          if (badArg !== -1) {
            return keyOpErr(ins.errCtx, args[badArg].types!);
          }
          stack.push({});
        } else if (headType && ["str", "bool", "null"].includes(headType)) {
          stack.push({});
        } else if (!head.types && !head.val) {
          stack.push({});
        }
        break;
      }
      case "or":
        stack.pop();
        stack.push({});
        i += ins.value;
        break;
      case "cat":
      case "var":
      case "let":
      case "dva":
      case "dle":
      case "loo":
      case "jmp":
        break;
      case "brk":
      case "cnt":
        if (!inFor) {
          const m = "can only use break and continue in a for or while loop";
          return [{ e: "Parse", m, errCtx: ins.errCtx }];
        }
        break;
      case "clo": {
        const errors = insErrorDetect(
          fins.slice(i + 1, i + 1 + ins.value.length),
        );
        if (errors) {
          return errors;
        }
        stack.push({});
        i += ins.value.length;
        break;
      }
      case "ref":
      case "npa":
      case "upa":
      case "dpa":
        stack.push({});
        break;
      case "if": {
        stack.pop();
        stack.push({});
        const ifIns = fins.slice(i + 1, ins.value + 1);
        const errors = insErrorDetect(ifIns);
        if (errors) {
          return errors;
        }
        i += ins.value - 1;
        break;
      }
      case "mat":
      case "sat": {
        stack.pop(); //first match
        stack.pop(); //cond
        i += ins.value;
        i += (fins[i] as { value: number }).value; //The first jmp
        stack.push({});
        break;
      }
      case "pop":
        stack.splice(len(stack) - ins.value, ins.value);
        break;
      case "ret":
        if (ins.value) {
          stack.pop();
        }
        break;
      case "rec":
        stack.splice(len(stack) - ins.value, ins.value);
        break;
      case "for": {
        const { defAndVals, body } = forReader(ins, i + 1, fins);
        const vErrs = defAndVals.flatMap(dav => insErrorDetect(dav.val) ?? []);
        const bErrs = insErrorDetect(body, true);
        if (len(vErrs) || bErrs) {
          return bErrs ? [...vErrs, ...bErrs] : vErrs;
        }
        stack.push({ types: ["vec"] });
        i += ins.totalLen;
        break;
      }
      default:
        assertUnreachable(ins);
    }
  }
}

function extractLineCols(ins: Ins[]): string[] {
  return ins.map(
    i => `${i.errCtx.invokeId}\t${i.errCtx.line}\t${i.errCtx.col}`,
  );
}

export function parse(
  code: string,
  invokeId: string,
): { funcs: Funcs; errors: InvokeError[]; lineCols: string[] } {
  const { tokens, stringError } = tokenise(code, invokeId);
  const tokenErrors = tokenErrorDetect(stringError, tokens);
  if (len(tokenErrors)) {
    return { errors: tokenErrors, funcs: {}, lineCols: [] };
  }
  const okFuncs: Func[] = [];
  const errors: InvokeError[] = [];
  const tree = treeise([...tokens]);
  if (!len(tree)) {
    return { funcs: {}, errors, lineCols: [] };
  }
  const collected = collectFuncs(tree);
  const namedNodes: NamedNodes[] = [];
  collected.forEach(nodeOrErr => {
    if ("err" in nodeOrErr) {
      errors.push({ e: "Parse", m: nodeOrErr.err, errCtx: nodeOrErr.errCtx });
    } else {
      namedNodes.push({ name: nodeOrErr.name, nodes: nodeOrErr.nodes });
    }
  });
  namedNodes.map(compileFunc).forEach(fae => {
    if ("e" in fae) {
      errors.push(fae);
    } else {
      okFuncs.push(fae);
    }
  });
  errors.push(...okFuncs.flatMap(f => insErrorDetect(f.ins) ?? []));
  const allLineCols = extractLineCols(okFuncs.flatMap(f => f.ins));
  const lineCols = [...new Set(allLineCols)];
  const funcs: Funcs = {};
  okFuncs.forEach(func => (funcs[func.name ?? ""] = func));
  return { errors, funcs, lineCols };
}
