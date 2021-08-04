import {
  concat,
  flat,
  has,
  len,
  push,
  slice,
  splice,
  starts,
  sub,
  substr,
  toNum,
} from "./poly-fills";
import { ErrCtx, Func, Funcs, Ins, InvokeError } from "./types";

export const ops = [
  "print-line",
  "print",
  "execute-last",
  "define",
  "=",
  "!=",
  "+",
  "-",
  "*",
  "/",
  "<",
  ">",
  "<=",
  ">=",
  "inc",
  "dec",
  "vec",
  "dict",
  "len",
  "map",
  "reduce",
  "str",
  "rand-num",
  "rand-int",
];

export const minArities: { [op: string]: number } = {
  define: 2,
  "=": 2,
  "!=": 2,
  "+": 2,
  "-": 1,
  "*": 2,
  "/": 2,
  "<": 2,
  ">": 2,
  "<=": 2,
  ">=": 2,
  inc: 1,
  dec: 1,
  len: 1,
  map: 2,
  reduce: 2,
};

export const argsMustBeNum = [
  "+",
  "-",
  "*",
  "/",
  "<",
  ">",
  "<=",
  ">=",
  "inc",
  "dec",
];

type Token = {
  typ: "str" | "num" | "sym" | "ref" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
type NamedTokens = { name: string; tokens: Token[] };

function tokenise(code: string, invocationId: string) {
  const tokens: Token[] = [];
  let inString = false,
    inSymbol = false,
    inNumber = false,
    inComment = false,
    line = 1,
    col = 0;
  for (const c of [...code]) {
    ++col;
    if (inComment) {
      if (c === "\n") {
        inComment = false;
        ++line;
        col = 0;
      }
      continue;
    }
    if (c === '"') {
      if ((inString = !inString)) {
        tokens.push({
          typ: "str",
          text: "",
          errCtx: { invocationId, line, col },
        });
      }
      inNumber = inSymbol = false;
      continue;
    }
    if (!inString && sub(" \t\n", c)) {
      inNumber = inSymbol = false;
      if (c === "\n") {
        ++line;
        col = 0;
      }
      continue;
    }
    if (!inString && c === ";") {
      inComment = true;
      continue;
    }
    const errCtx: ErrCtx = { invocationId, line, col };
    const isDigit = sub("0123456789", c);
    const isParen = sub("()[]{}", c);
    if (inNumber && !isDigit) {
      inNumber = c === "." && !sub(tokens[len(tokens) - 1].text, ".");
    }
    if (inSymbol && isParen) {
      inSymbol = false;
    }
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
        tokens.push({ typ: text, text, errCtx });
        if (c === "[") {
          tokens.push({ typ: "sym", text: "vec", errCtx });
        } else if (c === "{") {
          tokens.push({ typ: "sym", text: "dict", errCtx });
        }
        continue;
      }
      inNumber = isDigit || c === ".";
      inSymbol = !inNumber;
      let typ: "sym" | "num" | "ref" = inSymbol ? "sym" : "num";
      if (len(tokens)) {
        const lastToken = tokens[len(tokens) - 1];
        if (lastToken.typ === "sym" && lastToken.text === "define") {
          typ = "ref";
        }
      }
      tokens.push({ typ, text: "", errCtx });
    }
    tokens[len(tokens) - 1].text += c;
  }
  return tokens;
}

function segment(tokens: Token[]): Token[][] {
  const segments: Token[][] = [[]];
  let depth = 0;
  tokens.forEach(token => {
    segments[len(segments) - 1].push(token);
    depth += toNum(token.text === "(") - toNum(token.text === ")");
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
  }));
  return len(entries)
    ? concat(described, [{ name: "entry", tokens: entries }])
    : described;
}

