import { arityCheck, keyOpErr, numOpErr, typeCheck } from "./checks";
import { makeClosure } from "./closure";
import { ParamsShape, Func, Funcs, Ins, Val, syntaxes, tagged } from "./types";
import { ops, Types, assertUnreachable, InvokeError, ErrCtx } from "./types";
import { _fun, _key, isNum, valType } from "./val";

export type Token = {
  typ: "str" | "num" | "sym" | "rem" | "(" | ")";
  text: string;
  errCtx: ErrCtx;
};
type Node = Token | Node[];
type ParserIns = Ins | { typ: "err"; value: string; errCtx: ErrCtx };
const nullVal: Val = { t: "null" };
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
  return (isToken(arg) && ["sym", "str"].includes(arg.typ) && arg.text) || "";
};
const token2str = ({ typ, text }: Token): string =>
  typ === "str" ? `"${text}"` : text;
function node2str(nodes: Node[]): string {
  const sym0 = symAt(nodes, 0);
  const isClosure = sym0 === "#" || sym0 === "@";
  if (isClosure) {
    nodes = nodes.slice(1);
  }
  return `${isClosure ? sym0 : ""}(${nodes
    .map(n => (isToken(n) ? token2str(n) : node2str(n)))
    .join(" ")})`;
}

/** Inserts pop instruction after penultimate body expression */
const poppedBody = (expressions: ParserIns[][]): ParserIns[] => {
  if (expressions.length === 1) {
    return expressions.flat();
  }
  const lastExp = expressions[expressions.length - 1];
  const truncatedExps = expressions.slice(0, expressions.length - 1);
  const popIns = <ParserIns>{
    typ: "pop",
    value: truncatedExps.length,
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
  const tokens: Token[] = [];
  const isDigit = (ch: string) => "0123456789".includes(ch);
  let inString = false as false | "'" | '"';
  let [line, col, inStringAt] = [1, 0, [1, 0]];
  let [inSymbol, inNumber, inHex] = [false, false, false];
  for (let i = 0, len = code.length; i < len; ++i) {
    const c = code[i],
      nextCh = i + 1 !== len ? code[i + 1] : "";
    ++col;
    if (c === "\\" && inString) {
      tokens[tokens.length - 1].text += doTransforms
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
        tokens.push({ typ: "str", text: "", errCtx });
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
    if (!inString && c === ";") {
      const nl = code.substring(++i).indexOf("\n");
      const text = code.substring(i, i + (nl > 0 ? nl : len - i));
      i += text.length;
      ++line;
      col = 0;
      if (emitComments) {
        tokens.push({ typ: "rem", text, errCtx });
      }
      continue;
    }
    const isParen = "()[]{}".includes(c);
    //Allow one . per number, or hex, or binary, else convert into symbol
    if (inNumber && !isDigit(c)) {
      const hexStart = c === "x" && tokens[tokens.length - 1].text === "0";
      inHex = inHex || hexStart;
      inNumber =
        (c === "b" && tokens[tokens.length - 1].text === "0") ||
        (c === "." && !tokens[tokens.length - 1].text.includes(".")) ||
        (inHex && (hexStart || "ABCDEFabcdef".includes(c)));
      if (!inNumber && !isParen && !isWhite) {
        inSymbol = true;
        tokens[tokens.length - 1].typ = "sym";
      }
    }
    //Stop scanning symbol if a paren
    if (inSymbol && isParen) {
      inSymbol = false;
    }
    //If we just finished concatenating a token
    if (!inString && !inSymbol && !inNumber) {
      if (isParen) {
        const text = "[{(".includes(c) ? "(" : ")";
        tokens.push({ typ: text, text: doTransforms ? text : c, errCtx });
        if (doTransforms && (c === "[" || c === "{")) {
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
    tokens[tokens.length - 1].text += c;
  }
  return { tokens, stringError: inString ? inStringAt : undefined };
}

/** Parses tokens into a tree where each node is a token or token list. */
function treeise(tokens: Token[]): Node[] {
  const nodes: Node[] = [];
  const _treeise = (tokens: Token[]): Node => {
    let prefix: Token | undefined;
    if (tokens[0].typ === "sym" && "@#".includes(tokens[0].text)) {
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
  while (tokens.length) {
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
      } else if (node.length < 3) {
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
  if (entries.length) {
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
  if (!nodes.length) {
    return [];
  }
  const nodeParser = (node: Node) => parseNode(node, params);
  let firstNode = nodes.shift()!;
  let head = nodeParser(firstNode);
  const { errCtx } = head[0];
  if (isToken(firstNode) && firstNode.typ === "sym") {
    //1-off arity deficiency rewritten as closure
    if (firstNode.text in ops) {
      const { exactArity, minArity } = ops[firstNode.text];
      const a = exactArity ?? minArity;
      if (a && a !== 1 && nodes.length + 1 === a) {
        nodes.unshift(firstNode);
        firstNode = { typ: "sym", text: "@", errCtx: firstNode.errCtx };
      }
    }
    if (
      (firstNode.text === "var" || firstNode.text === "let") &&
      nodes.length &&
      nodes.length % 2
    ) {
      nodes.unshift(firstNode);
      nodes.push({ typ: "sym", text: "%", errCtx: firstNode.errCtx });
      firstNode = { typ: "sym", text: "#", errCtx: firstNode.errCtx };
    }
    const { text: op, errCtx } = firstNode;
    const err = (m: string, eCtx = errCtx) => [
      <ParserIns>{ typ: "err", value: m, errCtx: eCtx },
    ];

    const needsCond = ["if", "if!", "when", "unless", "match", "satisfy"];
    if (needsCond.includes(op) && !nodes.length) {
      return err("provide a condition");
    } else if (op === "if" || op === "if!") {
      if (nodes.length === 1) {
        return err("provide at least one branch");
      } else if (nodes.length > 3) {
        return err(`provide one or two branches, not ${nodes.length}`);
      }
      const parsed = nodes.map(nodeParser);
      const [cond, branch1] = parsed;
      let branch2 = parsed[2];
      const ifN = op === "if!" && [
        <Ins>{ typ: "val", value: _fun("!"), errCtx },
        <Ins>{ typ: "exe", value: 1, errCtx },
      ];
      if (!branch2) {
        branch2 = [{ typ: "val", value: nullVal, errCtx }];
      }
      return [
        ...cond,
        ...(ifN || []),
        { typ: "if", value: branch1.length + 1, errCtx },
        ...branch1,
        { typ: "jmp", value: branch2.length, errCtx },
        ...branch2,
      ];
    } else if (op === "when" || op === "unless") {
      if (nodes.length === 1) {
        return err("provide a body");
      }
      const parsed = nodes.map(nodeParser);
      const [cond, body] = [parsed[0], parsed.slice(1)];
      const bodyIns = poppedBody(body);
      return [
        ...cond,
        ...(op === "unless"
          ? [
              <Ins>{ typ: "val", value: _fun("!") },
              <Ins>{ typ: "exe", value: 1 },
            ]
          : []),
        { typ: "if", value: bodyIns.length + 1, errCtx },
        ...bodyIns,
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: nullVal, errCtx },
      ];
    } else if (op === "match" || op === "satisfy") {
      const opIns: Ins["typ"] = op === "match" ? "mat" : "sat";
      const parsed = nodes.map(nodeParser);
      const [cond, args] = [parsed[0], parsed.slice(1)];
      const otherwise: ParserIns[] = args.length % 2 ? args.pop()! : [];
      if (!args.length) {
        return err("provide at least one case");
      }
      const elseLen = otherwise.length;
      let insCount =
        args.reduce((acc, a) => acc + a.length, 0) +
        (elseLen ? elseLen : 2) +
        args.length +
        1; //cond pop
      const ins: ParserIns[] = cond;
      while (args.length > 1) {
        const [a, when] = [args.shift()!, args.shift()!];
        ins.push(...a);
        ins.push({ typ: opIns, value: when.length + 1, errCtx: a[0].errCtx });
        ins.push(...when);
        insCount -= a.length + when.length + 2;
        ins.push({ typ: "jmp", value: insCount, errCtx });
      }
      ins.push({ typ: "pop", value: 1, errCtx });
      if (otherwise.length) {
        ins.push(...otherwise);
      } else {
        ins.push({ typ: "val", value: false, errCtx });
      }
      return ins;
    } else if (op === "catch") {
      if (nodes.length < 2) {
        return err("provide at least 2 arguments");
      }
      const when = nodeParser(nodes.pop()!);
      const body = nodes.flatMap(nodeParser);
      return [...body, { typ: "cat", value: when.length, errCtx }, ...when];
    } else if (op === "and" || op === "or" || op === "while") {
      const args = nodes.map(nodeParser);
      if (args.length < 2) {
        return err("provide at least 2 arguments");
      }
      const ins: ParserIns[] = [];
      if (op === "while") {
        const [head, body] = [args[0], args.slice(1)];
        const flatBody = poppedBody(body);
        const ifJmp = flatBody.length + 2;
        const looJmp = -(head.length + flatBody.length + 3);
        ins.push({ typ: "val", value: nullVal, errCtx });
        ins.push(...head);
        ins.push({ typ: "if", value: ifJmp, errCtx });
        ins.push({ typ: "pop", value: 1, errCtx });
        ins.push(...flatBody);
        ins.push({ typ: "loo", value: looJmp, errCtx });
        return ins;
      }
      let insCount = args.reduce((acc, a) => acc + a.length, 0);
      insCount += args.length; //+1 for each if/or ins
      insCount += Number(op === "and");
      const typ = op === "and" ? "if" : "or";
      for (let a = 0; a < args.length; ++a) {
        ins.push(...args[a]);
        insCount -= args[a].length;
        ins.push({ typ, value: insCount, errCtx });
        --insCount;
      }
      if (op === "and") {
        ins.push(
          { typ: "val", value: true, errCtx },
          { typ: "jmp", value: 1, errCtx },
        );
      }
      ins.push({ typ: "val", value: false, errCtx });
      return ins;
    } else if (op === "loop") {
      if (nodes.length < 3) {
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
        { typ: "val", value: 0, errCtx },
        { typ: "let", value: symNode.text, errCtx },
        ...parsed[0],
        { typ: "let", value: symNode.text + "-limit", errCtx },
        { typ: "pop", value: 1, errCtx },
        ...body,
        { typ: "ref", value: symNode.text, errCtx },
        { typ: "val", value: _fun("inc"), errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "let", value: symNode.text, errCtx },
        { typ: "ref", value: symNode.text + "-limit", errCtx },
        { typ: "val", value: _fun("<"), errCtx },
        { typ: "exe", value: 2, errCtx },
        { typ: "if", value: 2, errCtx },
        { typ: "pop", value: 1, errCtx },
        { typ: "loo", value: -(body.length + 10), errCtx },
      ];
      return ins;
    } else if (op === "loop-over") {
      if (nodes.length < 3) {
        return err("provide at least 3 arguments");
      }
      const parsed = nodes.map(nodeParser);
      const symNode = nodes[1];
      const body = poppedBody(parsed.slice(2));
      if (!isToken(symNode)) {
        return err("argument 2 must be symbol");
      }
      //(when (empty? <item>) null <exit>)
      //(let sym-item <item> sym-index 0 sym (sym-index sym-item)) ... body ...
      //(if (< (let sym-index (inc sym-index)) (len sym-item)) <exit> <loo>)
      const ins: ParserIns[] = [
        ...parsed[0],
        { typ: "val", value: _fun("empty?"), errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "if", value: 2, errCtx },
        { typ: "val", value: nullVal, errCtx },
        { typ: "jmp", value: parsed[0].length + 9 + body.length + 12, errCtx },
        ...parsed[0],
        { typ: "let", value: symNode.text + "-item", errCtx },
        { typ: "val", value: 0, errCtx },
        { typ: "let", value: symNode.text + "-index", errCtx },
        { typ: "jmp", value: 2, errCtx },
        { typ: "ref", value: symNode.text + "-item", errCtx },
        { typ: "ref", value: symNode.text + "-index", errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "let", value: symNode.text, errCtx },
        { typ: "pop", value: 1, errCtx },
        ...body,
        { typ: "ref", value: symNode.text + "-index", errCtx },
        { typ: "val", value: _fun("inc"), errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "let", value: symNode.text + "-index", errCtx },
        { typ: "ref", value: symNode.text + "-item", errCtx },
        { typ: "val", value: _fun("len"), errCtx },
        { typ: "exe", value: 1, errCtx },
        { typ: "val", value: _fun("<"), errCtx },
        { typ: "exe", value: 2, errCtx },
        { typ: "if", value: 2, errCtx },
        { typ: "pop", value: 1, errCtx },
        { typ: "loo", value: -(body.length + 17), errCtx },
      ];
      return ins;
    } else if (op === "var" || op === "let") {
      const defs = nodes.filter((n, i) => !(i % 2));
      const vals = nodes.filter((n, i) => !!(i % 2));
      if (!defs.length) {
        return err("provide at least 1 declaration name and value");
      } else if (defs.length > vals.length) {
        return err("provide a value after each declaration name");
      }
      const ins: ParserIns[] = [];
      const symErrMsg = `${op} name must be a new symbol or destructuring`;
      for (let d = 0, lim = defs.length; d < lim; ++d) {
        ins.push(...nodeParser(vals[d]));
        const def = defs[d];
        if (isToken(def)) {
          const defIns = parseNode(defs[d], params);
          if (defIns.length > 1 || defIns[0].typ !== "ref") {
            return err(symErrMsg, defIns[0].errCtx);
          }
          ins.push({ typ: op, value: defIns[0].value, errCtx });
        } else {
          const { shape, errors } = parseParams([def], true);
          if (errors.length) {
            return errors;
          }
          if (!shape.length) {
            return err(symErrMsg);
          }
          const typ = op === "var" ? "dva" : "dle";
          ins.push({ typ, value: shape, errCtx });
        }
      }
      return ins;
    } else if (op === "var!" || op === "let!") {
      //Rewrite e.g. (var! a + 1) -> (var a (+ 1 a))
      if (nodes.length < 2) {
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
        { typ: "exe", value: args.length + 1, errCtx },
        { typ, value: def.value, errCtx },
      ];
      return ins;
    } else if (op === "#" || op === "@" || op === "fn") {
      const pins: ParserIns[] = [];
      const name = node2str([firstNode, ...nodes]);
      const cloParams: string[] = [];
      const outerParams = params.map(p => p.name);
      let monoFnBody = false;
      if (op === "fn") {
        const parsedParams = parseParams(nodes, false);
        cloParams.push(...parsedParams.shape.map(p => p.name));
        params.push(...parsedParams.shape);
        pins.push(...parsedParams.errors);
        if (!nodes.length) {
          return err("provide a body");
        }
        monoFnBody = nodes.length === 1;
        nodes.unshift({ typ: "sym", text: "do", errCtx });
      }
      //Rewrite partial closure to #(... [body] args)
      if (op === "@") {
        const firstSym = symAt(nodes, 0);
        if (syntaxes.includes(firstSym)) {
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
      pins.push(...parseForm(nodes, params, op !== "@"));
      const cins = <Ins[]>pins.filter(i => i.typ !== "err");
      const errors = pins.filter(i => i.typ === "err");
      if (errors.length) {
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
      if (!nodes.length) {
        return err(`missing body`, errCtx);
      }
      const newNodes = nodes.reduce((acc, node) => [node, acc]) as Node[];
      const parsed = parseForm(newNodes, params);
      return parsed;
    }

    //Operation arity check, optionally disabled for partial closures
    if (ops[op] && doArityCheck) {
      const errors = arityCheck(op, nodes.length, errCtx);
      const err = (value: string, eCtx = errCtx) => [
        <ParserIns>{ typ: "err", value, errCtx: eCtx },
      ];
      head.push(...(errors?.map(e => err(e.m)[0]) ?? []));
      if (!errors) {
        //Upgrade some math and logic functions to their faster counterparts
        if (nodes.length === 2 && ops[`fast${op}`]) {
          head = nodeParser({ typ: "sym", text: `fast${op}`, errCtx });
        }
      }
    }
  }

  const args = nodes.map(nodeParser);
  const firstSym = symAt([firstNode]);
  if (firstSym === "return-when") {
    if (args.length < 1) {
      return [{ typ: "err", value: "provide a condition", errCtx }];
    }
    const [cond, ...params] = args;
    const flatParams = params.flat();
    return [
      ...cond,
      <ParserIns>{ typ: "if", value: flatParams.length + 1, errCtx },
      ...flatParams,
      <ParserIns>{ typ: "ret", value: !!(args.length - 1), errCtx },
    ];
  }
  const ins: ParserIns[] = args.flat();
  if (firstSym === "return") {
    return [...ins, { typ: "ret", value: !!args.length, errCtx }];
  } else if (head.length === 1 && head[0].typ === "ref") {
    //Transform potential external function into string
    const { value: v, errCtx } = head[0];
    head[0] = { typ: "val", value: v, errCtx };
  }
  ins.push(...head);
  const typ =
    head.length > 1 || ["npa", "upa"].includes(head[0].typ) ? "exa" : "exe";
  return [...ins, { typ, value: args.length, errCtx }];
}

function parseArg(node: Node, params: ParamsShape): ParserIns[] {
  if (isToken(node)) {
    const { errCtx } = node;
    if (node.typ === "str") {
      return [{ typ: "val", value: node.text, errCtx }];
    } else if (node.typ === "num") {
      return [{ typ: "val", value: Number(node.text), errCtx }];
    } else if (node.typ === "sym") {
      const { text } = node;
      const paramNames = params.map(({ name }) => name);
      if (text === "true" || text === "false") {
        return [{ typ: "val", value: text === "true", errCtx }];
      } else if (text === "null") {
        return [{ typ: "val", value: nullVal, errCtx }];
      } else if (text === "_") {
        return [{ typ: "val", value: { t: "wild" }, errCtx }];
      } else if (text.startsWith(":")) {
        return [{ typ: "val", value: _key(text), errCtx }];
      } else if (
        text === "%" ||
        (text.startsWith("%") && isNum(text.substring(1)))
      ) {
        const value = text === "%" ? 0 : Number(text.substring(1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, text, errCtx }];
      } else if (paramNames.includes(text)) {
        const param = params.find(({ name }) => name === text)!;
        if (param.position.length === 1) {
          return [{ typ: "npa", value: param.position[0], text, errCtx }];
        }
        return [{ typ: "dpa", value: param.position, errCtx }];
      } else if (text === "args") {
        return [{ typ: "upa", value: -1, text: "args", errCtx }];
      } else if (text === "PI" || text === "E") {
        const v = text === "PI" ? 3.141592653589793 : 2.718281828459045;
        return [{ typ: "val", value: v, errCtx }];
      } else if (ops[text]) {
        return [{ typ: "val", value: _fun(text), errCtx }];
      }
      return [{ typ: "ref", value: text, errCtx }];
    }
    return [];
  } else if (!node.length) {
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
  consumeLast: boolean,
  position: number[] = [],
): { shape: ParamsShape; errors: ParserIns[] } {
  const shape: ParamsShape = [],
    errs: ParserIns[] = [];
  let n = 0;
  while (
    nodes.length > (consumeLast ? 0 : 1) &&
    (isToken(nodes[0]) || symAt(nodes[0]) === "vec")
  ) {
    const param = nodes.shift()!;
    if (!isToken(param)) {
      param.shift();
      const parsed = parseParams(param, true, [...position, n]);
      shape.push(...parsed.shape);
      errs.push(...parsed.errors);
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

function compileFunc({ name, nodes }: NamedNodes): Func | InvokeError {
  const { shape: params, errors } = parseParams(nodes, false);
  const ins = [...errors, ...nodes.flatMap(node => parseArg(node, params))];
  //Check for useless tail return
  const lastIns = ins[ins.length - 1];
  if (lastIns && lastIns.typ === "ret") {
    ins.push({
      typ: "err",
      value: "useless tail return - put the value itself",
      errCtx: lastIns.errCtx,
    });
  }
  //Check for parse errors
  for (let i = 0, lim = ins.length; i < lim; i++) {
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
    let lim = tokens.length, t = untimely ? 0 : lim - 1, depth = 0;
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

function tokenErrorDetect(stringError: number[] | undefined, tokens: Token[]) {
  const invokeId = tokens.length ? tokens[0].errCtx.invokeId : "";
  const errors: InvokeError[] = [];
  const err = (m: string, errCtx: ErrCtx) =>
    errors.push({ e: "Parse", m, errCtx });

  //Check for double-quote imbalance
  if (stringError) {
    const [line, col] = stringError;
    err("unmatched quotation mark", { invokeId, line, col });
    return errors;
  }

  //Check for paren imbalance
  const countTyp = (t: Token["typ"]) =>
    tokens.filter(({ typ }) => typ === t).length;
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { invokeId: invokeId, line, col });
    }
  }

  //Check for any empty expressions
  let emptyHead: Token | undefined;
  for (let t = 0, lastWasL = false; t < tokens.length; ++t) {
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

//TODO: investigate Node implementation replacement
function insErrorDetect(fins: Ins[]): InvokeError[] | undefined {
  type TypeInfo = { types?: Types[]; val?: Val };
  const stack: TypeInfo[] = [];
  for (let i = 0, lim = fins.length; i < lim; ++i) {
    const ins = fins[i];
    switch (ins.typ) {
      case "val":
        stack.push({ types: [valType(ins.value)], val: ins.value });
        break;
      case "exa":
      case "exe": {
        const head = stack.pop()!;
        const args = stack.splice(stack.length - ins.value, ins.value);
        const badMatch = (okTypes: Types[]) =>
          args.findIndex(
            ({ types }) => types && !okTypes.find(t => types.includes(t)),
          );
        const headType = head.val
          ? valType(head.val)
          : head.types && head.types.length === 1 && head.types[0];
        if (head.val && tagged(head.val) && head.val.t === "func") {
          if (tagged(head.val) && head.val.v === "recur") {
            stack.splice(stack.length - ins.value, ins.value);
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
      case "clo": {
        const errors = insErrorDetect(fins.slice(i + 1, i + ins.value.length));
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
        i += fins[i].value as number; //The first jmp
        stack.push({});
        break;
      }
      case "pop":
        stack.splice(stack.length - ins.value, ins.value);
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
  invokeId: string,
): { funcs: Funcs; errors: InvokeError[] } {
  const { tokens, stringError } = tokenise(code, invokeId);
  const tokenErrors = tokenErrorDetect(stringError, tokens);
  if (tokenErrors.length) {
    return { errors: tokenErrors, funcs: {} };
  }
  const okFuncs: Func[] = [],
    errors: InvokeError[] = [];
  const tree = treeise([...tokens]);
  if (!tree.length) {
    return { funcs: {}, errors };
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
  const funcs: Funcs = {};
  okFuncs.forEach(func => (funcs[func.name ?? ""] = func));
  return { errors, funcs };
}
