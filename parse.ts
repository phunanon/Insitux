import { partition } from "./utils";

export const ops = ["print-line", "execute-last", "+"];

export namespace Parse {
  type Token = { type: "str" | "num" | "sym" | "(" | ")"; text: string; line: number; col: number };
  type NamedTokens = { name: string; tokens: Token[] };

  function tokenise(code: string) {
    const tokens: Token[] = [];
    let inString = false,
      inSymbol = false,
      inNumber = false,
      line = 1,
      col = 0;
    for (const n in [...code]) {
      const c = code[n];
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
        inNumber = c == "." && !tokens[tokens.length - 1].text.includes(".");
      }
      if (inSymbol && isParen) {
        inSymbol = false;
      }
      if (!inString && !inSymbol && !inNumber) {
        if (isParen) {
          const text: "(" | ")" = c == "[" ? "(" : c == "]" ? ")" : c == "(" ? "(" : ")";
          tokens.push({ type: text, text, line, col });
          if (c == "[") {
            tokens.push({ type: "sym", text: "vec", line, col });
          }
          continue;
        }
        inNumber = isDigit;
        inSymbol = !inNumber;
        tokens.push({ type: inSymbol ? "sym" : "num", text: "", line, col });
      }
      tokens[tokens.length - 1].text += c;
    }
    return tokens;
  }

  function segment(tokens: Token[]): Token[][] {
    const segments: Token[][] = [[]];
    let depth = 0;
    tokens.forEach(token => {
      segments[segments.length - 1].push(token);
      depth += Number(token.text == "(") - Number(token.text == ")");
      if (depth == 0) {
        segments.push([]);
      }
    });
    return segments;
  }

  function funcise(segments: Token[][]): NamedTokens[] {
    const isFunc = (segment: Token[]) =>
      segment.length > 1 && segment[1].type == "sym" && segment[1].text == "function";
    const funcs = segments.filter(t => isFunc(t));
    const entries = segments.filter(t => !isFunc(t)).flat();
    const described = funcs.map(([p, f, name, ...tokens]) => ({ name: name.text, tokens }));
    return entries.length ? described.concat({ name: "entry", tokens: entries }) : described;
  }

  function tokensToSource(tokens: Token[]): string {
    return tokens
      .map(t => (t.type == "str" ? `"${t.text}"` : t.text))
      .join(" ")
      .replace(/\( /g, "(")
      .replace(/ \)/g, ")");
  }

  function parseArg(tokens: Token[]): Ins[] {
    const { type, text, line, col } = tokens.shift() as Token;
    switch (type) {
      case "str":
        return [{ type: "str", value: text, line, col }];
      case "num":
        return [{ type: "num", value: parseInt(text), line, col }];
      case "sym":
        if (text == "true" || text == "false") {
          return [{ type: "boo", value: text == "true", line, col }];
        }
        return [{ type: "var", value: text, line, col }];
      case "(": {
        const head = tokens.shift();
        if (!head) {
          break;
        }
        let { type, text, line, col } = head;
        if (text == "if") {
          const cond = parseArg(tokens);
          if (!cond.length) {
            return []; //TODO: emit invalid if warning (no condition)
          }
          const ins: Ins[] = cond;
          let tknsBefore = tokens.length;
          const ifT = parseArg(tokens);
          if (!ifT.length) {
            return []; //TODO: emit invalid if warning (no branches)
          }
          ins.push({ type: "if", value: tknsBefore - tokens.length + 1, line, col }, ...ifT);
          tknsBefore = tokens.length;
          const ifF = parseArg(tokens);
          if (ifF.length) {
            ins.push({ type: "els", value: tknsBefore - tokens.length, line, col }, ...ifF);
          }
          if (parseArg(tokens).length) {
            return []; //TODO: emit invalid if warning (too many branches)
          }
          return ins;
        }
        const headIns: Ins[] = [];
        let args = 0;
        //Head is a form
        if (type == "(") {
          tokens.unshift(head);
          const ins = parseArg(tokens);
          if (!ins.length) {
            return []; //TODO: emit invalid form head warning (empty)
          }
          headIns.push(...ins);
          text = "execute-last";
          ++args;
        }
        const body: Ins[] = [];
        while (tokens.length) {
          const parsed = parseArg(tokens);
          if (!parsed.length) {
            break;
          }
          ++args;
          body.push(...parsed);
        }
        headIns.push({ type: ops.includes(text) ? "op" : "exe", value: [text, args], line, col });
        return [...body, ...headIns];
      }
    }
    return [];
  }

  function syntaxise({ name, tokens }: NamedTokens): { [name: string]: Func } {
    const [params, body] = partition(tokens, t => t.type == "sym");
    const ins = parseArg(body);
    if (!ins.length) {
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
      funcs: funcs.map(syntaxise).reduce((funcs, func) => ({ ...funcs, ...func }), {} as Funcs),
      vars: {},
    };
  }
}