function parseArg(tokens: Token[], params: string[]): Ins[] {
  const { typ, text, errCtx } = tokens.shift() as Token;
  switch (typ) {
    case "str":
      return [{ typ: "str", value: text, errCtx }];
    case "num":
      return [{ typ: "num", value: toNum(text), errCtx }];
    case "sym":
      if (text === "true" || text === "false") {
        return [{ typ: "boo", value: text === "true", errCtx }];
      } else if (text == "null") {
        return [{ typ: "nul", value: undefined, errCtx }];
      } else if (starts(text, ":")) {
        return [{ typ: "key", value: text, errCtx }];
      } else if (starts(text, "%")) {
        return [{ typ: "par", value: toNum(substr(text, 1)), errCtx }];
      } else if (has(params, text)) {
        return [{ typ: "par", value: params.indexOf(text), errCtx }];
      }
      return [{ typ: "var", value: text, errCtx }];
    case "ref":
      return [{ typ: "ref", value: text, errCtx }];
    case "(": {
      const head = tokens.shift();
      if (!head) {
        break;
      }
      const { typ, text, errCtx } = head;
      let op = text;
      if (op === "if") {
        const cond = parseArg(tokens, params);
        if (!len(cond)) {
          return []; //TODO: emit invalid if warning (no condition)
        }
        const ins: Ins[] = cond;
        const ifT = parseArg(tokens, params);
        if (!len(ifT)) {
          return []; //TODO: emit invalid if warning (no branches)
        }
        ins.push({ typ: "if", value: len(ifT) + 1, errCtx });
        push(ins, ifT);
        const ifF = parseArg(tokens, params);
        if (len(ifF)) {
          ins.push({ typ: "els", value: len(ifF), errCtx });
          push(ins, ifF);
        }
        if (len(parseArg(tokens, params))) {
          return []; //TODO: emit invalid if warning (too many branches)
        }
        return ins;
      } else if (op === "and" || op === "or") {
        const args: Ins[][] = [];
        let insCount = 0;
        while (true) {
          const arg = parseArg(tokens, params);
          if (!len(arg)) {
            break;
          }
          args.push(arg);
          insCount += len(arg) + 1; //+1 for the if/or ins itself
        }
        const ins: Ins[] = [];
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
            { typ: "boo", value: true, errCtx },
            { typ: "els", value: 1, errCtx },
            { typ: "boo", value: false, errCtx },
          ]);
        } else {
          ins.push({ typ: "boo", value: false, errCtx });
        }
        return ins;
      }
      const headIns: Ins[] = [];
      let args = 0;
      //Head is a form
      if (typ === "(") {
        tokens.unshift(head);
        const ins = parseArg(tokens, params);
        if (!len(ins)) {
          return []; //TODO: emit invalid form head warning (empty)
        }
        push(headIns, ins);
        op = "execute-last";
        ++args;
      }
      const body: Ins[] = [];
      while (len(tokens)) {
        const parsed = parseArg(tokens, params);
        if (!len(parsed)) {
          break;
        }
        ++args;
        push(body, parsed);
      }
      headIns.push({
        typ: has(ops, op) ? "op" : "exe",
        value: [op, args],
        errCtx,
      });
      return [...body, ...headIns];
    }
  }
  return [];
}

function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const a: T[] = [],
    b: T[] = [];
  for (let i = 0, isB = false; i < len(array); ++i) {
    isB ||= !predicate(array[i]);
    (isB ? b : a).push(array[i]);
  }
  return [a, b];
}

function syntaxise({ name, tokens }: NamedTokens): Func {
  const [params, body] = partition(tokens, t => t.typ === "sym");
  //In the case of e.g. (entry x)
  if (!len(body) && len(params)) {
    body.push(params[0]);
    splice(params, 0, len(params));
  }
  const ins: Ins[] = [];
  while (true) {
    if (!len(body)) {
      break;
    }
    push(
      ins,
      parseArg(
        body,
        params.map(p => p.text)
      )
    );
  }
  return { name, ins };
}

function tokenErrorDetect(tokens: Token[], invocationId: string) {
  //Check for empty expression
  let emptyHead: Token | undefined;
  for (let t = 0, lastWasL = false; t < len(tokens); ++t) {
    if (lastWasL && tokens[t].typ === ")") {
      emptyHead = tokens[t];
      break;
    }
    lastWasL = tokens[t].typ === "(";
  }
  //Check for paren imbalance
  const numL = len(tokens.filter(({ typ }) => typ === "("));
  const numR = len(tokens.filter(({ typ }) => typ === ")"));
  const imbalanced = numL !== numR;

  const errors: InvokeError[] = [];
  if (imbalanced) {
    errors.push({
      e: "Parse Error",
      m: `there are unmatched parentheses`,
      errCtx: { invocationId, line: 0, col: 0 },
    });
  }
  if (emptyHead) {
    errors.push({
      e: "Parse Error",
      m: `empty expression forbidden`,
      errCtx: emptyHead.errCtx,
    });
  }
  return errors;
}

export function parse(
  code: string,
  invocationId: string
): { funcs: Funcs; errors: InvokeError[] } {
  const tokens = tokenise(code, invocationId);
  const tokenErrors = tokenErrorDetect(tokens, invocationId);
  const segments = segment(tokens);
  const labelled = funcise(segments);
  const funcs: Funcs = {};
  labelled.map(syntaxise).forEach(f => (funcs[f.name] = f));
  return { errors: tokenErrors, funcs };
}
