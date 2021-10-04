import * as pf from "./poly-fills";
const { concat, has, flat, push, slice } = pf;
const { slen, starts, sub, substr, strIdx } = pf;
const { isNum, len, toNum } = pf;
import { ErrCtx, Func, Funcs, Ins, InvokeError, ops, Val } from "./types";
import { assertUnreachable } from "./types";

type Token = {
  typ: "str" | "num" | "sym" | "ref" | "rem" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
type NamedTokens = {
  name: string;
  tokens: Token[];
  errCtx: ErrCtx;
};
type ParserIns = Omit<Ins, "typ"> & { typ: Ins["typ"] | "def" | "err" };
const nullVal: Val = { t: "null", v: undefined };

export function tokenise(
  code: string,
  invocationId: string,
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
          { n: "\n", t: "\t", '"': '"' }[c] || `\\${c}`;
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
          errCtx: { invocationId, line, col },
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
          errCtx: { invocationId, line, col },
        });
      }
      continue;
    }
    const errCtx: ErrCtx = { invocationId, line, col };
    const isDigit = (ch: string) => sub(digits, ch);
    const isParen = sub("()[]{}", c);
    //Allow one . per number, or convert into symbol
    if (inNumber && !isDigit(c)) {
      inNumber = c === "." && !sub(tokens[len(tokens) - 1].text, ".");
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
      inSymbol = !inNumber;
      let typ: Token["typ"] = inSymbol ? "sym" : "num";
      if (len(tokens)) {
        const { typ: t, text } = tokens[len(tokens) - 1];
        if (t === "sym" && (text === "var" || text === "let")) {
          typ = "ref";
        }
      }
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
    depth += toNum(token.typ === "(") - toNum(token.typ === ")");
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

function parseAllArgs(tokens: Token[], params: string[]) {
  const body: ParserIns[] = [];
  while (true) {
    const exp = parseArg(tokens, params);
    if (!len(exp)) {
      break;
    }
    push(body, exp);
  }
  return body;
}

export function arityCheck(op: string, nArg: number, errCtx: ErrCtx) {
  const { exactArity, maxArity, minArity } = ops[op];
  const aErr = (msg: string, amount: number) => [
    <InvokeError>{
      e: "Arity",
      m: `${op} needs ${msg} argument${amount !== 1 ? "s" : ""}, not ${nArg}`,
      errCtx,
    },
  ];
  if (exactArity !== undefined) {
    if (nArg !== exactArity) {
      return aErr(`exactly ${exactArity}`, exactArity);
    }
  } else {
    if (minArity && !maxArity && nArg < minArity) {
      return aErr(`at least ${minArity}`, minArity);
    } else if (!minArity && maxArity && nArg > maxArity) {
      return aErr(`at most ${maxArity}`, maxArity);
    } else if (minArity && maxArity && (nArg < minArity || nArg > maxArity)) {
      return aErr(`between ${minArity} and ${maxArity}`, maxArity);
    }
  }
}

function parseForm(
  tokens: Token[],
  params: string[],
  checkArity = true,
): ParserIns[] {
  const head = tokens.shift();
  if (!head) {
    return [];
  }
  const { typ, text, errCtx } = head;
  let op = text;
  const err = (value: string) => [<ParserIns>{ typ: "err", value, errCtx }];
  if (op === "catch") {
    if (tokens[0].typ !== "(") {
      return err("argument 1 must be expression");
    }
    const body = parseArg(tokens, params);
    const when = parseAllArgs(tokens, params);
    if (!len(body) || !len(when)) {
      return err("must provide at least 2 arguments");
    }
    return [...body, { typ: "cat", value: len(when), errCtx }, ...when];
  } else if (op === "var" || op === "let") {
    const [def, val] = [parseArg(tokens, params), parseArg(tokens, params)];
    const tooManyArgs = len(parseArg(tokens, params));
    if (!len(def) || !len(val) || tooManyArgs) {
      return err(
        `must provide declaration name and value${tooManyArgs ? " only" : ""}`,
      );
    }
    if (def[0].typ !== "def") {
      return err("declaration name must be symbol");
    }
    return [...val, { typ: op, value: def[0].value, errCtx }];
  } else if (op === "if" || op === "when") {
    const cond = parseArg(tokens, params);
    if (!len(cond)) {
      return err("must provide condition");
    }
    const ins: ParserIns[] = cond;
    if (op === "if") {
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
        if (len(parseArg(tokens, params))) {
          return err("too many branches");
        }
      } else {
        ins.push({ typ: "jmp", value: 1, errCtx });
        ins.push({ typ: "val", value: nullVal, errCtx });
      }
    } else {
      const body = parseAllArgs(tokens, params);
      ins.push({ typ: "if", value: len(body) + 1, errCtx });
      push(ins, body);
      ins.push({ typ: "jmp", value: 1, errCtx });
      ins.push({ typ: "val", value: nullVal, errCtx });
    }
    return ins;
  } else if (op === "and" || op === "or" || op === "while" || op === "recur") {
    const args: ParserIns[][] = [];
    let insCount = 0;
    while (true) {
      const arg = parseArg(tokens, params);
      if (!len(arg)) {
        break;
      }
      args.push(arg);
      insCount += len(arg);
    }
    if (op === "recur") {
      return [...flat(args), { typ: "rec", value: len(args), errCtx }];
    }
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
        { typ: "val", value: <Val>{ t: "bool", v: false }, errCtx },
      ]);
    } else {
      ins.push({ typ: "val", value: <Val>{ t: "bool", v: false }, errCtx });
    }
    return ins;
  }
  const headIns: Ins[] = [];
  let nArgs = 0;
  //Head is a form or parameter
  if (typ === "(" || has(params, text) || sub("%#@", strIdx(text, 0))) {
    tokens.unshift(head);
    const ins = parseArg(tokens, params);
    push(headIns, ins);
  }
  const body: Ins[] = [];
  while (len(tokens)) {
    const parsed = parseArg(tokens, params);
    if (!len(parsed)) {
      break;
    }
    ++nArgs;
    push(body, parsed);
  }
  if (op === "return") {
    return [...body, { typ: "ret", value: !!len(body), errCtx }];
  }

  //Operation arity check
  if (ops[op] && checkArity) {
    const errors = arityCheck(op, nArgs, errCtx);
    push(headIns, errors?.map(e => err(e.m)[0]) ?? []);
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
  params: string[],
  checkArity = true,
): ParserIns[] {
  if (!len(tokens)) {
    return [];
  }
  const { typ, text, errCtx } = tokens.shift() as Token;
  //Upon closure
  if (
    typ === "sym" &&
    sub("#@", text) &&
    len(tokens) &&
    tokens[0].typ === "("
  ) {
    const texts = tokens.map(t => t.text);
    const body = parseArg(tokens, params, text !== "@");
    const value = [slice(texts, 0, len(texts) - len(tokens)).join(" "), body];
    return [{ typ: text === "#" ? "clo" : "par", value, errCtx }];
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
      } else if (starts(text, ":")) {
        return [{ typ: "val", value: <Val>{ t: "key", v: text }, errCtx }];
      } else if (starts(text, "%") && isNum(substr(text, 1))) {
        const value = toNum(substr(text, 1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, errCtx }];
      } else if (has(params, text)) {
        return [{ typ: "npa", value: params.indexOf(text), errCtx }];
      } else if (text === "args") {
        return [{ typ: "upa", value: -1, errCtx }];
      } else if (ops[text]) {
        return [{ typ: "val", value: <Val>{ t: "func", v: text }, errCtx }];
      }
      return [{ typ: "ref", value: text, errCtx }];
    case "ref":
      return [{ typ: "def", value: text, errCtx }];
    case "(":
      return parseForm(tokens, params, checkArity);
    case ")":
    case "rem":
      return [];
    default:
      return assertUnreachable(typ);
  }
}

