export const insituxVersion = 220223;
import { asBoo } from "./checks";
import { arityCheck, keyOpErr, numOpErr, typeCheck, typeErr } from "./checks";
import { makeEnclosure } from "./closure";
import { parse } from "./parse";
import * as pf from "./poly-fills";
const { abs, sign, sqrt, floor, ceil, round, max, min, logn, log2, log10 } = pf;
const { cos, sin, tan, acos, asin, atan, sinh, cosh, tanh } = pf;
const { concat, has, flat, push, reverse, slice, splice, sortBy } = pf;
const { ends, slen, starts, sub, subIdx, substr, upperCase, lowerCase } = pf;
const { trim, trimStart, trimEnd, charCode, codeChar, strIdx } = pf;
const { getTimeMs, randInt, randNum } = pf;
const { isNum, len, objKeys, range, toNum } = pf;
import { doTests } from "./test";
import { assertUnreachable, InvokeError, InvokeResult, syntaxes } from "./types";
import { ExternalFunction, ExternalHandler } from "./types";
import { Ctx, Dict, ErrCtx, Func, Ins, Val, ops, typeNames } from "./types";
import { asArray, isEqual, num, str, stringify, val2str, vec } from "./val";
import { dic, dictDrop, dictGet, dictSet, toDict, pathSet } from "./val";

const externalOps: { [name: string]: ExternalHandler } = {};
let stack: Val[] = [];
let letsStack: { [key: string]: Val }[] = [];
let lets: typeof letsStack[0] = {};
let recurArgs: undefined | Val[];
const _boo = (v: boolean) => stack.push({ t: "bool", v });
const _num = (v: number) => stack.push({ t: "num", v });
const _str = (v = "") => stack.push({ t: "str", v });
const _vec = (v: Val[] = []) => stack.push({ t: "vec", v });
const _dic = (v: Dict) => stack.push({ t: "dict", v });
const _nul = () => stack.push({ t: "null", v: undefined });
const _fun = (v: string) => stack.push({ t: "func", v });

