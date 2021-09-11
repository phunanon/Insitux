/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 607:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.symbols = exports.invoke = exports.exeFunc = exports.visKey = exports.visFun = exports.visDic = exports.visVec = exports.visNum = exports.visStr = exports.insituxVersion = void 0;
exports.insituxVersion = 20210911;
const parse_1 = __webpack_require__(306);
const poly_fills_1 = __webpack_require__(17);
const test_1 = __webpack_require__(127);
const types_1 = __webpack_require__(699);
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
    ? (0, poly_fills_1.slice)(v)
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
    if ((0, poly_fills_1.len)(args) % 2 === 1) {
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
const isVecEqual = (a, b) => (0, poly_fills_1.len)(a) === (0, poly_fills_1.len)(b) && !a.some((x, i) => !isEqual(x, b[i]));
const isDictEqual = (a, b) => {
    const [ad, bd] = [dic(a), dic(b)];
    return (0, poly_fills_1.len)(ad.keys) === (0, poly_fills_1.len)(bd.keys) && isVecEqual(ad.keys, bd.keys);
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
    const [nKeys, nVals] = [(0, poly_fills_1.slice)(keys), (0, poly_fills_1.slice)(vals)];
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
    const aErr = (msg, amount) => [
        {
            e: "Arity",
            m: `${op} needs ${msg} argument${amount !== 1 ? "s" : ""}`,
            errCtx,
        },
    ];
    const nArg = (0, poly_fills_1.len)(args);
    if (exactArity !== undefined) {
        if (nArg !== exactArity) {
            return aErr(`exactly ${exactArity}`, exactArity);
        }
    }
    else {
        if (minArity && !maxArity && nArg < minArity) {
            return aErr(`at least ${minArity}`, minArity);
        }
        else if (!minArity && maxArity && nArg > maxArity) {
            return aErr(`at most ${maxArity}`, maxArity);
        }
        else if (minArity && maxArity && (nArg < minArity || nArg > maxArity)) {
            return aErr(`between ${minArity} and ${maxArity}`, maxArity);
        }
    }
    if (onlyNum) {
        return args.findIndex(a => a.t !== "num") !== -1
            ? [typeErr(`numeric arguments only`, errCtx)]
            : [];
    }
    if (!types) {
        return [];
    }
    const typeViolations = types
        .map((need, i) => i < nArg &&
        ((0, poly_fills_1.isArray)(need)
            ? (0, poly_fills_1.has)(need, args[i].t)
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
        if ((0, poly_fills_1.len)(violations)) {
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
                ? (0, poly_fills_1.slen)(str(args[0]))
                : args[0].t === "vec"
                    ? (0, poly_fills_1.len)(vec(args[0]))
                    : (0, poly_fills_1.len)(dic(args[0]).keys));
            return [];
        case "num":
            if ((0, poly_fills_1.isNum)(args[0].v)) {
                _num((0, poly_fills_1.toNum)(args[0].v));
            }
            else {
                _nul();
            }
            return [];
        case "!":
            _boo(!asBoo(args[0]));
            return [];
        case "=":
        case "!=":
            for (let i = 1, lim = (0, poly_fills_1.len)(args); i < lim; ++i) {
                if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
                    _boo(false);
                    return [];
                }
            }
            _boo(true);
            return [];
        case "-":
            _num((0, poly_fills_1.len)(args) === 1
                ? -num(args[0])
                : args.map(num).reduce((sum, n) => sum - n));
            return [];
        case "**":
            _num(num(args[0]) ** ((0, poly_fills_1.len)(args) === 1 ? 2 : num(args[1])));
            return [];
        case "+":
            _num(args.map(num).reduce((sum, n) => sum + n));
            return [];
        case "*":
            _num(args.map(num).reduce((sum, n) => sum * n));
            return [];
        case "/":
            _num(args.map(num).reduce((sum, n) => sum / n));
            return [];
        case "//":
            _num(args.map(num).reduce((sum, n) => (0, poly_fills_1.floor)(sum / n)));
            return [];
        case "rem":
            _num(args.map(num).reduce((sum, n) => sum % n));
            return [];
        case "min":
            _num(args.map(num).reduce((sum, n) => (0, poly_fills_1.min)(sum, n)));
            return [];
        case "max":
            _num(args.map(num).reduce((sum, n) => (0, poly_fills_1.max)(sum, n)));
            return [];
        case "<":
        case ">":
        case "<=":
        case ">=":
            for (let i = 1, lim = (0, poly_fills_1.len)(args); i < lim; ++i) {
                const [a, b] = [args[i - 1].v, args[i].v];
                if ((op === "<" && a >= b) ||
                    (op === ">" && a <= b) ||
                    (op === "<=" && a > b) ||
                    (op === ">=" && a < b)) {
                    _boo(false);
                    return [];
                }
            }
            _boo(true);
            return [];
        case "inc":
            _num(args[0].v + 1);
            return [];
        case "dec":
            _num(args[0].v - 1);
            return [];
        case "abs":
            _num((0, poly_fills_1.abs)(num(args[0])));
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
            _boo((0, poly_fills_1.sub)(str(args[0]), str(args[1])));
            return [];
        case "idx": {
            let i = -1;
            if (args[0].t === "str") {
                if (args[1].t !== "str") {
                    return tErr("strings can only contain strings");
                }
                i = (0, poly_fills_1.subIdx)(str(args[0]), str(args[1]));
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
                    const divisors = lims.map((_, i) => (0, poly_fills_1.slice)(lims, 0, i + 1).reduce((sum, l) => sum * l));
                    divisors.unshift(1);
                    const lim = divisors.pop();
                    if (lim > ctx.loopBudget) {
                        return [{ e: "Budget", m: "would exceed loop budget", errCtx }];
                    }
                    const array = [];
                    for (let t = 0; t < lim; ++t) {
                        const argIdxs = divisors.map((d, i) => (0, poly_fills_1.floor)((t / d) % lims[i]));
                        const errors = await closure(arrays.map((a, i) => a[argIdxs[i]]));
                        if ((0, poly_fills_1.len)(errors)) {
                            return errors;
                        }
                        array.push(stack.pop());
                    }
                    _vec(array);
                    return [];
                }
                if (op === "map") {
                    const arrays = args.map(asArray);
                    const shortest = (0, poly_fills_1.min)(...arrays.map(a => (0, poly_fills_1.len)(a)));
                    const array = [];
                    for (let i = 0; i < shortest; ++i) {
                        const errors = await closure(arrays.map(a => a[i]));
                        if ((0, poly_fills_1.len)(errors)) {
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
                    for (let i = 0, lim = (0, poly_fills_1.len)(array); i < lim; ++i) {
                        const errors = await closure([array[i]]);
                        if ((0, poly_fills_1.len)(errors)) {
                            return errors;
                        }
                        if (asBoo(stack.pop())) {
                            filtered.push(array[i]);
                        }
                    }
                    _vec(filtered);
                    return [];
                }
                if ((0, poly_fills_1.len)(array) < 2) {
                    (0, poly_fills_1.push)(stack, array);
                    return [];
                }
                let reduction = ((0, poly_fills_1.len)(args) ? args : array).shift();
                for (let i = 0, lim = (0, poly_fills_1.len)(array); i < lim; ++i) {
                    const errors = await closure([reduction, array[i]]);
                    if ((0, poly_fills_1.len)(errors)) {
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
                const nArgs = (0, poly_fills_1.len)(args);
                const [a, b] = [
                    nArgs < 2 ? 0 : num(args[0]),
                    nArgs === 0
                        ? 1 + (0, poly_fills_1.toNum)(op === "rand-int")
                        : nArgs === 1
                            ? num(args[0])
                            : num(args[1]),
                ];
                _num(op === "rand-int" ? (0, poly_fills_1.randInt)(a, b) : (0, poly_fills_1.randNum)(a, b));
            }
            return [];
        case "do":
        case "val":
            stack.push(op === "do" ? args.pop() : args.shift());
            return [];
        case "..": {
            const closure = getExe(ctx, args.shift(), errCtx);
            return await closure((0, poly_fills_1.flat)(args.map(a => (a.t === "vec" ? vec(a) : [a]))));
        }
        case "into": {
            const a0v = args[0].t === "vec";
            const a1v = args[1].t === "vec";
            if (a0v) {
                _vec((0, poly_fills_1.concat)(vec(args[0]), a1v ? vec(args[1]) : asArray(args[1])));
            }
            else {
                if (a1v) {
                    const v1 = asArray(args[1]);
                    stack.push(toDict((0, poly_fills_1.concat)((0, poly_fills_1.flat)(asArray(args[0]).map(vec)), v1)));
                }
                else {
                    const { keys, vals } = dic(args[0]);
                    const d1 = dic(args[1]);
                    _dic({ keys: (0, poly_fills_1.concat)(keys, d1.keys), vals: (0, poly_fills_1.concat)(vals, d1.vals) });
                }
            }
            return [];
        }
        case "push": {
            if (args[0].t === "vec") {
                _vec((0, poly_fills_1.concat)(asArray(args[0]), [args[1]]));
            }
            else {
                if ((0, poly_fills_1.len)(args) < 3) {
                    return [{ e: "Arity", m: `key and value both required`, errCtx }];
                }
                const { keys, vals } = dic(args[0]);
                _dic({ keys: (0, poly_fills_1.concat)(keys, [args[1]]), vals: (0, poly_fills_1.concat)(vals, [args[2]]) });
            }
            return [];
        }
        case "sect": {
            const v = args[0];
            const isVec = v.t === "vec";
            const vlen = isVec ? (0, poly_fills_1.len)(vec(v)) : (0, poly_fills_1.slen)(str(v));
            let a = 0, b = vlen;
            switch ((0, poly_fills_1.len)(args)) {
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
            a = (0, poly_fills_1.max)(a, 0);
            b = (0, poly_fills_1.min)(b, vlen);
            if (a > b) {
                (isVec ? _vec : _str)();
                return [];
            }
            if (isVec) {
                _vec((0, poly_fills_1.slice)(vec(v), a, b));
            }
            else {
                _str((0, poly_fills_1.substr)(str(args[0]), a, b - a));
            }
            return [];
        }
        case "reverse":
            if (args[0].t === "str") {
                _str(stringify((0, poly_fills_1.reverse)(asArray(args[0]))));
            }
            else {
                _vec((0, poly_fills_1.reverse)(asArray(args[0])));
            }
            return [];
        case "sort": {
            if (!(0, poly_fills_1.len)(vec(args[0]))) {
                _vec();
                return [];
            }
            const src = asArray(args[0]);
            const mapped = [];
            if ((0, poly_fills_1.len)(args) === 1) {
                (0, poly_fills_1.push)(mapped, src.map(v => [v, v]));
            }
            else {
                const closure = getExe(ctx, args.pop(), errCtx);
                for (let i = 0, lim = (0, poly_fills_1.len)(src); i < lim; ++i) {
                    const errors = await closure([src[i]]);
                    if ((0, poly_fills_1.len)(errors)) {
                        return errors;
                    }
                    mapped.push([src[i], stack.pop()]);
                }
            }
            const okT = mapped[0][1].t;
            if (mapped.some(([_, { t }]) => t !== okT || !(0, poly_fills_1.has)(["num", "str"], t))) {
                return tErr("can only sort by all number or all string");
            }
            if ((0, exports.visNum)(mapped[0][1])) {
                (0, poly_fills_1.sortBy)(mapped, ([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
            }
            else {
                (0, poly_fills_1.sortBy)(mapped, ([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
            }
            _vec(mapped.map(([v]) => v));
            return [];
        }
        case "range": {
            const [a, b, s] = args.map(num);
            const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
            const [x, y] = (0, poly_fills_1.len)(args) > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
            const step = (0, poly_fills_1.sign)((y - x) * (s || 1)) * (s || 1);
            const count = (0, poly_fills_1.ceil)((0, poly_fills_1.abs)((y - x) / step));
            if (!count) {
                _vec([]);
                return [];
            }
            if (count > ctx.rangeBudget) {
                return [{ e: "Budget", m: "range budget depleted", errCtx }];
            }
            ctx.rangeBudget -= count;
            const nums = (0, poly_fills_1.range)(count).map(n => n * step + x);
            _vec(nums.map(v => ({ t: "num", v })));
            return [];
        }
        case "empty?":
            _boo(!(0, poly_fills_1.len)(asArray(args[0])));
            return [];
        case "keys":
        case "vals":
            _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
            return [];
        case "starts-with?":
            _boo((0, poly_fills_1.starts)(str(args[0]), str(args[1])));
            return [];
        case "ends-with?":
            _boo((0, poly_fills_1.ends)(str(args[0]), str(args[1])));
            return [];
        case "split":
            _vec(str(args[0])
                .split((0, poly_fills_1.len)(args) > 1 ? str(args[1]) : " ")
                .map(v => ({ t: "str", v })));
            return [];
        case "join":
            _str(vec(args[0])
                .map(val2str)
                .join((0, poly_fills_1.len)(args) > 1 ? str(args[1]) : " "));
            return [];
        case "time":
            _num((0, poly_fills_1.getTimeMs)());
            return [];
        case "version":
            _num(exports.insituxVersion);
            return [];
        case "tests":
            {
                const tests = await (0, test_1.doTests)(invoke, !((0, poly_fills_1.len)(args) && asBoo(args[0])));
                const summary = tests.pop();
                for (const test of tests) {
                    await exeOp("print", [{ v: test, t: "str" }], ctx, errCtx);
                }
                _str(summary);
            }
            return [];
        case "eval": {
            delete ctx.env.funcs["entry"];
            const sLen = (0, poly_fills_1.len)(stack);
            const errors = await parseAndExe(ctx, str(args[0]), errCtx.invocationId);
            if ((0, poly_fills_1.len)(errors)) {
                return [{ e: "Eval", m: "error within evaluated code", errCtx }];
            }
            if (sLen === (0, poly_fills_1.len)(stack)) {
                _nul();
            }
            return [];
        }
    }
    return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}
function getExe(ctx, op, errCtx) {
    const monoArityError = [{ e: "Arity", m: `one argument required`, errCtx }];
    if ((0, exports.visStr)(op) || (0, exports.visFun)(op)) {
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
        if (str in ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1]) {
            return getExe(ctx, ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1][str], errCtx);
        }
        if ((0, poly_fills_1.starts)(str, "$")) {
            return async (params) => {
                if (!(0, poly_fills_1.len)(params)) {
                    return monoArityError;
                }
                const err = await ctx.set((0, poly_fills_1.substr)(str, 1), params[0]);
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
    else if ((0, exports.visKey)(op)) {
        return async (params) => {
            if (!(0, poly_fills_1.len)(params)) {
                return monoArityError;
            }
            if (params[0].t !== "dict") {
                return [typeErr(`argument 1 must be dictionary`, errCtx)];
            }
            stack.push(dictGet(dic(params[0]), op));
            return [];
        };
    }
    else if ((0, exports.visNum)(op)) {
        const n = op.v;
        return async (params) => {
            if (!(0, poly_fills_1.len)(params)) {
                return monoArityError;
            }
            const a = params[0];
            if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
                return [
                    typeErr("argument must be string, vector, or dictionary", errCtx),
                ];
            }
            const arr = asArray(a);
            if ((0, poly_fills_1.abs)(n) >= (0, poly_fills_1.len)(arr)) {
                _nul();
            }
            else if (n < 0) {
                stack.push(arr[(0, poly_fills_1.len)(arr) + n]);
            }
            else {
                stack.push(arr[n]);
            }
            return [];
        };
    }
    else if ((0, exports.visVec)(op)) {
        const { v } = op;
        return async (params) => {
            if (!(0, poly_fills_1.len)(params)) {
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
    else if ((0, exports.visDic)(op)) {
        const dict = op.v;
        return async (params) => {
            if ((0, poly_fills_1.len)(params) === 1) {
                stack.push(dictGet(dict, params[0]));
            }
            else if ((0, poly_fills_1.len)(params) === 2) {
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
    for (let i = 0, lim = (0, poly_fills_1.len)(func.ins); i < lim; ++i) {
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
                ctx.env.vars[value] = stack[(0, poly_fills_1.len)(stack) - 1];
                break;
            case "let":
                ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1][value] =
                    stack[(0, poly_fills_1.len)(stack) - 1];
                break;
            case "par":
                {
                    const paramIdx = value;
                    if (paramIdx === -1) {
                        _vec(args);
                    }
                    else if ((0, poly_fills_1.len)(args) <= paramIdx) {
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
                    else if ((0, poly_fills_1.starts)(name, "$")) {
                        const { value, err } = await ctx.get((0, poly_fills_1.substr)(name, 1));
                        if (err) {
                            return [{ e: "External", m: err, errCtx }];
                        }
                        stack.push(value);
                    }
                    else if (name in ctx.env.vars) {
                        stack.push(ctx.env.vars[name]);
                    }
                    else if (name in ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1]) {
                        stack.push(ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1][name]);
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
                    const params = (0, poly_fills_1.splice)(stack, (0, poly_fills_1.len)(stack) - nArgs, nArgs);
                    if ((0, poly_fills_1.len)(params) !== nArgs) {
                        return [{ e: "Unexpected", m: `${op} stack depleted`, errCtx }];
                    }
                    //Tail-call optimisation
                    if (i === lim - 1 && (0, exports.visStr)(op) && op.v === func.name) {
                        ctx.env.lets[(0, poly_fills_1.len)(ctx.env.lets) - 1] = {};
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
                    if ((0, poly_fills_1.len)(errors)) {
                        return errors;
                    }
                }
                break;
            case "or":
                if (asBoo(stack[(0, poly_fills_1.len)(stack) - 1])) {
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
                (0, poly_fills_1.splice)(stack, (0, poly_fills_1.len)(stack) - value, value);
                break;
        }
    }
    ctx.env.lets.pop();
    return [];
}
exports.exeFunc = exeFunc;
async function parseAndExe(ctx, code, invocationId) {
    const parsed = (0, parse_1.parse)(code, invocationId);
    if ((0, poly_fills_1.len)(parsed.errors)) {
        return parsed.errors;
    }
    ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
    if (!("entry" in ctx.env.funcs)) {
        return [];
    }
    return await exeFunc(ctx, ctx.env.funcs["entry"], []);
}
async function invoke(ctx, code, invocationId, printResult = false) {
    const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
    const errors = await parseAndExe(ctx, code, invocationId);
    ctx.env.lets = [];
    ctx.callBudget = callBudget;
    ctx.recurBudget = recurBudget;
    ctx.loopBudget = loopBudget;
    ctx.rangeBudget = rangeBudget;
    delete ctx.env.funcs["entry"];
    if (!(0, poly_fills_1.len)(errors) && printResult && (0, poly_fills_1.len)(stack)) {
        await ctx.exe("print", [{ t: "str", v: val2str(stack[(0, poly_fills_1.len)(stack) - 1]) }]);
    }
    stack = [];
    return errors;
}
exports.invoke = invoke;
function symbols(ctx) {
    let syms = ["function"];
    syms = (0, poly_fills_1.concat)(syms, (0, poly_fills_1.objKeys)(types_1.ops).filter(o => o !== "execute-last"));
    syms = (0, poly_fills_1.concat)(syms, (0, poly_fills_1.objKeys)(ctx.env.funcs));
    syms = (0, poly_fills_1.concat)(syms, (0, poly_fills_1.objKeys)(ctx.env.vars));
    return syms;
}
exports.symbols = symbols;


/***/ }),

/***/ 669:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.invoker = exports.parensRx = void 0;
const _1 = __webpack_require__(607);
const poly_fills_1 = __webpack_require__(17);
const invocations = new Map();
exports.parensRx = /[\[\]\(\) ]/;
async function invoker(ctx, code) {
    const uuid = (0, poly_fills_1.getTimeMs)().toString();
    invocations.set(uuid, code);
    const errors = await (0, _1.invoke)(ctx, code, uuid, true);
    let out = [];
    errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
        const lineText = invocations.get(invocationId).split("\n")[line - 1];
        const sym = (0, poly_fills_1.substr)(lineText, col - 1).split(exports.parensRx)[0];
        const half1 = (0, poly_fills_1.trimStart)((0, poly_fills_1.substr)(lineText, 0, col - 1));
        out.push({ type: "message", text: (0, poly_fills_1.padEnd)(`${line}`, 4) + half1 });
        if (!sym) {
            const half2 = (0, poly_fills_1.substr)(lineText, col);
            out.push({ type: "error", text: lineText[col - 1] });
            out.push({ type: "message", text: `${half2}\n` });
        }
        else {
            const half2 = (0, poly_fills_1.substr)(lineText, col - 1 + sym.length);
            out.push({ type: "error", text: sym });
            out.push({ type: "message", text: `${half2}\n` });
        }
        out.push({ type: "message", text: `${e} Error: ${m}.\n` });
    });
    return out;
}
exports.invoker = invoker;


/***/ }),

/***/ 306:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parse = void 0;
const poly_fills_1 = __webpack_require__(17);
const types_1 = __webpack_require__(699);
function tokenise(code, invocationId) {
    const tokens = [];
    const digits = "0123456789";
    let inString = false, isEscaped = false, inStringAt = [0, 0], inSymbol = false, inNumber = false, inComment = false, line = 1, col = 0;
    for (let i = 0, l = (0, poly_fills_1.slen)(code); i < l; ++i) {
        const c = (0, poly_fills_1.strIdx)(code, i), nextCh = i + 1 !== l ? (0, poly_fills_1.strIdx)(code, i + 1) : "";
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
                tokens[(0, poly_fills_1.len)(tokens) - 1].text += { n: "\n", t: "\t" }[c] || `\\${c}`;
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
        const isWhite = (0, poly_fills_1.sub)(" \t\n\r", c);
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
        const isDigit = (ch) => (0, poly_fills_1.sub)(digits, ch);
        const isParen = (0, poly_fills_1.sub)("()[]{}", c);
        //Allow one . per number, or convert into symbol
        if (inNumber && !isDigit(c)) {
            inNumber = c === "." && !(0, poly_fills_1.sub)(tokens[(0, poly_fills_1.len)(tokens) - 1].text, ".");
            if (!inNumber && !isParen && !isWhite) {
                inSymbol = true;
                tokens[(0, poly_fills_1.len)(tokens) - 1].typ = "sym";
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
            if ((0, poly_fills_1.len)(tokens)) {
                const { typ: t, text } = tokens[(0, poly_fills_1.len)(tokens) - 1];
                if (t === "sym" && (text === "var" || text === "let")) {
                    typ = "ref";
                }
            }
            tokens.push({ typ, text: "", errCtx });
        }
        tokens[(0, poly_fills_1.len)(tokens) - 1].text += c;
    }
    return { tokens, stringError: inString ? inStringAt : undefined };
}
function segment(tokens) {
    const segments = [[]];
    let depth = 0;
    tokens.forEach(token => {
        segments[(0, poly_fills_1.len)(segments) - 1].push(token);
        depth += (0, poly_fills_1.toNum)(token.typ === "(") - (0, poly_fills_1.toNum)(token.typ === ")");
        if (depth === 0) {
            segments.push([]);
        }
    });
    return segments;
}
function funcise(segments) {
    const isFunc = (segment) => (0, poly_fills_1.len)(segment) > 1 &&
        segment[1].typ === "sym" &&
        segment[1].text === "function";
    const funcs = segments.filter(t => isFunc(t));
    const entries = (0, poly_fills_1.flat)(segments.filter(t => !isFunc(t)));
    const described = funcs.map(tokens => ({
        name: tokens[2].text,
        tokens: (0, poly_fills_1.slice)(tokens, 3),
        errCtx: tokens[2].errCtx,
    }));
    return (0, poly_fills_1.len)(entries)
        ? (0, poly_fills_1.concat)(described, [
            {
                name: "entry",
                tokens: entries,
                errCtx: entries[0].errCtx,
            },
        ])
        : described;
}
function parseArg(tokens, params) {
    if (!(0, poly_fills_1.len)(tokens)) {
        return [];
    }
    const { typ, text, errCtx } = tokens.shift();
    switch (typ) {
        case "str":
            return [{ typ: "str", value: text, errCtx }];
        case "num":
            return [{ typ: "num", value: (0, poly_fills_1.toNum)(text), errCtx }];
        case "sym":
            if (text === "true" || text === "false") {
                return [{ typ: "boo", value: text === "true", errCtx }];
            }
            else if (text === "null") {
                return [{ typ: "nul", value: undefined, errCtx }];
            }
            else if ((0, poly_fills_1.starts)(text, ":")) {
                return [{ typ: "key", value: text, errCtx }];
            }
            else if ((0, poly_fills_1.starts)(text, "#") && (0, poly_fills_1.isNum)((0, poly_fills_1.substr)(text, 1))) {
                const value = (0, poly_fills_1.toNum)((0, poly_fills_1.substr)(text, 1));
                if (value < 0) {
                    return [{ typ: "nul", errCtx }];
                }
                return [{ typ: "par", value, errCtx }];
            }
            else if ((0, poly_fills_1.has)(params, text)) {
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
                if (!(0, poly_fills_1.len)(def) || !(0, poly_fills_1.len)(val) || (0, poly_fills_1.len)(parseArg(tokens, params))) {
                    return err("must provide reference name and value only");
                }
                return [...val, { typ: op, value: def[0].value, errCtx }];
            }
            else if (op === "if" || op === "when") {
                const cond = parseArg(tokens, params);
                if (!(0, poly_fills_1.len)(cond)) {
                    return err("must provide condition");
                }
                const ins = cond;
                if (op === "if") {
                    const ifT = parseArg(tokens, params);
                    if (!(0, poly_fills_1.len)(ifT)) {
                        return err("must provide a branch");
                    }
                    ins.push({ typ: "if", value: (0, poly_fills_1.len)(ifT) + 1, errCtx });
                    (0, poly_fills_1.push)(ins, ifT);
                    const ifF = parseArg(tokens, params);
                    if ((0, poly_fills_1.len)(ifF)) {
                        ins.push({ typ: "jmp", value: (0, poly_fills_1.len)(ifF), errCtx });
                        (0, poly_fills_1.push)(ins, ifF);
                        if ((0, poly_fills_1.len)(parseArg(tokens, params))) {
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
                        if (!(0, poly_fills_1.len)(exp)) {
                            break;
                        }
                        (0, poly_fills_1.push)(body, exp);
                    }
                    ins.push({ typ: "if", value: (0, poly_fills_1.len)(body) + 1, errCtx });
                    (0, poly_fills_1.push)(ins, body);
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
                    if (!(0, poly_fills_1.len)(arg)) {
                        break;
                    }
                    args.push(arg);
                    insCount += (0, poly_fills_1.len)(arg);
                }
                if ((0, poly_fills_1.len)(args) < 2) {
                    return err("requires at least two arguments");
                }
                const ins = [];
                if (op === "while") {
                    insCount += 2; //+1 for the if ins, +1 for the pop ins
                    const head = args.shift();
                    (0, poly_fills_1.push)(ins, head);
                    ins.push({ typ: "if", value: insCount - (0, poly_fills_1.len)(head), errCtx });
                    args.forEach(as => (0, poly_fills_1.push)(ins, as));
                    ins.push({ typ: "pop", value: (0, poly_fills_1.len)(args), errCtx });
                    ins.push({ typ: "loo", value: -(insCount + 1), errCtx });
                    return ins;
                }
                insCount += (0, poly_fills_1.len)(args); //+1 for each if/or ins
                insCount += (0, poly_fills_1.toNum)(op === "and");
                const typ = op === "and" ? "if" : "or";
                for (let a = 0; a < (0, poly_fills_1.len)(args); ++a) {
                    (0, poly_fills_1.push)(ins, args[a]);
                    insCount -= (0, poly_fills_1.len)(args[a]);
                    ins.push({ typ, value: insCount, errCtx });
                    --insCount;
                }
                if (op === "and") {
                    (0, poly_fills_1.push)(ins, [
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
            if (typ === "(" || (0, poly_fills_1.has)(params, text) || (0, poly_fills_1.starts)(text, "#")) {
                tokens.unshift(head);
                const ins = parseArg(tokens, params);
                (0, poly_fills_1.push)(headIns, ins);
                op = "execute-last";
                ++args;
            }
            const body = [];
            while ((0, poly_fills_1.len)(tokens)) {
                const parsed = parseArg(tokens, params);
                if (!(0, poly_fills_1.len)(parsed)) {
                    break;
                }
                ++args;
                (0, poly_fills_1.push)(body, parsed);
            }
            headIns.push({
                typ: types_1.ops[op] ? "op" : "exe",
                value: [
                    typ === "num"
                        ? { t: "num", v: (0, poly_fills_1.toNum)(op) }
                        : (0, poly_fills_1.starts)(op, ":")
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
    for (let i = 0, isB = false; i < (0, poly_fills_1.len)(array); ++i) {
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
    if (!(0, poly_fills_1.len)(params) && !(0, poly_fills_1.len)(body)) {
        return {
            err: {
                e: "Parse",
                m: "empty function body",
                errCtx,
            },
        };
    }
    if ((0, poly_fills_1.len)(body) && body[0].typ === ")") {
        if ((0, poly_fills_1.len)(params)) {
            //In the case of e.g. (function f #) or (function x y z)
            body.unshift(params.pop());
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
    if ((0, poly_fills_1.len)(params) && !(0, poly_fills_1.len)(body)) {
        body.push(params.pop());
    }
    const ins = [];
    while ((0, poly_fills_1.len)(body)) {
        (0, poly_fills_1.push)(ins, parseArg(body, params.map(p => p.text)));
    }
    const parseErrors = ins.filter(i => i.typ === "err");
    if ((0, poly_fills_1.len)(parseErrors)) {
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
    for (let lim = (0, poly_fills_1.len)(tokens), t = untimely ? 0 : lim - 1, depth = 0; untimely ? t < lim : t >= 0; t += direction) {
        const { typ, errCtx: { line, col }, } = tokens[t];
        depth += (0, poly_fills_1.toNum)(typ === l) - (0, poly_fills_1.toNum)(typ === r);
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
    const countTyp = (t) => (0, poly_fills_1.len)(tokens.filter(({ typ }) => typ === t));
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
    for (let t = 0, lastWasL = false; t < (0, poly_fills_1.len)(tokens); ++t) {
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
    if ((0, poly_fills_1.len)(errors)) {
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
    (0, poly_fills_1.push)(errors, synErrors.map(fae => fae.err));
    const funcs = {};
    funcArr.forEach(({ func }) => (funcs[func.name] = func));
    return { errors, funcs };
}
exports.parse = parse;


/***/ }),

/***/ 17:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pi = exports.sign = exports.ceil = exports.floor = exports.round = exports.sqrt = exports.tan = exports.cos = exports.sin = exports.max = exports.min = exports.abs = exports.getTimeMs = exports.objKeys = exports.range = exports.randInt = exports.randNum = exports.padEnd = exports.trimStart = exports.trim = exports.reverse = exports.sortBy = exports.push = exports.concat = exports.flat = exports.ends = exports.starts = exports.has = exports.subIdx = exports.sub = exports.strIdx = exports.substr = exports.isArray = exports.isNum = exports.slen = exports.len = exports.splice = exports.slice = exports.toNum = void 0;
const toNum = (x) => Number(x);
exports.toNum = toNum;
const slice = (arr, start, end) => arr.slice(start, end);
exports.slice = slice;
const splice = (arr, start, numDel) => arr.splice(start, numDel);
exports.splice = splice;
const len = (arr) => arr.length;
exports.len = len;
const slen = (str) => str.length;
exports.slen = slen;
const isNum = (x) => !Number.isNaN(Number(x));
exports.isNum = isNum;
const isArray = (x) => Array.isArray(x);
exports.isArray = isArray;
const substr = (str, start, length) => str.substring(start, length ? start + length : str.length);
exports.substr = substr;
const strIdx = (str, idx) => str[idx];
exports.strIdx = strIdx;
const sub = (x, s) => x.includes(s);
exports.sub = sub;
const subIdx = (x, s) => x.indexOf(s);
exports.subIdx = subIdx;
const has = (x, y) => x.includes(y);
exports.has = has;
const starts = (str, x) => str.startsWith(x);
exports.starts = starts;
const ends = (str, x) => str.endsWith(x);
exports.ends = ends;
const flat = (arr) => arr.flat(); //e.g. [[0], [1], []] => [0, 1]
exports.flat = flat;
const concat = (a, b) => a.concat(b);
exports.concat = concat;
const push = (arr, add) => arr.push(...add);
exports.push = push;
const sortBy = (arr, by) => arr.sort(by);
exports.sortBy = sortBy;
const reverse = (arr) => arr.reverse();
exports.reverse = reverse;
const trim = (str) => str.trim();
exports.trim = trim;
const trimStart = (str) => str.trimStart();
exports.trimStart = trimStart;
const padEnd = (str, by) => str.padEnd(by);
exports.padEnd = padEnd;
const randNum = (a, b) => a + Math.random() * (b - a);
exports.randNum = randNum;
const randInt = (a, b) => Math.floor((0, exports.randNum)(a, b));
exports.randInt = randInt;
const range = (len) => [...Array(len).keys()];
exports.range = range;
const objKeys = (x) => Object.keys(x);
exports.objKeys = objKeys;
const getTimeMs = () => new Date().getTime();
exports.getTimeMs = getTimeMs;
exports.abs = Math.abs;
exports.min = Math.min;
exports.max = Math.max;
exports.sin = Math.sin;
exports.cos = Math.cos;
exports.tan = Math.tan;
exports.sqrt = Math.sqrt;
exports.round = Math.round;
exports.floor = Math.floor;
exports.ceil = Math.ceil;
exports.sign = Math.sign;
exports.pi = Math.PI;


/***/ }),

/***/ 127:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.doTests = void 0;
const poly_fills_1 = __webpack_require__(17);
async function get(state, key) {
    if (!state.dict.has(key)) {
        return { value: { t: "null", v: undefined }, err: `"${key} not found.` };
    }
    return { value: state.dict.get(key), err: undefined };
}
async function set(state, key, val) {
    state.dict.set(key, val);
    return undefined;
}
async function exe(state, name, args) {
    const nullVal = { t: "null", v: undefined };
    switch (name) {
        case "print-str":
            state.output += args[0].v;
            break;
        case "print":
        case "test.function":
            state.output += args[0].v + "\n";
            break;
        default:
            return { value: nullVal, err: "operation does not exist" };
    }
    return { value: nullVal, err: undefined };
}
const tests = [
    //Basic snippets
    { name: "Hello, world!", code: `"Hello, world!"`, out: `Hello, world!` },
    {
        name: "Say Hello, world!",
        code: `(print "Hello, world!")`,
        out: `Hello, world!\nnull`,
    },
    { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
    { name: "Negate 1 = -1", code: `(- 1)`, out: `-1` },
    { name: "(1+1)+1+(1+1) = 5", code: `(+ (+ 1 1) 1 (+ 1 1))`, out: `5` },
    { name: "Conditional head", code: `((if true + -) 12 9 1)`, out: `22` },
    {
        name: "Whens",
        code: `[(when 123 (print "hi") 234) (when false (print "bye"))]`,
        out: `hi\n[234 null]`,
    },
    { name: "Cond number head", code: `((if false 1 2) [:a :b :c])`, out: `:c` },
    {
        name: "and & short-circuit",
        code: `[(and true (if true null 1) true) (and 1 2 3)]`,
        out: `[false true]`,
    },
    {
        name: "or & short-circuit",
        code: `[(or true (print "hello") 1) (or false (print-str "-> ") 1)]`,
        out: `-> [true 1]`,
    },
    { name: "String retrieve", code: `(2 "Hello")`, out: `l` },
    { name: "Vector retrieve", code: `(2 [:a :b :c :d])`, out: `:c` },
    {
        name: "Key as operation",
        code: `(:age {:name "Patrick" :age 24})`,
        out: `24`,
    },
    {
        name: "Dictionary as op 1",
        code: `({"name" "Patrick" "age" 24} "age")`,
        out: `24`,
    },
    {
        name: "Dictionary as op 2",
        code: `({"name" "Patrick"} "age" 24)`,
        out: `{name Patrick, age 24}`,
    },
    {
        name: "Equalities",
        code: `[(= 1 2 1)
            (!= 1 2 1)
            (= "Hello" "hello")
            (!= "world" "world")
            (= [0 [1]] [0 [1]])]`,
        out: `[false true false false true]`,
    },
    { name: "Define and retrieve", code: `(var a 1) a`, out: `1` },
    { name: "Define and add", code: `(var a 1) (inc a)`, out: `2` },
    { name: "Define op and call", code: `(var f +) (f 2 2)`, out: `4` },
    { name: "Define vec and call", code: `(var f [1]) (f 1)`, out: `1` },
    {
        name: "Define num op and call",
        code: `(var f 1) (f [:a :b :c])`,
        out: `:b`,
    },
    { name: "Print simple vector", code: `[1 2 3]`, out: `[1 2 3]` },
    {
        name: "Sum vector of numbers",
        code: `[(reduce + [1 2 3]) (reduce + [1 2 3] 3)]`,
        out: `[6 9]`,
    },
    {
        name: "Sum vectors of numbers",
        code: `(map + [1 2 3] [1 2 3 4])`,
        out: `[2 4 6]`,
    },
    {
        name: "Filter by integer",
        code: `(filter 2 [[1] [:a :b :c] "hello" "hi"])`,
        out: `[[:a :b :c] hello]`,
    },
    {
        name: "Comments, short decimal",
        code: `;((print "Hello")
           .456`,
        out: `0.456`,
    },
    {
        name: "Dictionary into vector",
        code: `(into [1 2] {3 4 5 6})`,
        out: `[1 2 [3 4] [5 6]]`,
    },
    {
        name: "Vector into dictionary",
        code: `(into {[0] 1 [2] 3} [[0] 2])`,
        out: `{[0] 2, [2] 3}`,
    },
    {
        name: "While loop",
        code: `(var n 5)
           (while (< 0 n)
             (print-str n)
             (var n (dec n)))`,
        out: `543215`,
    },
    //Basic functions
    { name: "Define with no call", code: `(function func (print "Nothing."))` },
    {
        name: "Call greet func",
        code: `(function greeting (print "Hello!")) (greeting)`,
        out: `Hello!\nnull`,
    },
    {
        name: "Call const value func",
        code: `(function const 123) (const)`,
        out: `123`,
    },
    {
        name: "Call identity funcs",
        code: `(function id1 #)
           (function id2 x x)
           [(id1 123) (id2 456)]`,
        out: `[123 456]`,
    },
    {
        name: "Call greet with name",
        code: `(function greeting name (print "Hello, " name "!"))
           (greeting "Patrick")`,
        out: `Hello, Patrick!\nnull`,
    },
    {
        name: "Call with too few args",
        code: `(function func a b c [a b c]) (func 1 2)`,
        out: `[1 2 null]`,
    },
    {
        name: "Define func and call",
        code: `(function func a b (+ a b)) (var f func) (f 2 2)`,
        out: `4`,
    },
    {
        name: "Anonymous parameters",
        code: `(function avg<n? (< (/ (.. + #) (len #)) #1))
           (avg<n? [0 10 20 30 40] 5)`,
        out: `false`,
    },
    {
        name: "Call parameter",
        code: `(function f x (x "hello")) (f print)`,
        out: `hello\nnull`,
    },
    { name: "Let and retrieve", code: `(function f (let a 1) a) (f)`, out: `1` },
    {
        name: "Let num op and call",
        code: `(function f (let n 0) (n [0])) (f)`,
        out: `0`,
    },
    //Runtime errors
    {
        name: "String instead of number",
        code: `(function sum (.. + args))
           (print (sum 2 2))
           (sum 2 "hi")`,
        out: `4`,
        err: ["Type"],
    },
    { name: "Reference non-existing", code: `x`, err: ["Reference"] },
    {
        name: "Expired let retrieve",
        code: `(function f (let a 1) a) (f) a`,
        err: ["Reference"],
    },
    { name: "Call non-existing", code: `(x)`, err: ["External"] },
    { name: "Call budget", code: `(function f (f)) (f)`, err: ["Budget"] },
    {
        name: "Loop budget",
        code: `(var n 10000)
           (while (< 0 n)
             (var n (dec n)))`,
        err: ["Budget"],
    },
    { name: "Range budget", code: `(range 10000)`, err: ["Budget"] },
    //Complex functions
    {
        name: "Fibonacci 13",
        code: `(function fib n
             (if (< n 2) n
               (+ (fib (dec n))
                  (fib (- n 2)))))
           (fib 13)`,
        out: `233`,
    },
    {
        name: "dedupe (tail-call optim)",
        code: `(function dedupe list -out
             (let out (or -out []))
             (let next (if (out (0 list)) [] [(0 list)]))
             (if (empty? list) out
                 (dedupe (sect list) (into out next))))
           (dedupe [1 1 2 3 3 3])`,
        out: `[1 2 3]`,
    },
    //Test environment functions
    {
        name: "set get",
        code: `[($globals.time_offset 5.5) $globals.time_offset]`,
        out: `[5.5 5.5]`,
    },
    { name: "exe", code: `(test.function 123)`, out: `123\nnull` },
    //Syntax errors
    { name: "Empty parens", code: `()`, err: ["Parse"] },
    { name: "Imbalanced parens 1", code: `(print ("hello!")`, err: ["Parse"] },
    { name: "Imbalanced parens 2", code: `print "hello!")`, err: ["Parse"] },
    {
        name: "Imbalanced quotes 1",
        code: `(print "Hello)`,
        err: ["Parse", "Parse"],
    },
    { name: "Imbalanced quotes 2", code: `print "Hello")`, err: ["Parse"] },
    { name: "Function as op", code: `(function)`, err: ["Parse"] },
    { name: "Function without body", code: `(function func)`, err: ["Parse"] },
];
async function doTests(invoke, terse = true) {
    const results = [];
    for (let t = 0; t < (0, poly_fills_1.len)(tests); ++t) {
        const { name, code, err, out } = tests[t];
        const state = {
            dict: new Map(),
            output: "",
        };
        const env = { funcs: {}, vars: {}, lets: [] };
        const startTime = (0, poly_fills_1.getTimeMs)();
        const errors = await invoke({
            get: (key) => get(state, key),
            set: (key, val) => set(state, key, val),
            exe: (name, args) => exe(state, name, args),
            env,
            loopBudget: 10000,
            rangeBudget: 1000,
            callBudget: 1000,
            recurBudget: 10000,
        }, code, "testing", true);
        const okErr = (err || []).join() === errors.map(({ e }) => e).join();
        const okOut = !out || (0, poly_fills_1.trim)(state.output) === out;
        const elapsedMs = (0, poly_fills_1.getTimeMs)() - startTime;
        const [testNum, testName, testElapsed, testErrors] = [
            (0, poly_fills_1.padEnd)(`${t + 1}`, 3),
            (0, poly_fills_1.padEnd)(name, 24),
            (0, poly_fills_1.padEnd)(`${elapsedMs}ms`, 6),
            okErr ||
                errors.map(({ e, m, errCtx: { line, col } }) => `${e} ${line}:${col}: ${m}`),
        ];
        results.push({
            okErr,
            okOut,
            elapsedMs,
            display: `${testNum} ${testName} ${testElapsed} ${okOut} ${testErrors}`,
        });
    }
    const totalMs = results.reduce((sum, { elapsedMs }) => sum + elapsedMs, 0);
    const numPassed = (0, poly_fills_1.len)(results.filter(({ okOut, okErr }) => okOut && okErr));
    return (0, poly_fills_1.concat)(results.filter(r => !terse || !r.okOut || !r.okErr).map(r => r.display), [`----- ${numPassed}/${(0, poly_fills_1.len)(results)} tests passed in ${totalMs}ms.`]);
}
exports.doTests = doTests;


/***/ }),

/***/ 699:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.typeNames = exports.ops = void 0;
exports.ops = {
    print: {},
    "print-str": {},
    "execute-last": {},
    "!": { exactArity: 1 },
    "=": { minArity: 2 },
    "!=": { minArity: 2 },
    "+": { minArity: 2, onlyNum: true },
    "-": { minArity: 1, onlyNum: true },
    "*": { minArity: 2, onlyNum: true },
    "/": { minArity: 2, onlyNum: true },
    "//": { minArity: 2, onlyNum: true },
    "**": { minArity: 1, onlyNum: true },
    "<": { minArity: 2, onlyNum: true },
    ">": { minArity: 2, onlyNum: true },
    "<=": { minArity: 2, onlyNum: true },
    ">=": { minArity: 2, onlyNum: true },
    inc: { exactArity: 1, onlyNum: true },
    dec: { exactArity: 1, onlyNum: true },
    min: { minArity: 2, onlyNum: true },
    max: { minArity: 2, onlyNum: true },
    abs: { exactArity: 1, onlyNum: true },
    sqrt: { exactArity: 1, onlyNum: true },
    round: { exactArity: 1, onlyNum: true },
    floor: { exactArity: 1, onlyNum: true },
    ceil: { exactArity: 1, onlyNum: true },
    "odd?": { exactArity: 1, onlyNum: true },
    "even?": { exactArity: 1, onlyNum: true },
    "pos?": { exactArity: 1, onlyNum: true },
    "neg?": { exactArity: 1, onlyNum: true },
    "zero?": { exactArity: 1, onlyNum: true },
    "null?": { exactArity: 1 },
    "num?": { exactArity: 1 },
    "bool?": { exactArity: 1 },
    "str?": { exactArity: 1 },
    "vec?": { exactArity: 1 },
    "dict?": { exactArity: 1 },
    "key?": { exactArity: 1 },
    "func?": { exactArity: 1 },
    rem: { minArity: 2, onlyNum: true },
    sin: { exactArity: 1, onlyNum: true },
    cos: { exactArity: 1, onlyNum: true },
    tan: { exactArity: 1, onlyNum: true },
    vec: {},
    dict: {},
    len: { exactArity: 1, types: [["str", "vec", "dict"]] },
    num: { exactArity: 1, types: [["str", "num"]] },
    "has?": { exactArity: 2, types: ["str", "str"] },
    idx: { exactArity: 2, types: [["str", "vec"]] },
    map: { minArity: 2 },
    for: { minArity: 2 },
    reduce: { minArity: 2, maxArity: 3 },
    filter: { exactArity: 2 },
    str: {},
    "rand-num": { maxArity: 2, onlyNum: true },
    "rand-int": { maxArity: 2, onlyNum: true },
    while: {},
    "..": { minArity: 2 },
    into: {
        exactArity: 2,
        types: [
            ["vec", "dict"],
            ["vec", "dict"],
        ],
    },
    push: { minArity: 2, maxArity: 3, types: [["vec", "dict"]] },
    sect: { minArity: 1, maxArity: 3, types: [["vec", "str"], "num", "num"] },
    reverse: { exactArity: 1, types: [["vec", "str"]] },
    sort: { minArity: 1, maxArity: 2, types: ["vec"] },
    keys: { exactArity: 1, types: ["dict"] },
    vals: { exactArity: 1, types: ["dict"] },
    do: { minArity: 1 },
    val: { minArity: 1 },
    range: { minArity: 1, maxArity: 3, types: ["num", "num", "num"] },
    "empty?": { exactArity: 1, types: [["str", "vec", "dict"]] },
    "starts-with?": { exactArity: 2, types: ["str", "str"] },
    "ends-with?": { exactArity: 2, types: ["str", "str"] },
    split: { minArity: 1, maxArity: 2, types: ["str", "str"] },
    join: { minArity: 1, maxArity: 2, types: ["vec", "str"] },
    time: { exactArity: 0 },
    version: { exactArity: 0 },
    tests: { minArity: 0, maxArity: 1, types: ["bool"] },
    eval: { exactArity: 1, types: ["str"] },
};
exports.typeNames = {
    null: "null",
    str: "string",
    num: "number",
    bool: "boolean",
    key: "keyword",
    ref: "reference",
    vec: "vector",
    dict: "dictionary",
    func: "function",
};


/***/ }),

/***/ 147:
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const readline = __webpack_require__(521);
const fs = __webpack_require__(147);
const _1 = __webpack_require__(607);
const invoker_1 = __webpack_require__(669);
const env = new Map();
async function get(key) {
    return env.has(key)
        ? { value: env.get(key), err: undefined }
        : {
            value: { v: undefined, t: "null" },
            err: `key ${key} not found`,
        };
}
async function set(key, val) {
    env.set(key, val);
    return undefined;
}
const ctx = {
    env: { funcs: {}, vars: {}, lets: [] },
    get,
    set,
    exe,
    loopBudget: 10000,
    rangeBudget: 1000,
    callBudget: 100000000,
    recurBudget: 10000,
};
async function exe(name, args) {
    const nullVal = { v: undefined, t: "null" };
    switch (name) {
        case "print":
        case "print-str":
            process.stdout.write(`\x1b[32m${args[0].v}\x1b[0m`);
            if (name === "print") {
                process.stdout.write("\n");
            }
            break;
        case "read": {
            const path = args[0].v;
            if (!fs.existsSync(path)) {
                return { value: nullVal };
            }
            return {
                value: { t: "str", v: fs.readFileSync(path).toString() },
            };
        }
        default:
            if (args.length) {
                const a = args[0];
                if ((0, _1.visStr)(a) && a.v.startsWith("$")) {
                    if (args.length === 1) {
                        return await get(`${a.v.substring(1)}.${name}`);
                    }
                    else {
                        await set(`${a.v.substring(1)}.${name}`, args[1]);
                        return { value: args[1] };
                    }
                }
            }
            return { value: nullVal, err: `operation ${name} does not exist` };
    }
    return { value: nullVal };
}
function completer(line) {
    const input = line.split(invoker_1.parensRx).pop();
    const completions = (0, _1.symbols)(ctx);
    if (!input) {
        return [completions, ""];
    }
    const hits = completions.filter(c => c.startsWith(input));
    return [hits.length ? hits : completions, input];
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
    completer,
    history: fs.existsSync(".repl-history")
        ? fs.readFileSync(".repl-history").toString().split("\n").reverse()
        : [],
});
rl.on("line", async (line) => {
    if (line === "quit") {
        rl.close();
        return;
    }
    if (line.trim()) {
        fs.appendFileSync(".repl-history", `\n${line}`);
        printErrorOutput(await (0, invoker_1.invoker)(ctx, line));
    }
    rl.prompt();
});
rl.prompt();
function printErrorOutput(lines) {
    const colours = { error: 31, message: 35 };
    lines.forEach(({ type, text }) => {
        process.stdout.write(`\x1b[${colours[type]}m${text}\x1b[0m`);
    });
}

})();

/******/ })()
;
//# sourceMappingURL=repl.js.map