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
type NamedTokens = {
  name: string;
  tokens: Token[];
  errCtx: ErrCtx;
};
type ParserIns = Ins | { typ: "err"; value: string; errCtx: ErrCtx };
const nullVal: Val = { t: "null", v: undefined };
const falseVal = <Val>{ t: "bool", v: false };

const depthChange = ({ typ }: Token) => toNum(typ === "(") - toNum(typ === ")");

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
    if (c === '"') {
      if ((inString = !inString)) {
        inStringAt = [line, col];
        tokens.push({
          typ: "str",
          text: "",
          errCtx: { sourceId: sourceId, line, col },
        });
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
        tokens.push({
          typ: "rem",
          text: "",
          errCtx: { sourceId: sourceId, line, col },
        });
      }
      continue;
    }
    const errCtx: ErrCtx = { sourceId: sourceId, line, col };
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

function segment(tokens: Token[]): Token[][] {
  const segments: Token[][] = [[]];
  let depth = 0;
  tokens.forEach(token => {
    segments[len(segments) - 1].push(token);
    depth += depthChange(token);
    if (depth === 0) {
      segments.push([]);
    }
  });
  return segments;
}

function funcise(segments: Token[][]): NamedTokens[] {
  const isFunc = (segment: Token[]) =>
    len(segment) > 1 &&
    segment[1].typ === "sym" &&
    segment[1].text === "function";
  const funcs = segments.filter(t => isFunc(t));
  const entries = flat(segments.filter(t => !isFunc(t)));
  const described = funcs.map(tokens => ({
    name: tokens[2].text,
    tokens: slice(tokens, 3),
    errCtx: tokens[2].errCtx,
  }));
  return len(entries)
    ? concat(described, [
        {
          name: "entry",
          tokens: entries,
          errCtx: entries[0].errCtx,
        },
      ])
    : described;
}

function parseAll(tokens: Token[], params: ParamsShape) {
  const args: ParserIns[][] = [];
  while (true) {
    const arg = parseArg(tokens, params);
    if (!len(arg)) {
      break;
    }
    args.push(arg);
  }
  return args;
}

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

function parseArg(
  tokens: Token[],
  params: ParamsShape,
  inPartial = false,
): ParserIns[] {
  if (!len(tokens)) {
    return [];
  }
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
  switch (typ) {
    case "str":
      return [{ typ: "val", value: <Val>{ t: "str", v: text }, errCtx }];
    case "num":
      return [{ typ: "val", value: <Val>{ t: "num", v: toNum(text) }, errCtx }];
    case "sym":
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
      } else if (
        has(
          params.map(({ name }) => name),
          text,
        )
      ) {
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
    case "(":
      return parseForm(tokens, params, inPartial);
    case ")":
    case "rem":
      return [];
    default:
      return assertUnreachable(typ);
  }
}

/** Accepts tokens and returns ParamsShape.
 * Example inputs:
 * "(fn "   a [b [c]] d [d c b a]
 * "(var " [a] [1 2] b [1 2]
 * "(function " [x] (print x) x
 * "(function " x [x]
 * "(fn "
 * "(function "
 * */
function parseParams(
  tokens: Token[],
  forVar = false,
): { params: ParamsShape; errors: ParserIns[] } {
  if (!len(tokens) || tokens[0].typ === ")") {
    return { params: [], errors: [] };
  }
  let depth = 0;
  const destructs: Token[][] = [];
  let destruct: Token[] = [];
  let hitNonParam = 0;
  while (len(tokens)) {
    if (!depth) {
      destructs.push([]);
      destruct = destructs[len(destructs) - 1];
    }
    depth += depthChange(tokens[0]);
    if (depth < 0) {
      break;
    }
    destruct.push(tokens.shift()!);
    if (destruct[0].typ === "sym" && sub("#@%", destruct[0].text)) {
      tokens.unshift(destruct[0]);
      destructs.pop();
      hitNonParam = 1;
      break;
    }
    if (
      len(destruct) > 1 &&
      (destruct[1].typ !== "sym" || destruct[1].text !== "vec")
    ) {
      hitNonParam = 2;
      break;
    }
    if (forVar && !depth) {
      if (len(destruct) === 1) {
        tokens.unshift(destruct[0]);
        return { params: [], errors: [] };
      }
      break;
    }
  }
  if (hitNonParam === 2 && depth > 0) {
    tokens.unshift(destruct[1]);
    tokens.unshift(destruct[0]);
    destructs.pop();
  } else {
    if (depth < 0) {
      //We reached ) early
      destructs.pop();
      destructs
        .pop()!
        .reverse()
        .forEach(t => tokens.unshift(t));
    } else if (!hitNonParam && !forVar) {
      //Everything was a valid parameter so the last one is the body
      const last = destructs.pop()!;
      if (len(last) === 1 && last[0].typ === ")") {
        push(tokens, destructs.pop()!);
      }
      push(tokens, last);
    }
  }
  const params: ParamsShape = [];
  const errors: ParserIns[] = [];
  const position: number[] = [0];
  destructs.forEach(destruct => {
    destruct.forEach(({ typ, text, errCtx }) => {
      if (typ === "sym") {
        if (text === "vec") {
          return;
        }
        params.push({ name: text, position: slice(position) });
        ++position[len(position) - 1];
        return;
      }
      if (typ === "(") {
        position.push(0);
      } else if (typ === ")") {
        position.pop();
        ++position[len(position) - 1];
      } else {
        errors.push({
          typ: "err",
          value: `disallowed in destructuring`,
          errCtx,
        });
      }
    });
    //++position[0];
  });
  return { params, errors };
}

function syntaxise(
  { name, tokens }: NamedTokens,
  errCtx: ErrCtx,
): ["func", Func] | ["err", InvokeError] {
  const err = (m: string, eCtx = errCtx) =>
    <ReturnType<typeof syntaxise>>["err", { e: "Parse", m, errCtx: eCtx }];
  //In the case of e.g. (function (+)) or (function)
  if (name === "(" || name === ")") {
    return err("nameless function");
  }
  //In the case of e.g. (function name)
  if (tokens[0].typ === ")") {
    return err("empty function body");
  }
  const { params, errors: ins } = parseParams(tokens);
  while (len(tokens)) {
    push(ins, parseArg(tokens, params));
  }
  for (let i = 0, lim = len(ins); i < lim; i++) {
    const x = ins[i];
    if (x.typ === "err") {
      return err(x.value, x.errCtx);
    }
  }
  return ["func", { name, ins: <Ins[]>ins }];
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
  const segments = segment(tokens);
  const labelled = funcise(segments);
  const funcsAndErrors = labelled.map(named =>
    syntaxise(named, {
      sourceId: sourceId,
      line: named.errCtx.line,
      col: named.errCtx.col,
    }),
  );
  const okFuncs: Func[] = [],
    errors: InvokeError[] = [];
  funcsAndErrors.forEach(fae => {
    if (fae[0] === "err") {
      errors.push(fae[1]);
    } else {
      okFuncs.push(fae[1]);
    }
  });
  push(errors, flat(okFuncs.map(f => insErrorDetect(f.ins) ?? [])));
  const funcs: Funcs = {};
  okFuncs.forEach(func => (funcs[func.name] = func));
  return { errors, funcs };
}
