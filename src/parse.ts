import { arityCheck, keyOpErr, numOpErr, typeCheck } from "./checks";
import * as pf from "./poly-fills";
const { concat, has, flat, push, slice, splice } = pf;
const { slen, starts, sub, substr, strIdx } = pf;
const { isNum, len, toNum } = pf;
import { ParamsShape, ErrCtx, Func, Funcs, Ins, ops, Val } from "./types";
import { assertUnreachable, InvokeError } from "./types";

type Token = {
  typ: "str" | "num" | "sym" | "rem" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
type Arg = { errCtx: ErrCtx } & (
  | { str: string }
  | { sym: string }
  | { num: number }
  | { rem: string }
);
type Node = Arg | Node[];
type ParserIns = Ins | { typ: "err"; value: string; errCtx: ErrCtx };
const nullVal: Val = { t: "null", v: undefined };
const falseVal = <Val>{ t: "bool", v: false };

export function tokenise(
  code: string,
  sourceId: string,
  makeCollsOps = true,
  emitComments = false,
) {
  const tokens: Token[] = [];
  const digits = "0123456789";
  let inString = false,
    isEscaped = false,
    inStringAt = [0, 0],
    inSymbol = false,
    inNumber = false,
    inHex = false,
    inComment = false,
    line = 1,
    col = 0;
  for (let i = 0, l = slen(code); i < l; ++i) {
    const c = strIdx(code, i),
      nextCh = i + 1 !== l ? strIdx(code, i + 1) : "";
    ++col;
    if (inComment) {
      if (c === "\n") {
        inComment = false;
        ++line;
        col = 0;
      } else if (emitComments) {
        tokens[len(tokens) - 1].text += c;
      }
      continue;
    }
    if (isEscaped) {
      isEscaped = false;
      if (inString) {
        tokens[len(tokens) - 1].text +=
          { n: "\n", t: "\t", r: "\r", '"': '"' }[c] || `\\${c}`;
      }
      continue;
    }
    if (c === "\\") {
      isEscaped = true;
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
      inComment = true;
      if (emitComments) {
        tokens.push({ typ: "rem", text: "", errCtx });
      }
      continue;
    }
    const isDigit = (ch: string) => sub(digits, ch);
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
        const parens: { [ch: string]: Token["typ"] } = {
          "[": "(",
          "{": "(",
          "(": "(",
          ")": ")",
          "}": ")",
          "]": ")",
        };
        const text = parens[c]!;
        tokens.push({ typ: text, text: makeCollsOps ? text : c, errCtx });
        if (makeCollsOps) {
          if (c === "[") {
            tokens.push({ typ: "sym", text: "vec", errCtx });
          } else if (c === "{") {
            tokens.push({ typ: "sym", text: "dict", errCtx });
          }
        }
        continue;
      }
      inNumber =
        isDigit(c) ||
        (c === "." && isDigit(nextCh)) ||
        (c === "-" && (isDigit(nextCh) || nextCh === "."));
      inHex = false;
      inSymbol = !inNumber;
      const typ: Token["typ"] = inSymbol ? "sym" : "num";
      tokens.push({ typ, text: "", errCtx });
    }
    tokens[len(tokens) - 1].text += c;
  }
  return { tokens, stringError: inString ? inStringAt : undefined };
}

type NamedNodes = {
  name: string;
  nodes: Node[];
};
const isArg = (node: Node | undefined): node is Arg =>
  !!node && "errCtx" in node;
const symAt = (node: Node, pos = 0) => {
  if (!isArg(node)) {
    const arg = node[pos];
    return (isArg(arg) && "sym" in arg && arg.sym) || "";
  }
  return "";
};
const t2a = ({ typ, text, errCtx }: Token): Arg =>
  typ === "sym"
    ? { sym: text, errCtx }
    : typ === "str"
    ? { str: text, errCtx }
    : typ === "num"
    ? { num: toNum(text), errCtx }
    : { rem: text, errCtx };