function partitionWhen<T>(
  array: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const a: T[] = [],
    b: T[] = [];
  for (let i = 0, isB = false; i < len(array); ++i) {
    isB ||= predicate(array[i]);
    (isB ? b : a).push(array[i]);
  }
  return [a, b];
}

function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const a: T[] = [],
    b: T[] = [];
  array.forEach(x => (predicate(x) ? b : a).push(x));
  return [a, b];
}

function syntaxise(
  { name, tokens }: NamedTokens,
  errCtx: ErrCtx,
): {
  func?: Func;
  err?: InvokeError;
} {
  const [params, body] = partitionWhen(
    tokens,
    t => t.typ !== "sym" || sub("%#@", t.text),
  );
  //In the case of e.g. (function (+))
  if (name === "(") {
    return { err: { e: "Parse", m: "nameless function", errCtx } };
  }
  //In the case of e.g. (function)
  if (!len(params) && !len(body)) {
    return { err: { e: "Parse", m: "empty function body", errCtx } };
  }
  if (len(body) && body[0].typ === ")") {
    if (len(params)) {
      //In the case of e.g. (function f %) or (function x y z)
      body.unshift(params.pop()!);
    } else {
      //In the case of e.g. (function name)
      return { err: { e: "Parse", m: "empty function body", errCtx } };
    }
  }
  //In the case of e.g. (function entry x y z)
  if (len(params) && !len(body)) {
    body.push(params.pop()!);
  }
  const ins: ParserIns[] = [];
  while (len(body)) {
    push(
      ins,
      parseArg(
        body,
        params.map(p => p.text),
      ),
    );
  }
  const parseErrors = ins.filter(i => i.typ === "err");
  if (len(parseErrors)) {
    return {
      err: {
        e: "Parse",
        m: <string>parseErrors[0].value,
        errCtx: parseErrors[0].errCtx,
      },
    };
  }
  return { func: { name, ins: <Ins[]>ins } };
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

function errorDetect(
  stringError: number[] | undefined,
  tokens: Token[],
  invocationId: string,
) {
  const errors: InvokeError[] = [];
  const err = (m: string, errCtx: ErrCtx) =>
    errors.push({ e: "Parse", m, errCtx });

  //Check for paren imbalance
  const countTyp = (t: Token["typ"]) =>
    len(tokens.filter(({ typ }) => typ === t));
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { invocationId, line, col });
    }
  }

  //Check for double-quote imbalance
  if (stringError) {
    const [line, col] = stringError;
    err("unmatched double quotation marks", { invocationId, line, col });
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

export function parse(
  code: string,
  invocationId: string,
): { funcs: Funcs; errors: InvokeError[] } {
  const { tokens, stringError } = tokenise(code, invocationId);
  const errors = errorDetect(stringError, tokens, invocationId);
  if (len(errors)) {
    return { errors, funcs: {} };
  }
  const segments = segment(tokens);
  const labelled = funcise(segments);
  const funcsAndErrors = labelled.map(named =>
    syntaxise(named, {
      invocationId,
      line: named.errCtx.line,
      col: named.errCtx.col,
    }),
  );
  const [funcArr, synErrors] = partition(funcsAndErrors, fae => !!fae.err);
  push(
    errors,
    synErrors.map(fae => fae.err!),
  );
  const funcs: Funcs = {};
  funcArr.forEach(({ func }) => (funcs[func!.name] = func!));
  return { errors, funcs };
}
