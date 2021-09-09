"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
const poly_fills_1 = require("./poly-fills");
const types_1 = require("./types");
function tokenise(code, invocationId) {
    const tokens = [];
    const digits = "0123456789";
    let inString = false, isEscaped = false, inStringAt = [0, 0], inSymbol = false, inNumber = false, inComment = false, line = 1, col = 0;
    for (let i = 0, l = poly_fills_1.slen(code); i < l; ++i) {
        const c = poly_fills_1.strIdx(code, i), nextCh = i + 1 !== l ? poly_fills_1.strIdx(code, i + 1) : "";
        ++col;
        if (inComment) {
            if (c === "\n") {
                inComment = false;
                ++line;
                col = 0;
            }
            continue;
        }
        if (isEscaped) {
            isEscaped = false;
            if (inString) {
                tokens[poly_fills_1.len(tokens) - 1].text += { n: "\n", t: "\t" }[c] || `\\${c}`;
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
        const isWhite = poly_fills_1.sub(" \t\n\r", c);
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
            continue;
        }
        const errCtx = { invocationId, line, col };
        const isDigit = (ch) => poly_fills_1.sub(digits, ch);
        const isParen = poly_fills_1.sub("()[]{}", c);
        //Allow one . per number, or convert into symbol
        if (inNumber && !isDigit(c)) {
            inNumber = c === "." && !poly_fills_1.sub(tokens[poly_fills_1.len(tokens) - 1].text, ".");
            if (!inNumber && !isParen && !isWhite) {
                inSymbol = true;
                tokens[poly_fills_1.len(tokens) - 1].typ = "sym";
            }
        }
        //Stop scanning symbol if a paren
        if (inSymbol && isParen) {
            inSymbol = false;
        }
        //If we just finished concatenating a token
        if (!inString && !inSymbol && !inNumber) {
            if (isParen) {
                const parens = {
                    "[": "(",
                    "{": "(",
                    "(": "(",
                    ")": ")",
                    "}": ")",
                    "]": ")",
                };
                const text = parens[c];
                tokens.push({ typ: text, text, errCtx });
                if (c === "[") {
                    tokens.push({ typ: "sym", text: "vec", errCtx });
                }
                else if (c === "{") {
                    tokens.push({ typ: "sym", text: "dict", errCtx });
                }
                continue;
            }
            inNumber =
                isDigit(c) ||
                    (c === "." && isDigit(nextCh)) ||
                    (c === "-" && (isDigit(nextCh) || nextCh === "."));
            inSymbol = !inNumber;
            let typ = inSymbol ? "sym" : "num";
            if (poly_fills_1.len(tokens)) {
                const { typ: t, text } = tokens[poly_fills_1.len(tokens) - 1];
                if (t === "sym" && (text === "var" || text === "let")) {
                    typ = "ref";
                }
            }
            tokens.push({ typ, text: "", errCtx });
        }
        tokens[poly_fills_1.len(tokens) - 1].text += c;
    }
    return { tokens, stringError: inString ? inStringAt : undefined };
}
function segment(tokens) {
    const segments = [[]];
    let depth = 0;
    tokens.forEach(token => {
        segments[poly_fills_1.len(segments) - 1].push(token);
        depth += poly_fills_1.toNum(token.text === "(") - poly_fills_1.toNum(token.text === ")");
        if (depth === 0) {
            segments.push([]);
        }
    });
    return segments;
}
function funcise(segments) {
    const isFunc = (segment) => poly_fills_1.len(segment) > 1 &&
        segment[1].typ === "sym" &&
        segment[1].text === "function";
    const funcs = segments.filter(t => isFunc(t));
    const entries = poly_fills_1.flat(segments.filter(t => !isFunc(t)));
    const described = funcs.map(tokens => ({
        name: tokens[2].text,
        tokens: poly_fills_1.slice(tokens, 3),
        errCtx: tokens[2].errCtx,
    }));
    return poly_fills_1.len(entries)
        ? poly_fills_1.concat(described, [
            {
                name: "entry",
                tokens: entries,
                errCtx: entries[0].errCtx,
            },
        ])
        : described;
}
function parseArg(tokens, params) {
    if (!poly_fills_1.len(tokens)) {
        return [];
    }
    const { typ, text, errCtx } = tokens.shift();
    switch (typ) {
        case "str":
            return [{ typ: "str", value: text, errCtx }];
        case "num":
            return [{ typ: "num", value: poly_fills_1.toNum(text), errCtx }];
        case "sym":
            if (text === "true" || text === "false") {
                return [{ typ: "boo", value: text === "true", errCtx }];
            }
            else if (text === "null") {
                return [{ typ: "nul", value: undefined, errCtx }];
            }
            else if (poly_fills_1.starts(text, ":")) {
                return [{ typ: "key", value: text, errCtx }];
            }
            else if (poly_fills_1.starts(text, "#") && poly_fills_1.isNum(poly_fills_1.substr(text, 1))) {
                return [{ typ: "par", value: poly_fills_1.toNum(poly_fills_1.substr(text, 1)), errCtx }];
            }
            else if (poly_fills_1.has(params, text)) {
                return [{ typ: "par", value: params.indexOf(text), errCtx }];
            }
            else if (text === "args") {
                return [{ typ: "par", value: -1, errCtx }];
            }
            return [{ typ: "ref", value: text, errCtx }];
        case "ref":
            return [{ typ: "def", value: text, errCtx }];
        case "(": {
            const head = tokens.shift();
            if (!head) {
                break;
            }
            const { typ, text, errCtx } = head;
            let op = text;
            const err = (value) => [{ typ: "err", value, errCtx }];
            if (op === "var" || op === "let") {
                const [def, val] = [parseArg(tokens, params), parseArg(tokens, params)];
                if (!poly_fills_1.len(def) || !poly_fills_1.len(val) || poly_fills_1.len(parseArg(tokens, params))) {
                    return err("must provide reference name and value only");
                }
                return [...val, { typ: op, value: def[0].value, errCtx }];
            }
            else if (op === "if" || op === "when") {
                const cond = parseArg(tokens, params);
                if (!poly_fills_1.len(cond)) {
                    return err("must provide condition");
                }
                const ins = cond;
                if (op === "if") {
                    const ifT = parseArg(tokens, params);
                    if (!poly_fills_1.len(ifT)) {
                        return err("must provide a branch");
                    }
                    ins.push({ typ: "if", value: poly_fills_1.len(ifT) + 1, errCtx });
                    poly_fills_1.push(ins, ifT);
                    const ifF = parseArg(tokens, params);
                    if (poly_fills_1.len(ifF)) {
                        ins.push({ typ: "jmp", value: poly_fills_1.len(ifF), errCtx });
                        poly_fills_1.push(ins, ifF);
                        if (poly_fills_1.len(parseArg(tokens, params))) {
                            return err("too many branches");
                        }
                    }
                    else {
                        ins.push({ typ: "jmp", value: 1, errCtx });
                        ins.push({ typ: "nul", value: undefined, errCtx });
                    }
                }
                else {
                    const body = [];
                    while (true) {
                        const exp = parseArg(tokens, params);
                        if (!poly_fills_1.len(exp)) {
                            break;
                        }
                        poly_fills_1.push(body, exp);
                    }
                    ins.push({ typ: "if", value: poly_fills_1.len(body) + 1, errCtx });
                    poly_fills_1.push(ins, body);
                    ins.push({ typ: "jmp", value: 1, errCtx });
                    ins.push({ typ: "nul", value: undefined, errCtx });
                }
                return ins;
            }
            else if (op === "and" || op === "or" || op === "while") {
                const args = [];
                let insCount = 0;
                while (true) {
                    const arg = parseArg(tokens, params);
                    if (!poly_fills_1.len(arg)) {
                        break;
                    }
                    args.push(arg);
                    insCount += poly_fills_1.len(arg);
                }
                if (poly_fills_1.len(args) < 2) {
                    return err("requires at least two arguments");
                }
                const ins = [];
                if (op === "while") {
                    insCount += 2; //+1 for the if ins, +1 for the pop ins
                    const head = args.shift();
                    poly_fills_1.push(ins, head);
                    ins.push({ typ: "if", value: insCount - poly_fills_1.len(head), errCtx });
                    args.forEach(as => poly_fills_1.push(ins, as));
                    ins.push({ typ: "pop", value: poly_fills_1.len(args), errCtx });
                    ins.push({ typ: "loo", value: -(insCount + 1), errCtx });
                    return ins;
                }
                insCount += poly_fills_1.len(args); //+1 for each if/or ins
                insCount += poly_fills_1.toNum(op === "and");
                const typ = op === "and" ? "if" : "or";
                for (let a = 0; a < poly_fills_1.len(args); ++a) {
                    poly_fills_1.push(ins, args[a]);
                    insCount -= poly_fills_1.len(args[a]);
                    ins.push({ typ, value: insCount, errCtx });
                    --insCount;
                }
                if (op === "and") {
                    poly_fills_1.push(ins, [
                        { typ: "boo", value: true, errCtx },
                        { typ: "jmp", value: 1, errCtx },
                        { typ: "boo", value: false, errCtx },
                    ]);
                }
                else {
                    ins.push({ typ: "boo", value: false, errCtx });
                }
                return ins;
            }
            const headIns = [];
            let args = 0;
            //Head is a form or parameter
            if (typ === "(" || poly_fills_1.has(params, text) || poly_fills_1.starts(text, "#")) {
                tokens.unshift(head);
                const ins = parseArg(tokens, params);
                poly_fills_1.push(headIns, ins);
                op = "execute-last";
                ++args;
            }
            const body = [];
            while (poly_fills_1.len(tokens)) {
                const parsed = parseArg(tokens, params);
                if (!poly_fills_1.len(parsed)) {
                    break;
                }
                ++args;
                poly_fills_1.push(body, parsed);
            }
            headIns.push({
                typ: types_1.ops[op] ? "op" : "exe",
                value: [
                    typ === "num"
                        ? { t: "num", v: poly_fills_1.toNum(op) }
                        : poly_fills_1.starts(op, ":")
                            ? { t: "key", v: op }
                            : types_1.ops[op]
                                ? { t: "func", v: op }
                                : { t: "str", v: op },
                    args,
                ],
                errCtx,
            });
            return [...body, ...headIns];
        }
    }
    return [];
}
function partitionWhen(array, predicate) {
    const a = [], b = [];
    for (let i = 0, isB = false; i < poly_fills_1.len(array); ++i) {
        isB || (isB = predicate(array[i]));
        (isB ? b : a).push(array[i]);
    }
    return [a, b];
}
function partition(array, predicate) {
    const a = [], b = [];
    array.forEach(x => (predicate(x) ? b : a).push(x));
    return [a, b];
}
function syntaxise({ name, tokens }, errCtx) {
    const [params, body] = partitionWhen(tokens, t => t.typ !== "sym");
    //In the case of e.g. (function)
    if (!poly_fills_1.len(params) && !poly_fills_1.len(body)) {
        return {
            err: {
                e: "Parse",
                m: "empty function body",
                errCtx,
            },
        };
    }
    if (poly_fills_1.len(body) && body[0].typ === ")") {
        if (poly_fills_1.len(params)) {
            //In the case of e.g. (function f #)
            body.unshift(params.shift());
        }
        else {
            //In the case of e.g. (function name)
            return {
                err: {
                    e: "Parse",
                    m: "empty function body",
                    errCtx,
                },
            };
        }
    }
    //In the case of e.g. (function entry x y z)
    if (poly_fills_1.len(params) && !poly_fills_1.len(body)) {
        body.push(params.pop());
    }
    const ins = [];
    while (poly_fills_1.len(body)) {
        poly_fills_1.push(ins, parseArg(body, params.map(p => p.text)));
    }
    const parseErrors = ins.filter(i => i.typ === "err");
    if (poly_fills_1.len(parseErrors)) {
        return {
            err: {
                e: "Parse",
                m: parseErrors[0].value,
                errCtx: parseErrors[0].errCtx,
            },
        };
    }
    return { func: { name, ins: ins } };
}
function findParenImbalance(tokens, numL, numR) {
    //Scan for first instance of untimely closed
    //  or last instance of unclosed open
    const untimely = numR >= numL;
    const [l, r] = [untimely ? "(" : ")", untimely ? ")" : "("];
    const direction = untimely ? 1 : -1;
    for (let lim = poly_fills_1.len(tokens), t = untimely ? 0 : lim - 1, depth = 0; untimely ? t < lim : t >= 0; t += direction) {
        const { typ, errCtx: { line, col }, } = tokens[t];
        depth += poly_fills_1.toNum(typ === l) - poly_fills_1.toNum(typ === r);
        if (depth < 0) {
            return [line, col];
        }
    }
    return [0, 0];
}
function errorDetect(stringError, tokens, invocationId) {
    const errors = [];
    const err = (m, errCtx) => errors.push({ e: "Parse", m, errCtx });
    //Check for paren imbalance
    const countTyp = (t) => poly_fills_1.len(tokens.filter(({ typ }) => typ === t));
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
    let emptyHead;
    for (let t = 0, lastWasL = false; t < poly_fills_1.len(tokens); ++t) {
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
function parse(code, invocationId) {
    const { tokens, stringError } = tokenise(code, invocationId);
    const errors = errorDetect(stringError, tokens, invocationId);
    if (poly_fills_1.len(errors)) {
        return { errors, funcs: {} };
    }
    const segments = segment(tokens);
    const labelled = funcise(segments);
    const funcsAndErrors = labelled.map(named => syntaxise(named, {
        invocationId,
        line: named.errCtx.line,
        col: named.errCtx.col,
    }));
    const [funcArr, synErrors] = partition(funcsAndErrors, fae => !!fae.err);
    poly_fills_1.push(errors, synErrors.map(fae => fae.err));
    const funcs = {};
    funcArr.forEach(({ func }) => (funcs[func.name] = func));
    return { errors, funcs };
}
exports.parse = parse;
//# sourceMappingURL=parse.js.map