"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbols = exports.invoke = exports.exeFunc = exports.visKey = exports.visFun = exports.visDic = exports.visVec = exports.visNum = exports.visStr = exports.insituxVersion = void 0;
exports.insituxVersion = 20210909;
const parse_1 = require("./parse");
const poly_fills_1 = require("./poly-fills");
const test_1 = require("./test");
const types_1 = require("./types");
const val2str = ({ v, t }) => {
    switch (t) {
        case "bool":
            return `${v}`;
        case "num":
            return `${v}`;
        case "str":
        case "key":
            return v;
        case "vec":
            return `[${v.map(v => val2str(v)).join(" ")}]`;
        case "dict": {
            const { keys, vals } = v;
            const [ks, vs] = [keys.map(val2str), vals.map(val2str)];
            const entries = ks.map((k, i) => `${k} ${vs[i]}`);
            return `{${entries.join(", ")}}`;
        }
        case "null":
            return "null";
        case "func":
            return `<${v}>`;
    }
    return "?";
};
let stack = [];
const _boo = (v) => stack.push({ t: "bool", v });
const _num = (v) => stack.push({ t: "num", v });
const _str = (v = "") => stack.push({ t: "str", v });
const _key = (v) => stack.push({ t: "key", v });
const _vec = (v = []) => stack.push({ t: "vec", v });
const _dic = (v) => stack.push({ t: "dict", v });
const _ref = (v) => stack.push({ t: "ref", v });
const _nul = () => stack.push({ t: "null", v: undefined });
const _fun = (v) => stack.push({ t: "func", v });
const num = ({ v }) => v;
const str = ({ v }) => v;
const vec = ({ v }) => v;
const dic = ({ v }) => v;
const asBoo = ({ t, v }) => (t === "bool" ? v : t !== "null");
const visStr = (val) => val.t === "str";
exports.visStr = visStr;
const visNum = (val) => val.t === "num";
exports.visNum = visNum;
const visVec = (val) => val.t === "vec";
exports.visVec = visVec;
const visDic = (val) => val.t === "dict";
exports.visDic = visDic;
const visFun = (val) => val.t === "func";
exports.visFun = visFun;
const visKey = (val) => val.t === "key";
exports.visKey = visKey;
const asArray = ({ t, v }) => t === "vec"
    ? poly_fills_1.slice(v)
    : t === "str"
        ? [...v].map(s => ({ t: "str", v: s }))
        : t === "dict"
            ? v.keys.map((k, i) => ({
                t: "vec",
                v: [k, v.vals[i]],
            }))
            : [];
