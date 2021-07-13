type SourceTrace = { source: { line: number; text: string } };

type SyntaxConst = {
  value: SyntaxForm | string | number | boolean;
};

type SyntaxForm = SourceTrace & {
  args: SyntaxConst[];
};

type SyntaxFunc = SourceTrace & {
  name: string;
  params: string[];
  forms: SyntaxForm[];
};

export namespace Parse {
  type Token = { type: "str" | "num" | "sym" | "par"; text: string };

  function tokenise(code: string) {
    const tokens: Token[] = [];
    let inString = false,
      inSymbol = false,
      inNumber = false;
    for (const c of code) {
      if (c == '"') {
        if ((inString = !inString)) {
          tokens.push({ type: "str", text: "" });
        }
        inNumber = inSymbol = false;
        continue;
      }
      if (!inString && c == " ") {
        inNumber = inSymbol = false;
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
          tokens.push({ type: "par", text: c == "[" ? "(" : c == "]" ? ")" : c });
          if (c == "[") {
            tokens.push({ type: "sym", text: "vec" });
          }
          continue;
        }
        inNumber = isDigit;
        inSymbol = !inNumber;
        tokens.push({ type: inSymbol ? "sym" : "num", text: "" });
      }
      tokens[tokens.length - 1].text += c;
    }
    return tokens;
  }

  export function parse(code: string): SyntaxFunc[] {
    const funcs: SyntaxFunc[] = [
      { name: "entry", params: [], forms: [], source: { line: 0, text: "" } },
    ];
    const tokens = tokenise(code);
    console.log(tokens);
    return funcs;
  }
}