/** Parses tokens into a tree where each node is a token or token list. */
function treeise(tokens: Token[]): Node[] {
  const nodes: Node[] = [];
  const _treeise = (tokens: Token[]): Node => {
    let prefix: Arg | undefined;
    if (tokens[0].typ === "sym" && sub("@#", tokens[0].text)) {
      prefix = t2a(tokens.shift()!);
    }
    const token = tokens.shift()!;
    if (token.typ !== "(" && token.typ !== ")") {
      return t2a(token);
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
    if (!isArg(node) && isArg(node[0]) && symAt(node) === "function") {
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

/*
function parseForm(
  tokens: Token[],
  params: ParamsShape,
  inPartial = true,
): ParserIns[] {
  const head = tokens.shift();
  if (!head) {
    return [];
  }
  const { typ, text, errCtx } = head;
  let op = text;
  const err = (value: string, eCtx = errCtx) => [
    <ParserIns>{ typ: "err", value, errCtx: eCtx },
  ];
  if (op === "catch") {
    if (tokens[0].typ !== "(") {
      return err("argument 1 must be expression");
    }
    const body = parseArg(tokens, params);
    const when = flat(parseAll(tokens, params));
    if (!len(body) || !len(when)) {
      return err("must provide at least 2 arguments");
    }
    return [...body, { typ: "cat", value: len(when), errCtx }, ...when];
  } else if (op === "var" || op === "let") {
    const ins: Ins[] = [];
    while (true) {
      const parsedDestructuring = parseParams(tokens, true);
      if (len(parsedDestructuring.errors)) {
        return parsedDestructuring.errors;
      }
      let def: ParserIns | undefined = undefined;
      if (len(parsedDestructuring.params)) {
        def = {
          typ: op === "var" ? "dva" : "dle",
          value: parsedDestructuring.params,
          errCtx,
        };
      }
      if (!def) {
        [def] = parseArg(tokens, params);
      }
      if (len(ins) && !def) {
        return ins;
      }
      const val = parseArg(tokens, params);
      if (!len(ins) && (!def || !len(val))) {
        return err(`must provide at least one declaration name and value`);
      } else if (!len(val)) {
        return err(`must provide a value after each declaration name`);
      }
      if (def.typ !== "ref" && def.typ !== "dva" && def.typ !== "dle") {
        return [
          <ParserIns>{
            typ: "err",
            value: `${op} declaration name must be a symbol`,
            errCtx: def.errCtx,
          },
        ];
      }
      push(ins, val);
      if (def.typ === "ref") {
        ins.push({ typ: op, value: def.value, errCtx });
      } else if (def.typ === "dva" || def.typ === "dle") {
        ins.push({ typ: def.typ, value: def.value, errCtx });
      }
    }
  } else if (op === "var!" || op === "let!") {
    const ins: Ins[] = [];
    //Rewrite e.g. (var! a + 1) -> (var a (+ a 1))
    const defIns = parseArg(tokens, params);
    if (!len(defIns)) {
      return err(`must provide declaration name`);
    }
    const def = defIns[0];
    if (def.typ !== "ref") {
      return err("declaration name must be symbol");
    }
    const func = parseArg(tokens, params);
    if (!len(func)) {
      return err("must provide an operation");
    }
    const args = parseAll(tokens, params);
    ins.push({ typ: "ref", value: def.value, errCtx });
    push(ins, flat(args));
    push(ins, func);
    ins.push({ typ: "exe", value: len(args) + 1, errCtx });
    ins.push({ typ: op === "var!" ? "var" : "let", value: def.value, errCtx });
    return ins;
  } else if (op === "if" || op === "if!" || op === "when") {
    const cond = parseArg(tokens, params);
    if (!len(cond)) {
      return err("must provide condition");
    }
    const ins: ParserIns[] = cond;
    if (op === "if!") {
      ins.push({ typ: "val", value: { t: "func", v: "!" }, errCtx });
      ins.push({ typ: "exe", value: 1, errCtx });
    }
    if (op === "if" || op === "if!") {
      const ifT = parseArg(tokens, params);
      if (!len(ifT)) {
        return err("must provide a branch");
      }
      ins.push({ typ: "if", value: len(ifT) + 1, errCtx });
      push(ins, ifT);
      const ifF = parseArg(tokens, params);
      if (len(ifF)) {
        ins.push({ typ: "jmp", value: len(ifF), errCtx });
        push(ins, ifF);
        const extraneousBranch = parseArg(tokens, params);
        if (len(extraneousBranch)) {
          return err(
            "too many branches; delete this branch",
            extraneousBranch[0].errCtx,
          );
        }
      } else {
        ins.push({ typ: "jmp", value: 1, errCtx });
        ins.push({ typ: "val", value: nullVal, errCtx });
      }
    } else {
      const body = flat(parseAll(tokens, params));
      ins.push({ typ: "if", value: len(body) + 1, errCtx });
      push(ins, body);
      ins.push({ typ: "jmp", value: 1, errCtx });
      ins.push({ typ: "val", value: nullVal, errCtx });
    }
    return ins;
  } else if (op === "and" || op === "or" || op === "while") {
    const args = parseAll(tokens, params);
    let insCount = args.reduce((acc, a) => acc + len(a), 0);
    if (len(args) < 2) {
      return err("requires at least two arguments");
    }
    const ins: Ins[] = [];
    if (op === "while") {
      ins.push({ typ: "val", value: nullVal, errCtx }); //If first is false
      insCount += 2; //+1 for the if ins, +1 for the pop ins
      const head = args.shift()!;
      push(ins, head);
      ins.push({ typ: "if", value: insCount - len(head), errCtx });
      ins.push({ typ: "pop", value: len(args), errCtx });
      args.forEach(as => push(ins, as));
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
        { typ: "val", value: falseVal, errCtx },
      ]);
    } else {
      ins.push({ typ: "val", value: falseVal, errCtx });
    }
    return ins;
  } else if (op === "match") {
    const cond = parseArg(tokens, params);
    if (!len(cond)) {
      return err("must provide condition");
    }
    const args = parseAll(tokens, params);
    const otherwise: ParserIns[] = len(args) % 2 ? args.pop()! : [];
    if (!len(args)) {
      return err("must provide at least one case");
    }
    let insCount =
      args.reduce(
        (acc, a) => acc + len(a) + 1,
        len(otherwise) ? len(otherwise) - 2 : 0,
      ) + 2;
    const ins: ParserIns[] = cond;
    while (len(args) > 1) {
      const a = args.shift()!;
      const when = args.shift()!;
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
  }
  const headIns: Ins[] = [];
  //Head is a expression or parameter
  if (
    typ === "(" ||
    has(
      params.map(({ name }) => name),
      text,
    ) ||
    sub("%#@", strIdx(text, 0))
  ) {
    tokens.unshift(head);
    const ins = parseArg(tokens, params);
    if (inPartial) {
      headIns.push({ typ: "exp", value: len(ins), errCtx });
    }
    push(headIns, ins);
  }
  const parsedArgs = parseAll(tokens, params);
  const [body, nArgs] = [flat(parsedArgs), len(parsedArgs)];
  if (op === "return") {
    return [...body, { typ: "ret", value: !!len(body), errCtx }];
  }

  //Operation arity check, optionally disabled for partial closures
  if (ops[op] && !inPartial) {
    const errors = arityCheck(op, nArgs, errCtx);
    push(headIns, errors?.map(e => err(e.m)[0]) ?? []);
    if (!errors) {
      //Upgrade some math and logic functions to their fast counterparts
      if (nArgs === 2 && ops[`fast${op}`]) {
        op = `fast${op}`;
      }
    }
  }

  if (len(headIns)) {
    headIns.push({ typ: "exe", value: nArgs, errCtx });
  } else {
    const value: Val =
      typ === "num"
        ? { t: "num", v: toNum(op) }
        : starts(op, ":")
        ? { t: "key", v: op }
        : ops[op]
        ? { t: "func", v: op }
        : op === "true" || op === "false"
        ? { t: "bool", v: op === "true" }
        : { t: "str", v: op };
    headIns.push({ typ: "val", value, errCtx });
    headIns.push({ typ: "exe", value: nArgs, errCtx });
  }
  return [...body, ...headIns];
}
*/

const parseNode = (node: Node, params: ParamsShape) =>
  isArg(node) ? parseArg(node, params) : parseForm(node, params);

function parseForm(nodes: Node[], params: ParamsShape): ParserIns[] {
  if (!len(nodes)) {
    return [];
  }
  const nodeParser = (node: Node) => parseNode(node, params);
  const firstNode = nodes.shift()!;
  if (isArg(firstNode) && "sym" in firstNode) {
    const { sym, errCtx } = firstNode;
    const err = (m: string) => [<ParserIns>{ typ: "err", value: m, errCtx }];
    if (sym === "if") {
      if (!len(nodes)) {
        return err("provide a condition");
      } else if (len(nodes) === 1) {
        return err("provide at least one branch");
      } else if (len(nodes) > 3) {
        return err("provide fewer than two branches");
      }
      const [cond, branch1, branch2] = nodes.map(nodeParser);
      return [
        ...cond,
        { typ: "if", value: len(branch1) + 1, errCtx },
        ...branch1,
        { typ: "jmp", value: len(branch2), errCtx },
        ...branch2,
      ];
    } else if (sym === "when") {
      
    }
  }
  const head = nodeParser(firstNode);
  const args = nodes.map(nodeParser);
  const ins: ParserIns[] = [];
  args.forEach(arg => push(ins, arg));
  push(ins, head);
  return [...ins, { typ: "exe", value: len(args), errCtx: head[0].errCtx }];
}

function parseArg(
  node: Node,
  params: ParamsShape,
  inPartial = false,
): ParserIns[] {
  if (isArg(node)) {
    const { errCtx } = node;
    if ("str" in node) {
      return [{ typ: "val", value: <Val>{ t: "str", v: node.str }, errCtx }];
    }
    if ("num" in node) {
      return [{ typ: "val", value: <Val>{ t: "num", v: node.num }, errCtx }];
    }
    if ("sym" in node) {
      const { sym } = node;
      if (sym === "true" || sym === "false") {
        return [
          { typ: "val", value: <Val>{ t: "bool", v: sym === "true" }, errCtx },
        ];
      } else if (sym === "null") {
        return [{ typ: "val", value: nullVal, errCtx }];
      } else if (sym === "_") {
        return [{ typ: "val", value: { t: "wild", v: undefined }, errCtx }];
      } else if (starts(sym, ":")) {
        return [{ typ: "val", value: <Val>{ t: "key", v: sym }, errCtx }];
      } else if (starts(sym, "%") && isNum(substr(sym, 1))) {
        const value = toNum(substr(sym, 1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, errCtx }];
      } else if (
        has(
          params.map(({ name }) => name),
          sym,
        )
      ) {
        const param = params.find(({ name }) => name === sym)!;
        if (len(param.position) === 1) {
          return [{ typ: "npa", value: param.position[0], errCtx }];
        }
        return [{ typ: "dpa", value: param.position, errCtx }];
      } else if (sym === "args") {
        return [{ typ: "upa", value: -1, errCtx }];
      } else if (sym === "PI" || sym === "E") {
        const v = sym === "PI" ? 3.141592653589793 : 2.718281828459045;
        return [{ typ: "val", value: { t: "num", v }, errCtx }];
      } else if (ops[sym]) {
        return [{ typ: "val", value: <Val>{ t: "func", v: sym }, errCtx }];
      }
      return [{ typ: "ref", value: sym, errCtx }];
    }
    return [];
  }
  if (!len(node)) {
    return [];
  }
  return parseForm(node, params);
  /*
  const { typ, text, errCtx } = tokens.shift() as Token;
  //Upon closure
  const isClosure =
    typ === "sym" && sub("#@", text) && len(tokens) && tokens[0].typ === "(";
  const isParamClosure = typ === "(" && len(tokens) && tokens[0].text === "fn";
  if (isClosure || isParamClosure) {
    const texts = tokens.map(t => t.text);
    const fnIns = isParamClosure ? tokens.shift() : undefined;
    const ins: ParserIns[] = [];
    if (isParamClosure) {
      const parsedParams = parseParams(tokens);
      params = parsedParams.params;
      push(ins, parsedParams.errors);
      if (tokens[0].typ === ")") {
        return [
          { typ: "err", value: `fn requires a body`, errCtx: fnIns!.errCtx },
        ];
      }
      tokens.unshift({ typ: "sym", text: "do", errCtx });
      tokens.unshift({ typ: "(", text: "(", errCtx });
    }
    push(ins, parseArg(tokens, params, text === "@"));
    const errors = ins.filter(t => t.typ === "err");
    if (len(errors)) {
      return errors;
    }
    if (isParamClosure) {
      ins.forEach(i => {
        if (i.typ === "npa") {
          i.typ = "upa";
        }
      });
    }
    const value: [string, Ins[]] = [
      (isParamClosure ? "(" : text) +
        slice(texts, 0, len(texts) - len(tokens)).join(" "),
      <Ins[]>ins,
    ];
    return [{ typ: text === "@" ? "par" : "clo", value, errCtx }];
  }
  */
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
): { params: ParamsShape; errors: ParserIns[] } {
  const paras: ParamsShape = [],
    errs: ParserIns[] = [];
  let n = 0;
  while (
    len(nodes) > (len(position) ? 0 : 1) &&
    (isArg(nodes[0]) || symAt(nodes[0]) === "vec") &&
    !(forVar && len(paras))
  ) {
    const param = nodes.shift()!;
    if (!isArg(param)) {
      param.shift();
      const { params, errors } = parseParams(param, forVar, [...position, n]);
      push(paras, params);
      push(errs, errors);
    } else {
      const { errCtx } = param;
      if ("sym" in param) {
        paras.push({ name: param.sym, position: [...position, n] });
      } else {
        errs.push({ typ: "err", value: "provide parameter name", errCtx });
      }
    }
    ++n;
  }
  return { params: paras, errors: errs };
}

function compileFunc({ name, nodes: nodes }: NamedNodes): Func | InvokeError {
  const { params, errors: ins } = parseParams(nodes);
  nodes.forEach(node => {
    push(ins, parseArg(node, params));
  });
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

//TODO: replace with Node implementation
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
      case "exp":
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