const stringify = (vals) => vals.reduce((cat, v) => cat + val2str(v), "");
const toDict = (args) => {
    if (poly_fills_1.len(args) % 2 === 1) {
        args.pop();
    }
    const keys = args.filter((_, i) => i % 2 === 0);
    const vals = args.filter((_, i) => i % 2 === 1);
    const ddKeys = [], ddVals = [];
    keys.forEach((key, i) => {
        const existingIdx = ddKeys.findIndex(k => isEqual(k, key));
        if (existingIdx === -1) {
            ddKeys.push(key);
            ddVals.push(vals[i]);
        }
        else {
            ddVals[existingIdx] = vals[i];
        }
    });
    return {
        t: "dict",
        v: { keys: ddKeys, vals: ddVals },
    };
};
const typeErr = (m, errCtx) => ({
    e: "Type",
    m,
    errCtx,
});
const isVecEqual = (a, b) => poly_fills_1.len(a) === poly_fills_1.len(b) && !a.some((x, i) => !isEqual(x, b[i]));
const isDictEqual = (a, b) => {
    const [ad, bd] = [dic(a), dic(b)];
    return poly_fills_1.len(ad.keys) === poly_fills_1.len(bd.keys) && isVecEqual(ad.keys, bd.keys);
};
const isEqual = (a, b) => {
    return a.t === b.t && a.t === "num"
        ? num(a) === num(b)
        : a.t === "str" || a.t === "key"
            ? str(a) === str(b)
            : a.t === "vec"
                ? isVecEqual(vec(a), vec(b))
                : a.t === "dict"
                    ? isDictEqual(a, b)
                    : false;
};
const dictGet = ({ keys, vals }, key) => {
    const idx = keys.findIndex(k => isEqual(k, key));
    return idx === -1 ? { t: "null", v: undefined } : vals[idx];
};
const dictSet = ({ keys, vals }, key, val) => {
    const [nKeys, nVals] = [poly_fills_1.slice(keys), poly_fills_1.slice(vals)];
    const idx = keys.findIndex(k => isEqual(k, key));
    if (idx !== -1) {
        nVals[idx] = val;
    }
    else {
        nKeys.push(key);
        nVals.push(val);
    }
    return { t: "dict", v: { keys: nKeys, vals: nVals } };
};
function exeOpViolations(op, args, errCtx) {
    const { types, exactArity, maxArity, minArity, onlyNum } = types_1.ops[op];
    const aErr = (msg) => [
        { e: "Arity", m: `${op} needs ${msg}`, errCtx },
    ];
    const nArg = poly_fills_1.len(args);
    if (exactArity !== undefined && nArg !== exactArity) {
        return aErr(`exactly ${exactArity} argument${exactArity !== 1 ? "s" : ""}`);
    }
    if (minArity && !maxArity && nArg < minArity) {
        return aErr(`at least ${minArity} argument${minArity !== 1 ? "s" : ""}`);
    }
    else if (!minArity && maxArity && nArg > maxArity) {
        return aErr(`at most ${maxArity} argument${maxArity !== 1 ? "s" : ""}`);
    }
    else if (minArity && maxArity && (nArg < minArity || nArg > maxArity)) {
        return aErr(`between ${minArity} and ${maxArity} arguments`);
    }
    if (onlyNum && args.findIndex(a => a.t !== "num") !== -1) {
        return [typeErr(`numeric arguments only`, errCtx)];
    }
    if (!types) {
        return [];
    }
    const typeViolations = types
        .map((need, i) => i < nArg &&
        (poly_fills_1.isArray(need)
            ? poly_fills_1.has(need, args[i].t)
                ? false
                : `argument ${i + 1} must be either: ${need
                    .map(t => types_1.typeNames[t])
                    .join(", ")}`
            : need === args[i].t
                ? false
                : `argument ${i + 1} must be ${types_1.typeNames[need]}`))
        .filter(r => !!r);
    return typeViolations.map(v => typeErr(v, errCtx));
}
async function exeOp(op, args, ctx, errCtx) {
    const tErr = (msg) => [typeErr(msg, errCtx)];
    //Argument arity and type checks
    {
        const violations = exeOpViolations(op, args, errCtx);
        if (poly_fills_1.len(violations)) {
            return violations;
        }
    }
    switch (op) {
        case "execute-last":
            return await getExe(ctx, args.pop(), errCtx)(args);
        case "str":
            stack.push({
                t: "str",
                v: stringify(args),
            });
            return [];
        case "print":
        case "print-str":
            {
                ctx.exe(op, [{ t: "str", v: stringify(args) }]);
                _nul();
            }
            return [];
        case "vec":
            _vec(args);
            return [];
        case "dict": {
            stack.push(toDict(args));
            return [];
        }
        case "len":
            _num(args[0].t === "str"
                ? poly_fills_1.slen(str(args[0]))
                : args[0].t === "vec"
                    ? poly_fills_1.len(vec(args[0]))
                    : poly_fills_1.len(dic(args[0]).keys));
            return [];
        case "num":
            if (!poly_fills_1.isNum(args[0].v)) {
                return [
                    {
                        e: "Convert",
                        m: `"${args[0].v}" could not be parsed as a number`,
                        errCtx,
                    },
                ];
            }
            _num(poly_fills_1.toNum(args[0].v));
            return [];
        case "!":
            _boo(!asBoo(args[0]));
            return [];
        case "=":
        case "!=":
            {
                for (let i = 1, lim = poly_fills_1.len(args); i < lim; ++i) {
                    if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
                        _boo(false);
                        return [];
                    }
                }
                _boo(true);
            }
            return [];
        case "+":
        case "-":
        case "*":
        case "/":
        case "//":
        case "**":
        case "rem":
        case "min":
        case "max":
            {
                if (poly_fills_1.len(args) === 1) {
                    if (op === "-") {
                        args.unshift({ t: "num", v: 0 });
                    }
                    else if (op === "**") {
                        _num(num(args[0]) ** 2);
                        return [];
                    }
                }
                const numOps = {
                    "+": (a, b) => a + b,
                    "-": (a, b) => a - b,
                    "*": (a, b) => a * b,
                    "/": (a, b) => a / b,
                    "//": (a, b) => poly_fills_1.floor(a / b),
                    "**": (a, b) => a ** b,
                    rem: (a, b) => a % b,
                    min: (a, b) => poly_fills_1.min(a, b),
                    max: (a, b) => poly_fills_1.max(a, b),
                };
                const f = numOps[op];
                _num(args.map(({ v }) => v).reduce((sum, n) => f(sum, n)));
            }
            return [];
        case "<":
        case ">":
        case "<=":
        case ">=":
            for (let i = 1, lim = poly_fills_1.len(args); i < lim; ++i) {
                const [a, b] = [num(args[i - 1]), num(args[i])];
                if ((op === "<" && a < b) ||
                    (op === ">" && a > b) ||
                    (op === "<=" && a <= b) ||
                    (op === ">=" && a >= b)) {
                    continue;
                }
                _boo(false);
                return [];
            }
            _boo(true);
            return [];
        case "inc":
        case "dec":
            _num(num(args[0]) + (op === "inc" ? 1 : -1));
            return [];
        case "abs":
            _num(poly_fills_1.abs(num(args[0])));
            return [];
        case "pi":
            _num(poly_fills_1.pi);
            return [];
        case "sin":
        case "cos":
        case "tan":
        case "sqrt":
        case "round":
        case "floor":
        case "ceil":
            _num({ sin: poly_fills_1.sin, cos: poly_fills_1.cos, tan: poly_fills_1.tan, sqrt: poly_fills_1.sqrt, round: poly_fills_1.round, floor: poly_fills_1.floor, ceil: poly_fills_1.ceil }[op](num(args[0])));
            return [];
        case "odd?":
        case "even?":
            _boo(num(args[0]) % 2 === (op === "odd?" ? 1 : 0));
            return [];
        case "pos?":
        case "neg?":
        case "zero?": {
            const n = num(args[0]);
            _boo(op === "pos?" ? n > 0 : op === "neg?" ? n < 0 : !n);
            return [];
        }
        case "null?":
        case "num?":
        case "bool?":
        case "str?":
        case "dict?":
        case "vec?":
        case "key?":
        case "func?":
            _boo((op === "null?" && args[0].t === "null") ||
                (op === "num?" && args[0].t === "num") ||
                (op === "bool?" && args[0].t === "bool") ||
                (op === "str?" && args[0].t === "str") ||
                (op === "dict?" && args[0].t === "dict") ||
                (op === "vec?" && args[0].t === "vec") ||
                (op === "key?" && args[0].t === "key") ||
                (op === "func?" && args[0].t === "func"));
            return [];
        case "has?":
            _boo(poly_fills_1.sub(str(args[0]), str(args[1])));
            return [];
        case "idx": {
            let i = -1;
            if (args[0].t === "str") {
                if (args[1].t !== "str") {
                    return tErr("strings can only contain strings");
                }
                i = poly_fills_1.subIdx(str(args[0]), str(args[1]));
            }
            else if (args[0].t === "vec") {
                i = vec(args[0]).findIndex(a => isEqual(a, args[1]));
            }
            if (i === -1) {
                _nul();
            }
            else {
                _num(i);
            }
            return [];
        }
        case "map":
        case "for":
        case "reduce":
        case "filter":
            {
                const closure = getExe(ctx, args.shift(), errCtx);
                const okT = (t) => t === "vec" || t === "str" || t === "dict";
                const badArg = op === "map" || op === "for"
                    ? args.findIndex(({ t }) => !okT(t))
                    : okT(args[0].t)
                        ? -1
                        : 0;
                if (badArg !== -1) {
                    return tErr(`argument 2 must be either: string, vector, dictionary`);
                }
                if (op === "for") {
                    const arrays = args.map(asArray);
                    const lims = arrays.map(poly_fills_1.len);
                    const divisors = lims.map((_, i) => poly_fills_1.slice(lims, 0, i + 1).reduce((sum, l) => sum * l));
                    divisors.unshift(1);
                    const lim = divisors.pop();
                    if (lim > ctx.loopBudget) {
                        return [{ e: "Budget", m: "would exceed loop budget", errCtx }];
                    }
                    const array = [];
                    for (let t = 0; t < lim; ++t) {
                        const argIdxs = divisors.map((d, i) => poly_fills_1.floor((t / d) % lims[i]));
                        const errors = await closure(arrays.map((a, i) => a[argIdxs[i]]));
                        if (poly_fills_1.len(errors)) {
                            return errors;
                        }
                        array.push(stack.pop());
                    }
                    _vec(array);
                    return [];
                }
                if (op === "map") {
                    const arrays = args.map(asArray);
                    const shortest = poly_fills_1.min(...arrays.map(a => poly_fills_1.len(a)));
                    const array = [];
                    for (let i = 0; i < shortest; ++i) {
                        const errors = await closure(arrays.map(a => a[i]));
                        if (poly_fills_1.len(errors)) {
                            return errors;
                        }
                        array.push(stack.pop());
                    }
                    _vec(array);
                    return [];
                }
                const array = asArray(args.shift());
                if (op === "filter") {
                    const filtered = [];
                    for (let i = 0, lim = poly_fills_1.len(array); i < lim; ++i) {
                        const errors = await closure([array[i]]);
                        if (poly_fills_1.len(errors)) {
                            return errors;
                        }
                        if (asBoo(stack.pop())) {
                            filtered.push(array[i]);
                        }
                    }
                    _vec(filtered);
                    return [];
                }
                if (poly_fills_1.len(array) < 2) {
                    poly_fills_1.push(stack, array);
                    return [];
                }
                let reduction = (poly_fills_1.len(args) ? args : array).shift();
                for (let i = 0, lim = poly_fills_1.len(array); i < lim; ++i) {
                    const errors = await closure([reduction, array[i]]);
                    if (poly_fills_1.len(errors)) {
                        return errors;
                    }
                    reduction = stack.pop();
                }
                stack.push(reduction);
            }
            return [];
        case "rand-int":
        case "rand-num":
            {
                const nArgs = poly_fills_1.len(args);
                const [a, b] = [
                    nArgs < 2 ? 0 : num(args[0]),
                    nArgs === 0
                        ? 1 + poly_fills_1.toNum(op === "rand-int")
                        : nArgs === 1
                            ? num(args[0])
                            : num(args[1]),
                ];
                _num(op === "rand-int" ? poly_fills_1.randInt(a, b) : poly_fills_1.randNum(a, b));
            }
            return [];
        case "do":
        case "val":
            stack.push(op === "do" ? args.pop() : args.shift());
            return [];
        case "..": {
            const closure = getExe(ctx, args.shift(), errCtx);
            return await closure(poly_fills_1.flat(args.map(a => (a.t === "vec" ? vec(a) : [a]))));
        }
        case "into": {
            const a0v = args[0].t === "vec";
            const a1v = args[1].t === "vec";
            if (a0v) {
                _vec(poly_fills_1.concat(vec(args[0]), a1v ? vec(args[1]) : asArray(args[1])));
            }
            else {
                if (a1v) {
                    const v1 = asArray(args[1]);
                    stack.push(toDict(poly_fills_1.concat(poly_fills_1.flat(asArray(args[0]).map(vec)), v1)));
                }
                else {
                    const { keys, vals } = dic(args[0]);
                    const d1 = dic(args[1]);
                    _dic({ keys: poly_fills_1.concat(keys, d1.keys), vals: poly_fills_1.concat(vals, d1.vals) });
                }
            }
            return [];
        }
        case "push": {
            if (args[0].t === "vec") {
                _vec(poly_fills_1.concat(asArray(args[0]), [args[1]]));
            }
            else {
                if (poly_fills_1.len(args) < 3) {
                    return [{ e: "Arity", m: `key and value both required`, errCtx }];
                }
                const { keys, vals } = dic(args[0]);
                _dic({ keys: poly_fills_1.concat(keys, [args[1]]), vals: poly_fills_1.concat(vals, [args[2]]) });
            }
            return [];
        }
        case "sect": {
            const v = args[0];
            const isVec = v.t === "vec";
            const vlen = isVec ? poly_fills_1.len(vec(v)) : poly_fills_1.slen(str(v));
            let a = 0, b = vlen;
            switch (poly_fills_1.len(args)) {
                case 1:
                    a = 1;
                    break;
                case 2: {
                    const del = num(args[1]);
                    if (del < 0) {
                        b += del;
                    }
                    else {
                        a += del;
                    }
                    break;
                }
                case 3: {
                    const skip = num(args[1]);
                    const take = num(args[2]);
                    a = skip < 0 ? vlen + skip + (take < 0 ? take : 0) : a + skip;
                    b = (take < 0 ? b : a) + take;
                    break;
                }
            }
            a = poly_fills_1.max(a, 0);
            b = poly_fills_1.min(b, vlen);
            if (a > b) {
                (isVec ? _vec : _str)();
                return [];
            }
            if (isVec) {
                _vec(poly_fills_1.slice(vec(v), a, b));
            }
            else {
                _str(poly_fills_1.substr(str(args[0]), a, b - a));
            }
            return [];
        }
        case "reverse":
            if (args[0].t === "str") {
                _str(stringify(poly_fills_1.reverse(asArray(args[0]))));
            }
            else {
                _vec(poly_fills_1.reverse(asArray(args[0])));
            }
            return [];
        case "sort": {
            if (!poly_fills_1.len(vec(args[0]))) {
                _vec();
                return [];
            }
            const src = asArray(args[0]);
            const mapped = [];
            if (poly_fills_1.len(args) === 1) {
                poly_fills_1.push(mapped, src.map(v => [v, v]));
            }
            else {
                const closure = getExe(ctx, args.pop(), errCtx);
                for (let i = 0, lim = poly_fills_1.len(src); i < lim; ++i) {
                    const errors = await closure([src[i]]);
                    if (poly_fills_1.len(errors)) {
                        return errors;
                    }
                    mapped.push([src[i], stack.pop()]);
                }
            }
            const okT = mapped[0][1].t;
            if (mapped.some(([_, { t }]) => t !== okT || !poly_fills_1.has(["num", "str"], t))) {
                return tErr("can only sort by all number or all string");
            }
            if (exports.visNum(mapped[0][1])) {
                poly_fills_1.sortBy(mapped, ([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
            }
            else {
                poly_fills_1.sortBy(mapped, ([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
            }
            _vec(mapped.map(([v]) => v));
            return [];
        }
        case "range": {
            const [a, b, s] = args.map(num);
            const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
            const [x, y] = poly_fills_1.len(args) > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
            const step = poly_fills_1.sign((y - x) * (s || 1)) * (s || 1);
            const count = poly_fills_1.ceil(poly_fills_1.abs((y - x) / step));
            if (count > ctx.rangeBudget) {
                return [{ e: "Budget", m: "range too large", errCtx }];
            }
            const nums = poly_fills_1.range(count).map(n => n * step + x);
            _vec(nums.map(v => ({ t: "num", v })));
            return [];
        }
        case "empty?":
            _boo(!poly_fills_1.len(asArray(args[0])));
            return [];
        case "keys":
        case "vals":
            _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
            return [];
        case "starts-with?":
            _boo(poly_fills_1.starts(str(args[0]), str(args[1])));
            return [];
        case "ends-with?":
            _boo(poly_fills_1.ends(str(args[0]), str(args[1])));
            return [];
        case "split":
            _vec(str(args[0])
                .split(poly_fills_1.len(args) > 1 ? str(args[1]) : " ")
                .map(v => ({ t: "str", v })));
            return [];
        case "join":
            _str(vec(args[0])
                .map(val2str)
                .join(poly_fills_1.len(args) > 1 ? str(args[1]) : " "));
            return [];
        case "time":
            _num(poly_fills_1.getTimeMs());
            return [];
        case "version":
            _num(exports.insituxVersion);
            return [];
        case "tests":
            {
                const tests = await test_1.doTests(invoke, !(poly_fills_1.len(args) && asBoo(args[0])));
                const summary = tests.pop();
                for (const test of tests) {
                    await exeOp("print", [{ v: test, t: "str" }], ctx, errCtx);
                }
                _str(summary);
            }
            return [];
        case "eval": {
            delete ctx.env.funcs["entry"];
            const sLen = poly_fills_1.len(stack);
            const errors = await parseAndExe(ctx, str(args[0]), errCtx.invocationId);
            if (poly_fills_1.len(errors)) {
                return [{ e: "Eval", m: "error within evaluated code", errCtx }];
            }
            if (sLen === poly_fills_1.len(stack)) {
                _nul();
            }
            return [];
        }
    }
    return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}
function getExe(ctx, op, errCtx) {
    const monoArityError = [{ e: "Arity", m: `one argument required`, errCtx }];
    if (exports.visStr(op) || exports.visFun(op)) {
        const str = op.v;
        if (types_1.ops[str]) {
            return (params) => exeOp(str, params, ctx, errCtx);
        }
        if (str in ctx.env.funcs) {
            return (params) => exeFunc(ctx, ctx.env.funcs[str], params);
        }
        if (str in ctx.env.vars) {
            return getExe(ctx, ctx.env.vars[str], errCtx);
        }
        if (str in ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1]) {
            return getExe(ctx, ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1][str], errCtx);
        }
        if (poly_fills_1.starts(str, "$")) {
            return async (params) => {
                if (!poly_fills_1.len(params)) {
                    return monoArityError;
                }
                const err = await ctx.set(poly_fills_1.substr(str, 1), params[0]);
                stack.push(params[0]);
                return err ? [{ e: "External", m: err, errCtx }] : [];
            };
        }
        return async (params) => {
            const { err, value } = await ctx.exe(str, params);
            if (!err) {
                stack.push(value);
            }
            return err ? [{ e: "External", m: err, errCtx }] : [];
        };
    }
    else if (exports.visKey(op)) {
        return async (params) => {
            if (!poly_fills_1.len(params)) {
                return monoArityError;
            }
            if (params[0].t !== "dict") {
                return [typeErr(`argument 1 must be dictionary`, errCtx)];
            }
            stack.push(dictGet(dic(params[0]), op));
            return [];
        };
    }
    else if (exports.visNum(op)) {
        const n = op.v;
        return async (params) => {
            if (!poly_fills_1.len(params)) {
                return monoArityError;
            }
            const a = params[0];
            if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
                return [
                    typeErr("argument must be string, vector, or dictionary", errCtx),
                ];
            }
            const arr = asArray(a);
            if (poly_fills_1.abs(n) >= poly_fills_1.len(arr)) {
                _nul();
            }
            else if (n < 0) {
                stack.push(arr[poly_fills_1.len(arr) + n]);
            }
            else {
                stack.push(arr[n]);
            }
            return [];
        };
    }
    else if (exports.visVec(op)) {
        const { v } = op;
        return async (params) => {
            if (!poly_fills_1.len(params)) {
                return monoArityError;
            }
            const found = v.find(val => isEqual(val, params[0]));
            if (found) {
                stack.push(found);
            }
            else {
                _nul();
            }
            return [];
        };
    }
    else if (exports.visDic(op)) {
        const dict = op.v;
        return async (params) => {
            if (poly_fills_1.len(params) === 1) {
                stack.push(dictGet(dict, params[0]));
            }
            else if (poly_fills_1.len(params) === 2) {
                stack.push(dictSet(dict, params[0], params[1]));
            }
            else {
                return [
                    {
                        e: "Arity",
                        m: `dict as operation takes one or two arguments`,
                        errCtx,
                    },
                ];
            }
            return [];
        };
    }
    return async (_) => [
        { e: "Operation", m: `${val2str(op)} is an invalid operation`, errCtx },
    ];
}
async function exeFunc(ctx, func, args) {
    --ctx.callBudget;
    ctx.env.lets.push({});
    for (let i = 0, lim = poly_fills_1.len(func.ins); i < lim; ++i) {
        const { typ, value, errCtx } = func.ins[i];
        const tooManyLoops = ctx.loopBudget < 1;
        if (tooManyLoops || ctx.callBudget < 1) {
            return [
                {
                    e: "Budget",
                    m: `${tooManyLoops ? "looped" : "called"} too many times`,
                    errCtx,
                },
            ];
        }
        switch (typ) {
            case "nul":
                _nul();
                break;
            case "boo":
                _boo(value);
                break;
            case "num":
                _num(value);
                break;
            case "str":
                _str(value);
                break;
            case "key":
                _key(value);
                break;
            case "var":
                ctx.env.vars[value] = stack[poly_fills_1.len(stack) - 1];
                break;
            case "let":
                ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1][value] =
                    stack[poly_fills_1.len(stack) - 1];
                break;
            case "par":
                {
                    const paramIdx = value;
                    if (paramIdx === -1) {
                        _vec(args);
                    }
                    else if (poly_fills_1.len(args) <= paramIdx) {
                        _nul();
                    }
                    else {
                        stack.push(args[paramIdx]);
                    }
                }
                break;
            case "ref":
                {
                    const name = value;
                    if (types_1.ops[name]) {
                        _fun(name);
                    }
                    else if (poly_fills_1.starts(name, "$")) {
                        const { value, err } = await ctx.get(poly_fills_1.substr(name, 1));
                        if (err) {
                            return [{ e: "External", m: err, errCtx }];
                        }
                        stack.push(value);
                    }
                    else if (name in ctx.env.vars) {
                        stack.push(ctx.env.vars[name]);
                    }
                    else if (name in ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1]) {
                        stack.push(ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1][name]);
                    }
                    else if (name in ctx.env.funcs) {
                        _fun(name);
                    }
                    else {
                        return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
                    }
                }
                break;
            case "op":
            case "exe":
                {
                    let [op, nArgs] = value;
                    const params = poly_fills_1.splice(stack, poly_fills_1.len(stack) - nArgs, nArgs);
                    if (poly_fills_1.len(params) !== nArgs) {
                        return [{ e: "Unexpected", m: `${op} stack depleted`, errCtx }];
                    }
                    //Tail-call optimisation
                    if (i === lim - 1 && exports.visStr(op) && op.v === func.name) {
                        ctx.env.lets[poly_fills_1.len(ctx.env.lets) - 1] = {};
                        i = -1;
                        args = params;
                        --ctx.recurBudget;
                        if (!ctx.recurBudget) {
                            return [{ e: "Budget", m: `recurred too many times`, errCtx }];
                        }
                        continue;
                    }
                    const closure = getExe(ctx, op, errCtx);
                    const errors = await closure(params);
                    if (poly_fills_1.len(errors)) {
                        return errors;
                    }
                }
                break;
            case "or":
                if (asBoo(stack[poly_fills_1.len(stack) - 1])) {
                    i += value;
                }
                else {
                    stack.pop();
                }
                break;
            case "if":
                if (!asBoo(stack.pop())) {
                    i += value;
                }
                break;
            case "jmp":
                i += value;
                break;
            case "loo":
                i += value;
                --ctx.loopBudget;
                break;
            case "pop":
                poly_fills_1.splice(stack, poly_fills_1.len(stack) - value, value);
                break;
        }
    }
    ctx.env.lets.pop();
    return [];
}
exports.exeFunc = exeFunc;
async function parseAndExe(ctx, code, invocationId) {
    const parsed = parse_1.parse(code, invocationId);
    if (poly_fills_1.len(parsed.errors)) {
        return parsed.errors;
    }
    ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
    if (!("entry" in ctx.env.funcs)) {
        return [];
    }
    return await exeFunc(ctx, ctx.env.funcs["entry"], []);
}
async function invoke(ctx, code, invocationId, printResult = false) {
    const { callBudget, loopBudget, rangeBudget } = ctx;
    const errors = await parseAndExe(ctx, code, invocationId);
    ctx.env.lets = [];
    ctx.callBudget = callBudget;
    ctx.loopBudget = loopBudget;
    ctx.rangeBudget = rangeBudget;
    delete ctx.env.funcs["entry"];
    if (!poly_fills_1.len(errors) && printResult && poly_fills_1.len(stack)) {
        await ctx.exe("print", [{ t: "str", v: val2str(stack[poly_fills_1.len(stack) - 1]) }]);
    }
    stack = [];
    return errors;
}
exports.invoke = invoke;
function symbols(ctx) {
    let syms = ["function"];
    syms = poly_fills_1.concat(syms, poly_fills_1.objKeys(types_1.ops).filter(o => o !== "execute-last"));
    syms = poly_fills_1.concat(syms, poly_fills_1.objKeys(ctx.env.funcs));
    syms = poly_fills_1.concat(syms, poly_fills_1.objKeys(ctx.env.vars));
    return syms;
}
exports.symbols = symbols;
//# sourceMappingURL=index.js.map