function exeOp(
  op: string,
  args: Val[],
  ctx: Ctx,
  errCtx: ErrCtx,
): InvokeError[] | undefined {
  const tErr = (msg: string) => [typeErr(msg, errCtx)];

  switch (op) {
    case "str":
      stack.push({ t: "str", v: stringify(args) });
      return;
    case "print":
    case "print-str":
      ctx.print(stringify(args), op === "print");
      _nul();
      return;
    case "vec":
      _vec(args);
      return;
    case "dict":
      stack.push(toDict(args));
      return;
    case "len":
      _num(
        args[0].t === "str"
          ? slen(args[0].v)
          : args[0].t === "vec"
          ? len(args[0].v)
          : len(dic(args[0]).keys),
      );
      return;
    case "to-num":
      if (isNum(args[0].v)) {
        _num(toNum(args[0].v));
      } else {
        _nul();
      }
      return;
    case "to-key":
      stack.push({ t: "key", v: `:${val2str(args[0])}` });
      return;
    case "!":
      _boo(!asBoo(args[0]));
      return;
    case "=":
    case "!=":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
          _boo(false);
          return;
        }
      }
      _boo(true);
      return;
    case "-":
      _num(
        len(args) === 1
          ? -num(args[0])
          : args.map(num).reduce((sum, n) => sum - n),
      );
      return;
    case "**":
      _num(num(args[0]) ** (len(args) === 1 ? 2 : num(args[1])));
      return;
    case "+":
      _num(args.map(num).reduce((sum, n) => sum + n));
      return;
    case "*":
      _num(args.map(num).reduce((sum, n) => sum * n));
      return;
    case "/":
      _num(args.map(num).reduce((sum, n) => sum / n));
      return;
    case "//":
      _num(args.map(num).reduce((sum, n) => floor(sum / n)));
      return;
    case "fast=":
    case "fast!=":
      _boo(isEqual(args[0], args[1]) === (op === "fast="));
      return;
    case "fast-":
      _num(<number>args[0].v - <number>args[1].v);
      return;
    case "fast+":
      _num(<number>args[0].v + <number>args[1].v);
      return;
    case "fast*":
      _num(<number>args[0].v * <number>args[1].v);
      return;
    case "fast/":
      _num(<number>args[0].v / <number>args[1].v);
      return;
    case "fast//":
      _num(floor(<number>args[0].v / <number>args[1].v));
      return;
    case "fast<":
      _boo(<number>args[0].v < <number>args[1].v);
      return;
    case "fast>":
      _boo(<number>args[0].v > <number>args[1].v);
      return;
    case "fast<=":
      _boo(<number>args[0].v <= <number>args[1].v);
      return;
    case "fast>=":
      _boo(<number>args[0].v >= <number>args[1].v);
      return;
    case "rem":
      _num(args.map(num).reduce((sum, n) => sum % n));
      return;
    case "min":
      _num(args.map(num).reduce((sum, n) => min(sum, n)));
      return;
    case "max":
      _num(args.map(num).reduce((sum, n) => max(sum, n)));
      return;
    case "<":
    case ">":
    case "<=":
    case ">=":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        const [a, b] = [<number>args[i - 1].v, <number>args[i].v];
        if (
          (op === "<" && a >= b) ||
          (op === ">" && a <= b) ||
          (op === "<=" && a > b) ||
          (op === ">=" && a < b)
        ) {
          _boo(false);
          return;
        }
      }
      _boo(true);
      return;
    case "inc":
      _num(<number>args[0].v + 1);
      return;
    case "dec":
      _num(<number>args[0].v - 1);
      return;
    case "abs":
      _num(abs(<number>args[0].v));
      return;
    case "round":
      if (len(args) === 2) {
        const x = 10 ** <number>args[0].v;
        _num(round(<number>args[1].v * x) / x);
      } else {
        _num(round(<number>args[0].v));
      }
      return;
    case "sin":
    case "cos":
    case "tan":
    case "sqrt":
    case "floor":
    case "ceil":
    case "logn":
    case "log2":
    case "log10": {
      const f = { sin, cos, tan, sqrt, floor, ceil, logn, log2, log10 }[op];
      _num(f(num(args[0])));
      return;
    }
    case "asin":
    case "acos":
    case "atan":
    case "sinh":
    case "cosh":
    case "tanh": {
      const f = { asin, acos, atan, sinh, cosh, tanh }[op];
      _num(f(num(args[0])));
      return;
    }
    case "and":
      _boo(args.every(asBoo));
      return;
    case "or":
      _boo(args.some(asBoo));
      return;
    case "xor":
      if (asBoo(args[0]) !== asBoo(args[1])) {
        stack.push(asBoo(args[0]) ? args[0] : args[1]);
      } else {
        _boo(false);
      }
      return;
    case "&":
    case "|":
    case "^":
    case "<<":
    case ">>":
    case ">>>":
      const [a, b] = [num(args[0]), num(args[1])];
      _num(
        op === "&"
          ? a & b
          : op === "|"
          ? a | b
          : op === "^"
          ? a ^ b
          : op === "<<"
          ? a << b
          : op === ">>"
          ? a >> b
          : a >>> b,
      );
      return;
    case "~":
      _num(~num(args[0]));
      return;
    case "odd?":
    case "even?":
      _boo(num(args[0]) % 2 === (op === "odd?" ? 1 : 0));
      return;
    case "pos?":
    case "neg?":
    case "zero?": {
      const n = num(args[0]);
      _boo(op === "pos?" ? n > 0 : op === "neg?" ? n < 0 : !n);
      return;
    }
    case "null?":
    case "num?":
    case "bool?":
    case "str?":
    case "dict?":
    case "vec?":
    case "key?":
    case "func?":
    case "wild?":
    case "ext?": {
      const { t } = args[0];
      _boo(
        (op === "func?" && (t === "func" || t === "clo")) ||
          substr(op, 0, slen(op) - 1) === t,
      );
      return;
    }
    case "substr?":
      _boo(sub(str(args[1]), str(args[0])));
      return;
    case "idx": {
      let i = -1;
      if (args[0].t === "str") {
        if (args[1].t !== "str") {
          return tErr("strings can only contain strings");
        }
        i = subIdx(args[1].v, args[0].v);
      } else if (args[0].t === "vec") {
        i = args[0].v.findIndex(a => isEqual(a, args[1]));
      }
      if (i === -1) {
        _nul();
      } else {
        _num(i);
      }
      return;
    }
    case "set-at": {
      const [pathVal, replacement, coll] = args;
      stack.push(pathSet(vec(pathVal), replacement, coll));
      return;
    }
    case "map":
    case "for":
    case "reduce":
    case "filter":
    case "remove":
    case "find":
    case "count": {
      const closure = getExe(ctx, args.shift()!, errCtx);
      if (op === "map" || op === "for") {
        const badArg = args.findIndex(
          ({ t }) => t !== "vec" && t !== "str" && t !== "dict",
        );
        if (badArg !== -1) {
          const badType = typeNames[args[badArg].t];
          return tErr(
            `argument ${
              badArg + 2
            } must be either: string, vector, dictionary, not ${badType}`,
          );
        }
      }

      if (op === "for") {
        const arrays = args.map(asArray);
        const lims = arrays.map(len);
        const divisors = lims.map((_, i) =>
          slice(lims, 0, i + 1).reduce((sum, l) => sum * l),
        );
        divisors.unshift(1);
        const lim = divisors.pop()!;
        if (lim > ctx.loopBudget) {
          return [{ e: "Budget", m: "would exceed loop budget", errCtx }];
        }
        const array: Val[] = [];
        for (let t = 0; t < lim; ++t) {
          const argIdxs = divisors.map((d, i) => floor((t / d) % lims[i]));
          const errors = closure(arrays.map((a, i) => a[argIdxs[i]]));
          if (errors) {
            return errors;
          }
          array.push(stack.pop()!);
        }
        _vec(array);
        return;
      }

      if (op === "map") {
        const arrays = args.map(asArray);
        const shortest = min(...arrays.map(len));
        const array: Val[] = [];
        for (let i = 0; i < shortest; ++i) {
          const errors = closure(arrays.map(a => a[i]));
          if (errors) {
            return errors;
          }
          array.push(stack.pop()!);
        }
        _vec(array);
        return;
      }

      if (op !== "reduce") {
        const arrArg = args.shift()!;
        const array = asArray(arrArg);
        const isRemove = op === "remove",
          isFind = op === "find",
          isCount = op === "count";
        const filtered: Val[] = [];
        let count = 0;
        for (let i = 0, lim = len(array); i < lim; ++i) {
          const errors = closure([array[i], ...args]);
          if (errors) {
            return errors;
          }
          const b = asBoo(stack.pop()!);
          if (isCount) {
            count += b ? 1 : 0;
          } else if (isFind) {
            if (b) {
              stack.push(array[i]);
              return;
            }
          } else if (b !== isRemove) {
            filtered.push(array[i]);
          }
        }
        switch (op) {
          case "count":
            _num(count);
            return;
          case "find":
            _nul();
            return;
        }
        if (arrArg.t === "str") {
          _str(filtered.map(v => val2str(v)).join(""));
        } else if (arrArg.t === "dict") {
          stack.push(toDict(flat(filtered.map(v => <Val[]>v.v))));
        } else {
          _vec(filtered);
        }
        return;
      }
      const arrayVal = args.pop()!;
      if (!has(["vec", "dict", "str"], arrayVal.t)) {
        return tErr(
          `must reduce either: string, vector, dictionary, not ${
            typeNames[arrayVal.t]
          }`,
        );
      }
      const array = asArray(arrayVal);

      if (!len(array)) {
        if (len(args)) {
          stack.push(args[0]);
        } else {
          _vec();
        }
        return;
      }
      if (len(array) < 2 && !len(args)) {
        push(stack, array);
        return;
      }

      let reduction: Val = (len(args) ? args : array).shift()!;
      for (let i = 0, lim = len(array); i < lim; ++i) {
        const errors = closure([reduction, array[i]]);
        if (errors) {
          return errors;
        }
        reduction = stack.pop()!;
      }
      stack.push(reduction);
      return;
    }
    case "repeat": {
      const toRepeat = args.shift()!;
      const result: Val[] = [];
      const count = num(args[0]);
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "would exceed range budget", errCtx }];
      }
      ctx.rangeBudget -= count;
      if (toRepeat.t === "func" || toRepeat.t === "clo") {
        const closure = getExe(ctx, toRepeat, errCtx);
        for (let i = 0; i < count; ++i) {
          const errors = closure([{ t: "num", v: i }]);
          if (errors) {
            return errors;
          }
          result.push(stack.pop()!);
        }
      } else {
        for (let i = 0; i < count; ++i) {
          result.push(toRepeat);
        }
      }
      _vec(result);
      return;
    }
    case "->": {
      stack.push(args.shift()!);
      for (let i = 0, lim = len(args); i < lim; ++i) {
        const errors = getExe(ctx, args[i], errCtx)([stack.pop()!]);
        if (errors) {
          errors.forEach(err => (err.m = `-> arg ${i + 2}: ${err.m}`));
          return errors;
        }
      }
      return;
    }
    case "rand-int":
    case "rand":
      {
        const nArgs = len(args);
        const [a, b] = [
          nArgs < 2 ? 0 : num(args[0]),
          nArgs === 0
            ? 1 + toNum(op === "rand-int")
            : nArgs === 1
            ? num(args[0])
            : num(args[1]),
        ];
        _num(op === "rand-int" ? randInt(a, b) : randNum(a, b));
      }
      return;
    case "do":
    case "val":
      stack.push(op === "do" ? args.pop()! : args.shift()!);
      return;
    case ".":
    case "..":
    case "...": {
      const closure = getExe(ctx, args.shift()!, errCtx);
      if (op === ".") {
        return closure(args);
      }
      let flatArgs: Val[] = args;
      if (op === "..") {
        flatArgs = flat(args.map(a => (a.t === "vec" ? a.v : [a])));
      } else {
        const a = flatArgs.pop()!;
        push(flatArgs, flat([a.t === "vec" ? a.v : [a]]));
      }
      return closure(flatArgs);
    }
    case "into": {
      if (args[0].t === "vec") {
        _vec(concat(args[0].v, asArray(args[1])));
      } else {
        if (args[1].t === "vec") {
          stack.push(
            toDict(concat(flat(asArray(args[0]).map(vec)), args[1].v)),
          );
        } else {
          const { keys, vals } = dic(args[0]);
          const d1 = dic(args[1]);
          _dic({ keys: concat(keys, d1.keys), vals: concat(vals, d1.vals) });
        }
      }
      return;
    }
    case "omit":
      stack.push(dictDrop(dic(args[1]), args[0]));
      return;
    case "assoc":
      _dic(dictSet(dic(args[2]), args[0], args[1]));
      return;
    case "append":
      _vec(concat(vec(args[1]), [args[0]]));
      return;
    case "prepend":
      _vec(concat([args[0]], vec(args[1])));
      return;
    case "insert": {
      const v = vec(args[2]);
      let n = num(args[1]);
      if (n === 0) {
        _vec(concat([args[0]], v));
      } else if (n === -1) {
        _vec(concat(v, [args[0]]));
      } else {
        n = n > 0 ? min(n, len(v)) : max(len(v) + 1 + n, 0);
        _vec(concat(concat(slice(v, 0, n), [args[0]]), slice(v, n)));
      }
      return;
    }
    case "sect": {
      const v = args[0];
      const vlen = v.t === "vec" ? len(v.v) : slen(str(v));
      let a = 0,
        b = vlen;
      switch (len(args)) {
        case 1:
          a = 1;
          break;
        case 2: {
          const del = num(args[1]);
          if (del < 0) {
            b += del;
          } else {
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
      a = max(a, 0);
      b = min(b, vlen);
      if (a > b) {
        (v.t === "vec" ? _vec : _str)();
        return;
      }
      if (v.t === "vec") {
        _vec(slice(v.v, a, b));
      } else {
        _str(substr(str(args[0]), a, b - a));
      }
      return;
    }
    case "reverse":
      if (args[0].t === "str") {
        _str(stringify(reverse(asArray(args[0]))));
      } else {
        _vec(reverse(asArray(args[0])));
      }
      return;
    case "sort":
    case "sort-by": {
      const src = asArray(args[op === "sort" ? 0 : 1]);
      if (!len(src)) {
        _vec();
        return;
      }
      const mapped: Val[][] = [];
      if (op === "sort") {
        push(
          mapped,
          src.map(v => [v, v]),
        );
      } else {
        const closure = getExe(ctx, args[0], errCtx);
        for (let i = 0, lim = len(src); i < lim; ++i) {
          const errors = closure([src[i]]);
          if (errors) {
            return errors;
          }
          mapped.push([src[i], stack.pop()!]);
        }
      }
      const okT = mapped[0][1].t;
      if (mapped.some(([_, { t }]) => t !== okT || !has(["num", "str"], t))) {
        return tErr("can only sort by all number or all string");
      }
      if (okT === "num") {
        sortBy(mapped, ([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
      } else {
        sortBy(mapped, ([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
      }
      _vec(mapped.map(([v]) => v));
      return;
    }
    case "distinct": {
      const arr = len(args) === 1 && args[0].t === "vec" ? vec(args[0]) : args;
      const distinct: Val[] = [];
      arr.forEach(a => {
        if (!distinct.some(v => isEqual(a, v))) {
          distinct.push(a);
        }
      });
      _vec(distinct);
      return;
    }
    case "range": {
      const [a, b, s] = args.map(num);
      const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
      const [x, y] =
        len(args) > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
      const step = sign((y - x) * (s || 1)) * (s || 1);
      const count = ceil(abs((y - x) / step));
      if (!count) {
        _vec([]);
        return;
      }
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "would exceed range budget", errCtx }];
      }
      ctx.rangeBudget -= count;
      const nums = range(count).map(n => n * step + x);
      _vec(nums.map(v => <Val>{ t: "num", v }));
      return;
    }
    case "empty?":
      _boo(!len(asArray(args[0])));
      return;
    case "keys":
    case "vals":
      _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
      return;
    case "split":
      _vec(
        str(args[1])
          .split(str(args[0]))
          .map(v => <Val>{ t: "str", v }),
      );
      return;
    case "join":
      _str(asArray(args[1]).map(val2str).join(str(args[0])));
      return;
    case "starts?":
    case "ends?":
      _boo((op === "starts?" ? starts : ends)(str(args[1]), str(args[0])));
      return;
    case "upper-case":
    case "lower-case":
    case "trim":
    case "trim-start":
    case "trim-end":
      _str(
        (op === "upper-case"
          ? upperCase
          : op === "lower-case"
          ? lowerCase
          : op === "trim"
          ? trim
          : op === "trim-start"
          ? trimStart
          : trimEnd)(str(args[0])),
      );
      return;
    case "str*": {
      const text = str(args[0]);
      _str(
        range(max(ceil(num(args[1])), 0))
          .map(n => text)
          .join(""),
      );
      return;
    }
    case "char-code": {
      if (args[0].t === "str") {
        const n = len(args) > 1 ? num(args[1]) : 0;
        const s = str(args[0]);
        if (slen(s) <= n || n < 0) {
          _nul();
        } else {
          _num(charCode(strIdx(s, n)));
        }
      } else {
        _str(codeChar(num(args[0])));
      }
      return;
    }
    case "time":
      _num(getTimeMs());
      return;
    case "version":
      _num(insituxVersion);
      return;
    case "tests":
      _str(doTests(invoke, !(len(args) && asBoo(args[0]))).join("\n"));
      return;
    case "symbols":
      _vec(symbols(ctx, false).map(v => ({ t: "str", v })));
      return;
    case "eval": {
      delete ctx.env.funcs["entry"];
      const sLen = len(stack);
      const invokeId = `${errCtx.invokeId} eval`;
      const errors = parseAndExe(ctx, str(args[0]), invokeId);
      if (errors) {
        return [
          { e: "Eval", m: "error within evaluated code", errCtx },
          ...errors,
        ];
      }
      if (sLen === len(stack)) {
        _nul();
      }
      return;
    }
    case "recur":
      recurArgs = args;
      return;
    case "reset":
      ctx.env.vars = {};
      ctx.env.funcs = {};
      letsStack = [];
      _nul();
      return;
  }

  return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}

const monoArityError = (t: Val["t"], errCtx: ErrCtx) => [
  {
    e: "Arity",
    m: `${typeNames[t]} as op requires one sole argument`,
    errCtx,
  },
];

function checks(op: string, args: Val[], errCtx: ErrCtx, checkArity: boolean) {
  //Optional arity check
  if (checkArity) {
    const violations = arityCheck(op, len(args), errCtx);
    if (violations) {
      return violations;
    }
  }
  //Argument type check
  const types = args.map(a => [a.t]);
  const violations = typeCheck(op, types, errCtx);
  return violations ? violations : false;
}

function getExe(
  ctx: Ctx,
  op: Val,
  errCtx: ErrCtx,
  checkArity = true,
): (params: Val[]) => InvokeError[] | undefined {
  if (op.t === "str" || op.t === "func") {
    const name = op.v;
    if (ops[name]) {
      if (ops[name].external) {
        return (params: Val[]) => {
          const violations = checks(name, params, errCtx, checkArity);
          if (violations) {
            return violations;
          }
          const valOrErr = externalOps[name](params);
          if (valOrErr.kind === "err") {
            return [{ e: "External", m: valOrErr.err, errCtx }];
          }
          stack.push(valOrErr.value);
        };
      }
      return (params: Val[]) =>
        checks(name, params, errCtx, checkArity) ||
        exeOp(name, params, ctx, errCtx);
    }
    if (name in ctx.env.funcs && name !== "entry") {
      return (params: Val[]) => exeFunc(ctx, ctx.env.funcs[name], params);
    }
    if (name in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[name], errCtx);
    }
    if (name in lets) {
      return getExe(ctx, lets[name], errCtx);
    }
    if (starts(name, "$")) {
      return (params: Val[]) => {
        if (!len(params)) {
          return monoArityError(op.t, errCtx);
        }
        const err = ctx.set(substr(name, 1), params[0]);
        stack.push(params[0]);
        return err ? [{ e: "External", m: err, errCtx }] : undefined;
      };
    }
    return (params: Val[]) => {
      const valAndErr = ctx.exe(name, params);
      if (valAndErr.kind === "val") {
        stack.push(valAndErr.value);
        return;
      }
      return [{ e: "External", m: valAndErr.err, errCtx }];
    };
  } else if (op.t === "clo") {
    return (params: Val[]) => exeFunc(ctx, op.v, params);
  } else if (op.t === "key") {
    return (params: Val[]) => {
      if (!len(params)) {
        return monoArityError(op.t, errCtx);
      }
      if (params[0].t === "dict") {
        stack.push(dictGet(dic(params[0]), op));
      } else if (params[0].t === "vec") {
        const found = vec(params[0]).find(v => isEqual(v, op));
        stack.push(found ?? { t: "null", v: undefined });
      } else {
        return keyOpErr(errCtx, [params[0].t]);
      }
      return;
    };
  } else if (op.t === "num") {
    const n = floor(op.v);
    return (params: Val[]) => {
      if (!len(params)) {
        return monoArityError(op.t, errCtx);
      }
      const a = params[0];
      if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
        return numOpErr(errCtx, [a.t]);
      }
      const arr = asArray(a),
        alen = len(arr);
      if ((n >= 0 && n >= alen) || (n < 0 && -n > alen)) {
        _nul();
      } else if (n < 0) {
        stack.push(arr[alen + n]);
      } else {
        stack.push(arr[n]);
      }
      return;
    };
  } else if (op.t === "vec") {
    const { v } = op;
    return (params: Val[]) => {
      if (!len(params)) {
        return monoArityError(op.t, errCtx);
      }
      const found = v.find(val => isEqual(val, params[0]));
      if (found) {
        stack.push(found);
      } else {
        _nul();
      }
      return;
    };
  } else if (op.t === "dict") {
    const dict = op.v;
    return (params: Val[]) => {
      if (len(params) === 1) {
        stack.push(dictGet(dict, params[0]));
      } else if (len(params) === 2) {
        _dic(dictSet(dict, params[0], params[1]));
      } else {
        return [
          { e: "Arity", m: "provide 1 or 2 arguments for dictionary", errCtx },
        ];
      }
      return;
    };
  } else if (op.t === "bool") {
    const cond = op.v;
    return (params: Val[]) => {
      if (!len(params) || len(params) > 2) {
        return [
          { e: "Arity", m: "provide 1 or 2 arguments for boolean", errCtx },
        ];
      }
      stack.push(
        cond
          ? params[0]
          : len(params) > 1
          ? params[1]
          : { t: "null", v: undefined },
      );
      return;
    };
  }
  return _ => [
    { e: "Operation", m: `${val2str(op)} is an invalid operation`, errCtx },
  ];
}

function errorsToDict(errors: InvokeError[]) {
  const newKey = (d: Dict, k: string, v: Val) =>
    dictSet(d, { t: "key", v: k }, v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", { t: "str", v: e });
    dict = newKey(dict, ":m", { t: "str", v: m });
    dict = newKey(dict, ":line", { t: "num", v: errCtx.line });
    dict = newKey(dict, ":col", { t: "num", v: errCtx.col });
    return <Val>{ t: "dict", v: dict };
  });
}

function destruct(args: Val[], shape: number[]): Val {
  let arr: Val[] = args;
  for (let a = 0, b = len(shape) - 1; a < b; ++a) {
    const val = arr[shape[a]];
    if (val.t === "vec") {
      arr = val.v;
    } else if (val.t === "str" && a + 1 === b && shape[a + 1] < slen(val.v)) {
      return { t: "str", v: strIdx(val.v, shape[a + 1]) };
    } else {
      return { t: "null", v: undefined };
    }
  }
  const pos = shape[len(shape) - 1];
  return pos >= len(arr) ? { t: "null", v: undefined } : arr[pos];
}

function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[],
  inClosure = false,
): InvokeError[] | undefined {
  --ctx.callBudget;
  if (!inClosure) {
    letsStack.push({});
    lets = letsStack[len(letsStack) - 1];
  }
  const stackLen = len(stack);
  for (let i = 0, lim = len(func.ins); i < lim; ++i) {
    const ins = func.ins[i];
    const { errCtx } = func.ins[i];

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

    switch (ins.typ) {
      case "val":
        stack.push(ins.value);
        break;
      case "var":
        ctx.env.vars[ins.value] = stack[len(stack) - 1];
        break;
      case "let":
        lets[ins.value] = stack[len(stack) - 1];
        break;
      case "dle":
      case "dva": {
        const val = stack.pop()!;
        let last: Val | undefined;
        ins.value.forEach(({ name, position }) => {
          if (ins.typ === "dva") {
            last = ctx.env.vars[name] = destruct([val], position);
          } else {
            last = lets[name] = destruct([val], position);
          }
        });
        stack.push(last!);
        break;
      }
      case "npa":
      case "upa": {
        const paramIdx = ins.value;
        if (paramIdx === -1) {
          _vec(args);
        } else if (len(args) <= paramIdx) {
          _nul();
        } else {
          stack.push(args[paramIdx]);
        }
        break;
      }
      case "dpa":
        stack.push(destruct(args, ins.value));
        break;
      case "ref": {
        const name = ins.value;
        if (ops[name]) {
          _fun(name);
        } else if (starts(name, "$")) {
          const valAndErr = ctx.get(substr(name, 1));
          if (valAndErr.kind === "err") {
            return [{ e: "External", m: valAndErr.err, errCtx }];
          }
          stack.push(valAndErr.value);
        } else if (name in ctx.env.vars) {
          stack.push(ctx.env.vars[name]);
        } else if (name in lets) {
          stack.push(lets[name]);
        } else if (name in ctx.env.funcs) {
          _fun(name);
        } else {
          return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
        }
        break;
      }
      case "exa":
      case "exe": {
        const closure = getExe(ctx, stack.pop()!, errCtx, ins.typ === "exa");
        const nArgs = ins.value;
        const params = splice(stack, len(stack) - nArgs, nArgs);
        const errors = closure(params);
        if (errors) {
          //Find next catch statement
          const nextCat = slice(func.ins, i).findIndex(
            ins => ins.typ === "cat",
          );
          if (nextCat !== -1) {
            i += nextCat;
            lets["errors"] = {
              t: "vec",
              v: errorsToDict(errors),
            };
            break;
          }
          return errors;
        }
        if (recurArgs) {
          letsStack[len(letsStack) - 1] = {};
          i = -1;
          const nArgs = ins.value;
          args = recurArgs;
          recurArgs = undefined;
          --ctx.recurBudget;
          if (!ctx.recurBudget) {
            return [{ e: "Budget", m: `recurred too many times`, errCtx }];
          }
          break;
        }
        break;
      }
      case "or":
        if (asBoo(stack[len(stack) - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      case "mat": {
        const a = stack[len(stack) - 2];
        if (!isEqual(a, stack.pop()!)) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      }
      case "if":
        if (!asBoo(stack.pop()!)) {
          i += ins.value;
        }
        break;
      case "jmp":
      case "cat":
        i += ins.value;
        break;
      case "loo":
        i += ins.value;
        --ctx.loopBudget;
        break;
      case "pop":
        if (ins.value === 1) {
          stack.pop();
        } else {
          splice(stack, len(stack) - ins.value, ins.value);
        }
        break;
      case "ret":
        if (ins.value) {
          splice(stack, stackLen, len(stack) - stackLen - 1);
        } else {
          _nul();
        }
        i = lim;
        break;
      case "clo": {
        //Ensure any in-scope declarations are captured here
        const derefIns = slice(ins.value.derefIns).map((ins, i) => {
          const decl =
            ins.typ === "val" &&
            ins.value.t === "str" &&
            (lets[ins.value.v] ?? ctx.env.vars[ins.value.v]);
          return decl ? <Ins>{ typ: "val", value: decl } : ins;
        });
        //Dereference closure captures
        const errors = exeFunc(ctx, { ins: derefIns }, args, true);
        if (errors) {
          return errors;
        }
        const numIns = len(derefIns);
        const captures = splice(stack, len(stack) - numIns, numIns);
        stack.push({ t: "clo", v: makeEnclosure(ins.value, captures) });
        break;
      }
      default:
        assertUnreachable(ins);
    }
  }
  if (!inClosure) {
    letsStack.pop();
    lets = letsStack[len(letsStack) - 1];
    splice(stack, stackLen, len(stack) - (stackLen + 1));
  }
  return;
}

function parseAndExe(
  ctx: Ctx,
  code: string,
  invokeId: string,
): InvokeError[] | undefined {
  const parsed = parse(code, invokeId);
  if (len(parsed.errors)) {
    return parsed.errors;
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return;
  }
  return exeFunc(ctx, ctx.env.funcs["entry"], []);
}

function ingestExternalOperations(functions: ExternalFunction[]) {
  functions.forEach(({ name, definition, handler }) => {
    if (ops[name] && !externalOps[name]) {
      throw "Redefining internal operations is disallowed.";
    }
    ops[name] = { ...definition, external: true };
    externalOps[name] = handler;
  });
}

function removeExternalOperations(functions: ExternalFunction[]) {
  functions.forEach(({ name }) => {
    delete ops[name];
    delete externalOps[name];
  });
}

function innerInvoke(
  ctx: Ctx,
  closure: () => InvokeError[] | undefined,
  printResult: boolean,
): InvokeResult {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  ingestExternalOperations(ctx.functions);
  const errors = closure();
  removeExternalOperations(ctx.functions);
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  delete ctx.env.funcs["entry"];
  const value = stack.pop();
  [stack, letsStack] = [[], []];
  if (printResult && !errors && value) {
    ctx.print(val2str(value), true);
  }
  return errors
    ? { kind: "errors", errors }
    : value
    ? { kind: "val", value }
    : { kind: "empty" };
}

/**
 * Parses and executes the given code.
 * @param ctx An environment context you retain.
 * @param code The code to parse and execute.
 * @param invokeId A unique ID referenced in invocation errors.
 * @param printResult Automatically print the final value of this invocation?
 * @returns Invocation errors caused during execution of the code,
 * or the final value of the invocation.
 */
export function invoke(
  ctx: Ctx,
  code: string,
  invokeId: string,
  printResult = false,
): InvokeResult {
  return innerInvoke(ctx, () => parseAndExe(ctx, code, invokeId), printResult);
}

/**
 * Executes a user-defined Insitux function by name.
 * @param ctx An environment context you retain.
 * @param funcName The function to execute.
 * @param params The parameters to pass to the function.
 * @param printResult Automatically print the final value of this invocation?
 * @returns Invocation errors caused during execution of the function,
 * or the final value of the invocation,
 * or undefined if the function was not found.
 */
export function invokeFunction(
  ctx: Ctx,
  funcName: string,
  params: Val[],
  printResult = false,
): InvokeResult | undefined {
  if (!(funcName in ctx.env.funcs)) {
    return;
  }
  return innerInvoke(
    ctx,
    () => exeFunc(ctx, ctx.env.funcs[funcName], params),
    printResult,
  );
}

/**
 * @param ctx An environment context you retain.
 * @param alsoSyntax To optionally include syntax symbols.
 * @returns List of symbols defined in Insitux, including built-in operations,
 * (optionally) syntax, constants, and user-defined functions.
 */
export function symbols(ctx: Ctx, alsoSyntax = true): string[] {
  let syms: string[] = [];
  if (alsoSyntax) {
    push(syms, syntaxes);
  }
  push(syms, ["args", "PI", "E"]);
  syms = concat(syms, objKeys(ops));
  syms = concat(syms, objKeys(ctx.env.funcs));
  syms = concat(syms, objKeys(ctx.env.vars));
  const hidden = ["entry"];
  syms = syms.filter(o => !has(hidden, o));
  return sortBy(syms, (a, b) => (a > b ? 1 : -1));
}
