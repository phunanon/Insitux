import { len, toNum } from "./poly-fills";

export const ops = [
  "print-line",
  "execute-last",
  "define",
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
  "len",
  "map",
  "reduce",
];

export const minArities: { [op: string]: number } = {
  define: 2,
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
  type: "str" | "num" | "sym" | "ref" | "(" | ")";
  text: string;
  line: number;
  col: number;
};
type NamedTokens = { name: string; tokens: Token[] };

function tokenise(code: string) {
  const tokens: Token[] = [];
  let inString = false,
    inSymbol = false,
    inNumber = false,
    line = 1,
    col = 0;
  for (const n in [...code]) {
    const c = code[toNum(n)];
    ++col;
    if (c == '"') {
      if ((inString = !inString)) {
        tokens.push({ type: "str", text: "", line, col });
      }
      inNumber = inSymbol = false;
      continue;
    }
    if (!inString && " \t\n".includes(c)) {
      inNumber = inSymbol = false;
      if (c == "\n") {
        ++line;
        col = 0;
      }
      continue;
    }
    const isDigit = "0123456789".includes(c);
    const isParen = "()[]".includes(c);
    if (inNumber && !isDigit) {
      inNumber = c == "." && !tokens[len(tokens) - 1].text.includes(".");
    }
    if (inSymbol && isParen) {
      inSymbol = false;
    }
    if (!inString && !inSymbol && !inNumber) {
      if (isParen) {
        const text: "(" | ")" =
          c == "[" ? "(" : c == "]" ? ")" : c == "(" ? "(" : ")";
        tokens.push({ type: text, text, line, col });
        if (c == "[") {
          tokens.push({ type: "sym", text: "vec", line, col });
        }
        continue;
      }
      inNumber = isDigit;
      inSymbol = !inNumber;
      let type: "sym" | "num" | "ref" = inSymbol ? "sym" : "num";
      {
        const lastToken = tokens[len(tokens) - 1];
        if (lastToken.type == "sym" && lastToken.text == "define") {
          type = "ref";
        }
      }
      tokens.push({ type, text: "", line, col });
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
    depth += toNum(token.text == "(") - toNum(token.text == ")");
    if (depth == 0) {
      segments.push([]);
    }
  });
  return segments;
}

function funcise(segments: Token[][]): NamedTokens[] {
  const isFunc = (segment: Token[]) =>
    len(segment) > 1 &&
    segment[1].type == "sym" &&
    segment[1].text == "function";
  const funcs = segments.filter(t => isFunc(t));
  const entries = segments.filter(t => !isFunc(t)).flat();
  const described = funcs.map(([p, f, name, ...tokens]) => ({
    name: name.text,
    tokens,
  }));
  return len(entries)
    ? described.concat({ name: "entry", tokens: entries })
    : described;
}

function tokensToSource(tokens: Token[]): string {
  return tokens
    .map(t => (t.type == "str" ? `"${t.text}"` : t.text))
    .join(" ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
}

function parseArg(tokens: Token[], params: string[]): Ins[] {
  const { type, text, line, col } = tokens.shift() as Token;
  switch (type) {
    case "str":
      return [{ type: "str", value: text, line, col }];
    case "num":
      return [{ type: "num", value: toNum(text), line, col }];
    case "sym":
      if (text == "true" || text == "false") {
        return [{ type: "boo", value: text == "true", line, col }];
      } else if (text.startsWith(":")) {
        return [{ type: "key", value: text, line, col }];
      } else if (text.startsWith("%")) {
        return [{ type: "par", value: toNum(text.substr(1)), line, col }];
      } else if (params.includes(text)) {
        return [{ type: "par", value: params.indexOf(text), line, col }];
      }
      return [{ type: "var", value: text, line, col }];
    case "ref":
      return [{ type: "ref", value: text, line, col }];
    case "(": {
      const head = tokens.shift();
      if (!head) {
        break;
      }
      let { type, text, line, col } = head;
      if (text == "if") {
        const cond = parseArg(tokens, params);
        if (!len(cond)) {
          return []; //TODO: emit invalid if warning (no condition)
        }
        const ins: Ins[] = cond;
        let tknsBefore = len(tokens);
        const ifT = parseArg(tokens, params);
        if (!len(ifT)) {
          return []; //TODO: emit invalid if warning (no branches)
        }
        ins.push(
          { type: "if", value: tknsBefore - len(tokens) + 1, line, col },
          ...ifT
        );
        tknsBefore = len(tokens);
        const ifF = parseArg(tokens, params);
        if (len(ifF)) {
          ins.push(
            { type: "els", value: tknsBefore - len(tokens), line, col },
            ...ifF
          );
        }
        if (len(parseArg(tokens, params))) {
          return []; //TODO: emit invalid if warning (too many branches)
        }
        return ins;
      }
      const headIns: Ins[] = [];
      let args = 0;
      //Head is a form
      if (type == "(") {
        tokens.unshift(head);
        const ins = parseArg(tokens, params);
        if (!len(ins)) {
          return []; //TODO: emit invalid form head warning (empty)
        }
        headIns.push(...ins);
        text = "execute-last";
        ++args;
      }
      const body: Ins[] = [];
      while (len(tokens)) {
        const parsed = parseArg(tokens, params);
        if (!len(parsed)) {
          break;
        }
        ++args;
        body.push(...parsed);
      }
      headIns.push({
        type: ops.includes(text) ? "op" : "exe",
        value: [text, args],
        line,
        col,
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

function syntaxise({ name, tokens }: NamedTokens): { [name: string]: Func } {
  const [params, body] = partition(tokens, t => t.type == "sym");
  const ins: Ins[] = [];
  while (true) {
    if (!len(body)) {
      break;
    }
    ins.push(
      ...parseArg(
        body,
        params.map(p => p.text)
      )
    );
  }
  if (!len(ins)) {
    return {};
  }
  return {
    [name]: { name, params: params.map(t => t.text), ins },
  };
}

export function parse(code: string): Env {
  const tokens = tokenise(code);
  const segments = segment(tokens);
  const funcs = funcise(segments);
  console.dir(funcs, { depth: 10 });
  return {
    funcs: funcs
      .map(syntaxise)
      .reduce((funcs, func) => ({ ...funcs, ...func }), {} as Funcs),
    vars: {},
  };
}
