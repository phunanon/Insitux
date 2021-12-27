import { arityCheck, keyOpErr, numOpErr, typeCheck } from "./checks";
import * as pf from "./poly-fills";
const { has, flat, push, slice, splice } = pf;
const { slen, starts, sub, substr, strIdx, subIdx } = pf;
const { isNum, len, toNum } = pf;
import { ParamsShape, ErrCtx, Func, Funcs, Ins, ops, Val } from "./types";
import { assertUnreachable, InvokeError } from "./types";

type Token = {
  typ: "str" | "num" | "sym" | "rem" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
type Node = Token | Node[];
type ParserIns = Ins | { typ: "err"; value: string; errCtx: ErrCtx };
const nullVal: Val = { t: "null", v: undefined };
const falseVal = <Val>{ t: "bool", v: false };
type NamedNodes = {
  name: string;
  nodes: Node[];
};
const isToken = (node: Node | undefined): node is Token =>
  !!node && "errCtx" in node;
const symAt = (node: Node, pos = 0) => {
  if (isToken(node)) {
    return "";
  }
  const arg = node[pos];
  return (isToken(arg) && has(["sym", "str"], arg.typ) && arg.text) || "";
};
const node2str = (nodes: Node[]): string =>
  nodes.map(n => (isToken(n) ? n.text : `(${node2str(n)})`)).join(" ");

export function tokenise(
  code: string,
  sourceId: string,
  makeCollsOps = true,
  emitComments = false,
) {
  const tokens: Token[] = [];
  const isDigit = (ch: string) => sub("0123456789", ch);
  let [inString, line, col, inStringAt] = [false, 1, 0, [1, 0]];
  let [inSymbol, inNumber, inHex] = [false, false, false];
  for (let i = 0, l = slen(code); i < l; ++i) {
    const c = strIdx(code, i),
      nextCh = i + 1 !== l ? strIdx(code, i + 1) : "";
    ++col;
    if (c === "\\" && inString) {
      tokens[len(tokens) - 1].text +=
        { n: "\n", t: "\t", r: "\r", '"': '"' }[nextCh] ||
        (nextCh === "\\" ? "\\" : `\\${nextCh}`);
      ++col;
      ++i;
      continue;
    }
    const errCtx: ErrCtx = { sourceId: sourceId, line, col };
    if (c === '"') {
      if ((inString = !inString)) {
        inStringAt = [line, col];
        tokens.push({ typ: "str", text: "", errCtx });
      }
      inNumber = inSymbol = false;
      continue;
    }
    const isWhite = sub(" \t\n\r,", c);
    if (!inString && isWhite) {
      inNumber = inSymbol = false;
      if (c === "\n") {
        ++line;
        col = 0;
      }
      continue;
    }
    if (!inString && c === ";") {
      const nl = subIdx(substr(code, ++i), "\n");
      const text = substr(code, i, nl > 0 ? nl : l - i);
      i += slen(text);
      ++line;
      col = 0;
      if (emitComments) {
        tokens.push({ typ: "rem", text, errCtx });
      }
      continue;
    }
    const isParen = sub("()[]{}", c);
    //Allow one . per number, or hex, or binary, else convert into symbol
    if (inNumber && !isDigit(c)) {
      const hexStart = c === "x" && tokens[len(tokens) - 1].text === "0";
      inHex = inHex || hexStart;
      inNumber =
        (c === "b" && tokens[len(tokens) - 1].text === "0") ||
        (c === "." && !sub(tokens[len(tokens) - 1].text, ".")) ||
        (inHex && (hexStart || sub("ABCDEFabcdef", c)));
      if (!inNumber && !isParen && !isWhite) {
        inSymbol = true;
        tokens[len(tokens) - 1].typ = "sym";
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
        tokens.push({ typ: text, text: makeCollsOps ? text : c, errCtx });
        if (makeCollsOps && (c === "[" || c === "{")) {
          tokens.push({ typ: "sym", text: c === "[" ? "vec" : "dict", errCtx });
        }
        continue;
      }
      inNumber =
        isDigit(c) ||
        (c === "." && isDigit(nextCh)) ||
        (c === "-" && (isDigit(nextCh) || nextCh === "."));
      inHex = inSymbol = !inNumber;
      const typ: Token["typ"] = inSymbol ? "sym" : "num";
      tokens.push({ typ, text: "", errCtx });
    }
    tokens[len(tokens) - 1].text += c;
  }
  return { tokens, stringError: inString ? inStringAt : undefined };
}

/** Parses tokens into a tree where each node is a token or token list. */
function treeise(tokens: Token[]): Node[] {
  const nodes: Node[] = [];
  const _treeise = (tokens: Token[]): Node => {
    let prefix: Token | undefined;
    if (tokens[0].typ === "sym" && sub("@#", tokens[0].text)) {
      prefix = tokens.shift()!;
    }
    const token = tokens.shift()!;
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
      if (!name) {
        funcs.push({ err: "nameless function", errCtx: node[0].errCtx });
      } else if (len(node) < 3) {
        funcs.push({ err: "empty function body", errCtx: node[0].errCtx });
      }
      funcs.push({ name, nodes: node.slice(2) });
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
  const nodeParser = (node: Node) => parseNode(node, params);
  const firstNode = nodes.shift()!;
  let head = nodeParser(firstNode);
  const { errCtx } = head[0];
  if (isToken(firstNode) && firstNode.typ === "sym") {
    const { text: op, errCtx } = firstNode;
    const err = (m: string, eCtx = errCtx) => [
      <ParserIns>{ typ: "err", value: m, errCtx: eCtx },
    ];
    if (has(["if", "if!", "when", "match"], op) && !len(nodes)) {
      return err("provide a condition");
    } else if (has(["if", "if!"], op)) {
      if (len(nodes) === 1) {
        return err("provide at least one branch");
      } else if (len(nodes) > 3) {
        return err("provide fewer than two branches");
      }
      let [cond, branch1, branch2] = nodes.map(nodeParser);
      const ifN = op === "if!" && [
        <Ins>{ typ: "val", value: { t: "func", v: "!" }, errCtx },
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
    } else if (op === "when") {
      if (len(nodes) === 1) {
        return err("provide a body");
      }
      const [cond, ...body] = nodes.map(nodeParser);
      const bodyIns = flat(body);
      return [
        ...cond,
        { typ: "if", value: len(bodyIns) + 1, errCtx },
        ...bodyIns,
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: nullVal, errCtx },
      ];
    } else if (op === "match") {
      const [cond, ...args] = nodes.map(nodeParser);
      const otherwise: ParserIns[] = len(args) % 2 ? args.pop()! : [];
      if (!len(args)) {
        return err("provide at least one case");
      }
      const elseLen = len(otherwise);
      let insCount =
        args.reduce((acc, a) => acc + len(a), 0) +
        (elseLen ? elseLen : 2) +
        len(args);
      const ins: ParserIns[] = cond;
      while (len(args) > 1) {
        const [a, when] = [args.shift()!, args.shift()!];
        push(ins, a);
        ins.push({ typ: "mat", value: len(when) + 1, errCtx });
        push(ins, when);
        insCount -= len(a) + len(when) + 2;
        ins.push({ typ: "jmp", value: insCount, errCtx });
      }
      if (len(otherwise)) {
        push(ins, otherwise);
      } else {
        ins.push({ typ: "pop", value: 1, errCtx });
        ins.push({ typ: "val", value: falseVal, errCtx });
      }
      return ins;
    } else if (op === "catch") {
      if (len(nodes) < 2) {
        return err("provide at least 2 arguments");
      } else if (isToken(nodes[0])) {
        return err("argument 1 must be expression");
      }
      const body = nodeParser(nodes[0]);
      const when = flat(nodes.slice(1).map(nodeParser));
      return [...body, { typ: "cat", value: len(when), errCtx }, ...when];
    } else if (op === "and" || op === "or" || op === "while") {
      const args = nodes.map(nodeParser);
      let insCount = args.reduce((acc, a) => acc + len(a), 0);
      if (len(args) < 2) {
        return err("provide at least 2 arguments");
      }
      const ins: ParserIns[] = [];
      if (op === "while") {
        ins.push({ typ: "val", value: nullVal, errCtx }); //If first is false
        insCount += 2; //+1 for the if ins, +1 for the pop ins
        const [head, ...body] = args;
        push(ins, head);
        ins.push({ typ: "if", value: insCount - len(head), errCtx });
        ins.push({ typ: "pop", value: len(body), errCtx });
        push(ins, flat(body));
        ins.push({ typ: "loo", value: -(insCount + 1), errCtx });
        return ins;
      }
      insCount += len(args); //+1 for each if/or ins
      insCount += toNum(op === "and");
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
    } else if (op === "var" || op === "let") {
      const defs = nodes.filter((n, i) => !(i % 2));
      const vals = nodes.filter((n, i) => i % 2);
      if (!len(defs)) {
        return err("provide at least 1 declaration name and value");
      } else if (len(defs) > len(vals)) {
        return err("provide a value after each declaration name");
      }
      const ins: ParserIns[] = [];
      for (let d = 0, lim = len(defs); d < lim; ++d) {
        const { shape, errors } = parseParams([defs[d]], true);
        if (len(errors)) {
          return errors;
        }
        push(ins, nodeParser(vals[d]));
        if (len(shape)) {
          const typ = op === "var" ? "dva" : "dle";
          ins.push({ typ, value: shape, errCtx });
        } else {
          const defIns = parseNode(defs[d], params);
          if (len(defIns) > 1 || defIns[0].typ !== "ref") {
            return err("declaration name must be symbol", defIns[0].errCtx);
          }
          ins.push({ typ: op, value: defIns[0].value, errCtx });
        }
      }
      return ins;
    } else if (op === "var!" || op === "let!") {
      //Rewrite e.g. (var! a + 1) -> (var a (+ a 1))
      if (len(nodes) < 2) {
        return err("provide 1 declaration name and 1 function");
      }
      const [[def], func, ...args] = nodes.map(nodeParser);
      if (def.typ !== "ref") {
        return err("declaration name must be symbol", def.errCtx);
      }
      const ins: Ins[] = [{ typ: "ref", value: def.value, errCtx }];
      push(ins, [...flat(args), ...func]);
      ins.push({ typ: "exe", value: len(args) + 1, errCtx });
      const typ = op === "var!" ? "var" : "let";
      ins.push({ typ, value: def.value, errCtx });
      return ins;
    } else if (op === "#" || op === "@" || op === "fn") {
      const ins: ParserIns[] = [];
      let asStr = node2str(nodes);
      asStr = op === "fn" ? `(fn ${asStr})` : `${op}(${asStr})`;
      if (op === "fn") {
        const parsedParams = parseParams(nodes);
        params = parsedParams.shape;
        push(ins, parsedParams.errors);
        if (!len(nodes)) {
          return err("provide a body");
        }
        nodes.unshift({ typ: "sym", text: "do", errCtx });
      }
      //Rewrite partial closure to #(... [body] args)
      if (op === "@") {
        nodes = [
          { typ: "sym", text: "...", errCtx },
          ...nodes,
          { typ: "sym", text: "args", errCtx },
        ];
      }
      push(ins, parseForm(nodes, params, op !== "@"));
      const errors = ins.filter(t => t.typ === "err");
      if (len(errors)) {
        return errors;
      }
      if (op === "fn") {
        ins.forEach(i => {
          if (i.typ === "npa") {
            i.typ = "upa";
          }
        });
      }
      const value: [string, Ins[]] = [asStr, <Ins[]>ins];
      return [{ typ: op === "@" ? "par" : "clo", value, errCtx }];
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
  const ins: ParserIns[] = flat(args);
  if (symAt(firstNode) === "return") {
    return [...ins, { typ: "ret", value: !!len(args), errCtx }];
  }
  push(ins, head);
  const typ = len(head) > 1 ? "exa" : "exe";
  return [...ins, { typ, value: len(args), errCtx }];
}

function parseArg(node: Node, params: ParamsShape): ParserIns[] {
  if (isToken(node)) {
    const { errCtx } = node;
    if (node.typ === "str") {
      return [{ typ: "val", value: { t: "str", v: node.text }, errCtx }];
    }
    if (node.typ === "num") {
      return [{ typ: "val", value: { t: "num", v: toNum(node.text) }, errCtx }];
    }
    if (node.typ === "sym") {
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
      } else if (starts(text, ":")) {
        return [{ typ: "val", value: <Val>{ t: "key", v: text }, errCtx }];
      } else if (starts(text, "%") && isNum(substr(text, 1))) {
        const value = toNum(substr(text, 1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, errCtx }];
      } else if (has(paramNames, text)) {
        const param = params.find(({ name }) => name === text)!;
        if (len(param.position) === 1) {
          return [{ typ: "npa", value: param.position[0], errCtx }];
        }
        return [{ typ: "dpa", value: param.position, errCtx }];
      } else if (text === "args") {
        return [{ typ: "upa", value: -1, errCtx }];
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
  if (!len(node)) {
    return [];
  }
  return parseForm(node, params);
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
  forVar = false,
  position: number[] = [],
): { shape: ParamsShape; errors: ParserIns[] } {
  const shape: ParamsShape = [],
    errs: ParserIns[] = [];
  let n = 0;
  while (
    len(nodes) > (len(position) ? 0 : 1) &&
    (isToken(nodes[0]) || symAt(nodes[0]) === "vec") &&
    !(forVar && len(shape))
  ) {
    const param = nodes.shift()!;
    if (!isToken(param)) {
      param.shift();
      const parsed = parseParams(param, forVar, [...position, n]);
      push(shape, parsed.shape);
      push(errs, parsed.errors);
    } else {
      const { typ, errCtx } = param;
      if (typ === "sym") {
        shape.push({ name: param.text, position: [...position, n] });
      } else {
        errs.push({ typ: "err", value: "provide parameter name", errCtx });
      }
    }
    ++n;
  }
  return { shape, errors: errs };
}

function compileFunc({ name, nodes: nodes }: NamedNodes): Func | InvokeError {
  const { shape: params, errors } = parseParams(nodes);
  const ins = [...errors, ...flat(nodes.map(node => parseArg(node, params)))];
  for (let i = 0, lim = len(ins); i < lim; i++) {
    const { typ, value, errCtx } = ins[i];
    if (typ === "err") {
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
    depth += toNum(typ === l) - toNum(typ === r);
    if (depth < 0) {
      return [line, col];
    }
  }
  return [0, 0];
}

function tokenErrorDetect(stringError: number[] | undefined, tokens: Token[]) {
  const sourceId = len(tokens) ? tokens[0].errCtx.sourceId : "";
  const errors: InvokeError[] = [];
  const err = (m: string, errCtx: ErrCtx) =>
    errors.push({ e: "Parse", m, errCtx });

  //Check for double-quote imbalance
  if (stringError) {
    const [line, col] = stringError;
    err("unmatched double quotation marks", { sourceId: sourceId, line, col });
    return errors;
  }

  //Check for paren imbalance
  const countTyp = (t: Token["typ"]) =>
    len(tokens.filter(({ typ }) => typ === t));
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { sourceId: sourceId, line, col });
    }
  }

  //Check for any empty expressions
  let emptyHead: Token | undefined;
  for (let t = 0, lastWasL = false; t < len(tokens); ++t) {
    if (lastWasL && tokens[t].typ === ")") {
      emptyHead = tokens[t];
      break;
    }
    lastWasL = tokens[t].typ === "(";
  }
  if (emptyHead) {
    err("empty expression forbidden", emptyHead.errCtx);
  }

  return errors;
}

//TODO: investigate Node implementation replacement
function insErrorDetect(fins: Ins[]): InvokeError[] | undefined {
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
        const args = splice(stack, len(stack) - ins.value, ins.value);
        const badMatch = (okTypes: Val["t"][]) =>
          args.findIndex(
            ({ types }) => types && !okTypes.find(t => has(types, t)),
          );
        const headIs = (t: Val["t"]) =>
          head.val
            ? head.val.t === t
            : head.types && len(head.types) === 1 && head.types[0] === t;
        if (head.val && head.val.t === "func") {
          if (head.val.v === "recur") {
            splice(stack, len(stack) - ins.value, ins.value);
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
        } else if (headIs("num")) {
          const badArg = badMatch(["str", "dict", "vec"]);
          if (badArg !== -1) {
            return numOpErr(ins.errCtx, args[badArg].types!);
          }
          stack.push({});
        } else if (headIs("key")) {
          const badArg = badMatch(["dict", "vec"]);
          if (badArg !== -1) {
            return keyOpErr(ins.errCtx, args[badArg].types!);
          }
          stack.push({});
        } else if (headIs("str") || headIs("bool")) {
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
      case "clo":
      case "par": {
        const errors = insErrorDetect(ins.value[1]);
        if (errors) {
          return errors;
        }
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
        const ifIns = slice(fins, i + 1, ins.value + 1);
        const errors = insErrorDetect(ifIns);
        if (errors) {
          return errors;
        }
        i += ins.value - 1;
        break;
      }
      case "mat": {
        stack.pop(); //first match
        stack.pop(); //cond
        i += ins.value;
        i += fins[i].value as number; //The first jmp
        stack.push({});
        break;
      }
      case "pop":
        splice(stack, len(stack) - ins.value, ins.value);
        break;
      case "ret":
        if (ins.value) {
          stack.pop();
        }
        break;
      default:
        assertUnreachable(ins);
    }
  }
}

export function parse(
  code: string,
  sourceId: string,
): { funcs: Funcs; errors: InvokeError[] } {
  const { tokens, stringError } = tokenise(code, sourceId);
  const tokenErrors = tokenErrorDetect(stringError, tokens);
  if (len(tokenErrors)) {
    return { errors: tokenErrors, funcs: {} };
  }
  const okFuncs: Func[] = [],
    errors: InvokeError[] = [];
  const tree = treeise(tokens.slice());
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
  push(errors, flat(okFuncs.map(f => insErrorDetect(f.ins) ?? [])));
  const funcs: Funcs = {};
  okFuncs.forEach(func => (funcs[func.name] = func));
  return { errors, funcs };
}
