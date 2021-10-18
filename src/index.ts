export const insituxVersion = 20211018;
import { asBoo } from "./checks";
import { arityCheck, keyOpErr, numOpErr, typeCheck, typeErr } from "./checks";
import { parse } from "./parse";
import * as pf from "./poly-fills";
const { abs, cos, sin, tan, sign, sqrt, floor, ceil, round, max, min } = pf;
const { logn, log2, log10 } = pf;
const { concat, has, flat, push, reverse, slice, splice, sortBy } = pf;
const { ends, slen, starts, sub, subIdx, substr, upperCase, lowerCase } = pf;
const { trim, trimStart, trimEnd } = pf;
const { getTimeMs, randInt, randNum } = pf;
const { isNum, len, objKeys, range, toNum } = pf;
import { doTests } from "./test";
import { assertUnreachable, InvokeError, InvokeResult } from "./types";
import { Ctx, Dict, ErrCtx, Func, Ins, Val, ops, typeNames } from "./types";
import { asArray, isEqual, num, str, stringify, val2str, vec } from "./val";
import { dic, dictDrop, dictGet, dictSet, toDict } from "./val";

let stack: Val[] = [];
let lets: { [key: string]: Val }[] = [];
const _boo = (v: boolean) => stack.push({ t: "bool", v });
const _num = (v: number) => stack.push({ t: "num", v });
const _str = (v = "") => stack.push({ t: "str", v });
const _vec = (v: Val[] = []) => stack.push({ t: "vec", v });
const _dic = (v: Dict) => stack.push({ t: "dict", v });
const _nul = () => stack.push({ t: "null", v: undefined });
const _fun = (v: string) => stack.push({ t: "func", v });

async function exeOp(
  op: string,
  args: Val[],
  ctx: Ctx,
  errCtx: ErrCtx,
  checkArity: boolean,
): Promise<InvokeError[] | undefined> {
  const tErr = (msg: string) => [typeErr(msg, errCtx)];
  //Optional arity check
  if (checkArity) {
    const violations = arityCheck(op, len(args), errCtx);
    if (violations) {
      return violations;
    }
  }
  //Argument type check
  {
    const violations = typeCheck(
      op,
      args.map(a => [a.t]),
      errCtx,
    );
    if (violations) {
      return violations;
    }
  }

  switch (op) {
    case "str":
      stack.push({
        t: "str",
        v: stringify(args),
      });
      return;
    case "print":
    case "print-str":
      {
        ctx.exe(op, [{ t: "str", v: stringify(args) }]);
        _nul();
      }
      return;
    case "vec":
      _vec(args);
      return;
    case "dict": {
      stack.push(toDict(args));
      return;
    }
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
      stack.push(args[0]);
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
      if (isEqual(args[0], args[1]) !== (op === "fast=")) {
        _boo(false);
        return;
      }
      stack.push(args[0]);
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
        const x = 10 ** <number>args[1].v;
        _num(round(<number>args[0].v * x) / x);
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
    case "log10":
      _num(
        { sin, cos, tan, sqrt, floor, ceil, logn, log2, log10 }[op](
          num(args[0]),
        ),
      );
      return;
    case "and":
      _boo(args.every(asBoo));
      return;
    case "or":
      _boo(args.some(asBoo));
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
      _boo(
        (op === "null?" && args[0].t === "null") ||
          (op === "num?" && args[0].t === "num") ||
          (op === "bool?" && args[0].t === "bool") ||
          (op === "str?" && args[0].t === "str") ||
          (op === "dict?" && args[0].t === "dict") ||
          (op === "vec?" && args[0].t === "vec") ||
          (op === "key?" && args[0].t === "key") ||
          (op === "func?" && (args[0].t === "func" || args[0].t === "clo")),
      );
      return;
    case "has?":
      _boo(sub(str(args[0]), str(args[1])));
      return;
    case "idx": {
      let i = -1;
      if (args[0].t === "str") {
        if (args[1].t !== "str") {
          return tErr("strings can only contain strings");
        }
        if (len(args) < 3) {
          i = subIdx(args[0].v, args[1].v);
        } else {
          const arr = args[0].v.split("");
          arr[num(args[2])] = args[1].v;
          _str(arr.join(""));
          return;
        }
      } else if (args[0].t === "vec") {
        if (len(args) < 3) {
          i = args[0].v.findIndex(a => isEqual(a, args[1]));
        } else {
          const v = slice(args[0].v);
          v[num(args[2])] = args[1];
          _vec(v);
          return;
        }
      }
      if (i === -1) {
        _nul();
      } else {
        _num(i);
      }
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
          const errors = await closure(arrays.map((a, i) => a[argIdxs[i]]));
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
          const errors = await closure(arrays.map(a => a[i]));
          if (errors) {
            return errors;
          }
          array.push(stack.pop()!);
        }
        _vec(array);
        return;
      }

      const array = asArray(args.shift()!);
      if (op !== "reduce") {
        const isRemove = op === "remove",
          isFind = op === "find",
          isCount = op === "count";
        const filtered: Val[] = [];
        let count = 0;
        for (let i = 0, lim = len(array); i < lim; ++i) {
          const errors = await closure([array[i], ...args]);
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
        _vec(filtered);
        return;
      }

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
        const errors = await closure([reduction, array[i]]);
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
          const errors = await closure([{ t: "num", v: i }]);
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
        return await closure(args);
      }
      let flatArgs: Val[] = args;
      if (op === "..") {
        flatArgs = flat(args.map(a => (a.t === "vec" ? a.v : [a])));
      } else {
        const a = flatArgs.pop()!;
        push(flatArgs, flat([a.t === "vec" ? a.v : [a]]));
      }
      return await closure(flatArgs);
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
    case "push": {
      if (args[0].t === "vec") {
        const v = args[0].v;
        if (len(args) < 3) {
          _vec(concat(v, [args[1]]));
        } else {
          const n = num(args[2]);
          _vec(concat(concat(slice(v, 0, n), [args[1]]), slice(v, n)));
        }
      } else {
        if (len(args) < 3) {
          stack.push(dictDrop(dic(args[0]), args[1]));
        } else {
          _dic(dictSet(dic(args[0]), args[1], args[2]));
        }
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
    case "sort": {
      if (!len(vec(args[0]))) {
        _vec();
        return;
      }
      const src = asArray(args[0]);
      const mapped: Val[][] = [];
      if (len(args) === 1) {
        push(
          mapped,
          src.map(v => [v, v]),
        );
      } else {
        const closure = getExe(ctx, args.pop()!, errCtx);
        for (let i = 0, lim = len(src); i < lim; ++i) {
          const errors = await closure([src[i]]);
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
      if (mapped[0][1].t === "num") {
        sortBy(mapped, ([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
      } else {
        sortBy(mapped, ([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
      }
      _vec(mapped.map(([v]) => v));
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
        str(args[0])
          .split(len(args) > 1 ? str(args[1]) : " ")
          .map(v => <Val>{ t: "str", v }),
      );
      return;
    case "join":
      _str(
        vec(args[0])
          .map(val2str)
          .join(len(args) > 1 ? str(args[1]) : " "),
      );
      return;
    case "starts-with?":
    case "ends-with?":
      _boo((op === "starts-with?" ? starts : ends)(str(args[0]), str(args[1])));
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
        range(max(num(args[1]), 0))
          .map(n => text)
          .join(""),
      );
      return;
    }
    case "time":
      _num(getTimeMs());
      return;
    case "version":
      _num(insituxVersion);
      return;
    case "tests":
      _str((await doTests(invoke, !(len(args) && asBoo(args[0])))).join("\n"));
      return;
    case "symbols":
      _vec(symbols(ctx, false).map(v => ({ t: "str", v })));
      return;
    case "eval": {
      delete ctx.env.funcs["entry"];
      const sLen = len(stack);
      const sourceId = `${errCtx.sourceId} eval`;
      const errors = await parseAndExe(ctx, str(args[0]), sourceId);
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
    case "reset":
      ctx.env.vars = {};
      ctx.env.funcs = {};
      lets = [];
      _nul();
      return;
  }

  return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}

function getExe(
  ctx: Ctx,
  op: Val,
  errCtx: ErrCtx,
  checkArity = true,
): (params: Val[]) => Promise<InvokeError[] | undefined> {
  const monoArityError = [
    {
      e: "Arity",
      m: `${typeNames[op.t]} as op requires one sole argument`,
      errCtx,
    },
  ];
  if (op.t === "str" || op.t === "func") {
    const name = op.v;
    if (ops[name]) {
      return (params: Val[]) => exeOp(name, params, ctx, errCtx, checkArity);
    }
    if (name in ctx.env.funcs) {
      return (params: Val[]) => exeFunc(ctx, ctx.env.funcs[name], params);
    }
    if (name in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[name], errCtx);
    }
    if (name in lets[len(lets) - 1]) {
      return getExe(ctx, lets[len(lets) - 1][name], errCtx);
    }
    if (starts(name, "$")) {
      return async (params: Val[]) => {
        if (!len(params)) {
          return monoArityError;
        }
        const err = await ctx.set(substr(name, 1), params[0]);
        stack.push(params[0]);
        return err ? [{ e: "External", m: err, errCtx }] : undefined;
      };
    }
    return async (params: Val[]) => {
      const valAndErr = await ctx.exe(name, params);
      if (valAndErr.kind === "val") {
        stack.push(valAndErr.value);
        return;
      }
      return [{ e: "External", m: valAndErr.err, errCtx }];
    };
  } else if (op.t === "clo") {
    return (params: Val[]) => exeFunc(ctx, op.v, params);
  } else if (op.t === "key") {
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
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
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
      }
      const a = params[0];
      if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
        return numOpErr(errCtx, [a.t]);
      }
      const arr = asArray(a);
      if (abs(n) >= len(arr)) {
        _nul();
      } else if (n < 0) {
        stack.push(arr[len(arr) + n]);
      } else {
        stack.push(arr[n]);
      }
      return;
    };
  } else if (op.t === "vec") {
    const { v } = op;
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
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
    return async (params: Val[]) => {
      if (len(params) === 1) {
        stack.push(dictGet(dict, params[0]));
      } else if (len(params) === 2) {
        _dic(dictSet(dict, params[0], params[1]));
      } else {
        return [
          {
            e: "Arity",
            m: "dictionary as operation takes one or two arguments only",
            errCtx,
          },
        ];
      }
      return;
    };
  } else if (op.t === "bool") {
    const cond = op.v;
    return async (params: Val[]) => {
      if (!len(params) || len(params) > 2) {
        return [
          {
            e: "Arity",
            m: "boolean as operation takes one or two arguments only",
            errCtx,
          },
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
  return async _ => [
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

async function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[],
  inClosure = false,
): Promise<InvokeError[] | undefined> {
  --ctx.callBudget;
  if (!inClosure) {
    lets.push({});
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
        lets[len(lets) - 1][ins.value] = stack[len(stack) - 1];
        break;
      case "npa":
      case "upa":
        {
          const paramIdx = ins.value;
          if (paramIdx === -1) {
            _vec(args);
          } else if (len(args) <= paramIdx) {
            _nul();
          } else {
            stack.push(args[paramIdx]);
          }
        }
        break;
      case "ref":
        {
          const name = ins.value;
          if (ops[name]) {
            _fun(name);
          } else if (starts(name, "$")) {
            const valAndErr = await ctx.get(substr(name, 1));
            if (valAndErr.kind === "err") {
              return [{ e: "External", m: valAndErr.err, errCtx }];
            }
            stack.push(valAndErr.value);
          } else if (name in ctx.env.vars) {
            stack.push(ctx.env.vars[name]);
          } else if (name in lets[len(lets) - 1]) {
            stack.push(lets[len(lets) - 1][name]);
          } else if (name in ctx.env.funcs) {
            _fun(name);
          } else {
            return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
          }
        }
        break;
      case "exe":
        {
          const closure = getExe(ctx, stack.pop()!, errCtx, false);
          const nArgs = ins.value;
          const params = splice(stack, len(stack) - nArgs, nArgs);
          const errors = await closure(params);
          if (errors) {
            //Find next catch statement
            const nextCat = slice(func.ins, i).findIndex(
              ins => ins.typ === "cat",
            );
            if (nextCat !== -1) {
              i += nextCat;
              lets[len(lets) - 1]["errors"] = {
                t: "vec",
                v: errorsToDict(errors),
              };
              break;
            }
            return errors;
          }
        }
        break;
      case "or":
        if (asBoo(stack[len(stack) - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
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
        splice(stack, len(stack) - ins.value, ins.value);
        break;
      case "ret":
        if (ins.value) {
          splice(stack, stackLen - 1, len(stack) - stackLen - 1);
        } else {
          _nul();
        }
        i = lim;
        break;
      case "rec":
        {
          lets[len(lets) - 1] = {};
          i = -1;
          const nArgs = ins.value;
          args = splice(stack, len(stack) - nArgs, nArgs);
          --ctx.recurBudget;
          if (!ctx.recurBudget) {
            return [{ e: "Budget", m: `recurred too many times`, errCtx }];
          }
        }
        continue;
      case "clo":
      case "par":
        {
          const name = ins.value[0];
          let cins = ins.value[1];
          const isCapture = ({ typ, value }: Ins, i: number) =>
            (typ === "ref" &&
              !cins.find(i => i.typ === "let" && i.value === value)) ||
            typ === "npa" ||
            (typ === "val" && i + 1 !== len(cins) && cins[i + 1].typ === "exe");
          const derefFunc: Func = {
            name: "",
            ins: cins
              .map((ins, i) => {
                if (i + 1 === len(cins)) {
                  return ins;
                }
                const possibleLet =
                  ins.typ === "val" &&
                  ins.value.t === "str" &&
                  cins[i + 1].typ === "exe" &&
                  lets[len(lets) - 1][ins.value.v];
                return possibleLet
                  ? <Ins>{ typ: "val", value: possibleLet }
                  : ins;
              })
              .filter(isCapture),
          };
          const errors = await exeFunc(ctx, derefFunc, args, true);
          if (errors) {
            return errors;
          }
          const numIns = len(derefFunc.ins);
          const captures = splice(stack, len(stack) - numIns, numIns);
          cins = cins.map((ins, i) =>
            isCapture(ins, i)
              ? <Ins>{ typ: "val", value: captures.shift()!, errCtx }
              : ins,
          );
          //Rewrite partial closure to #(... func [args] args)
          if (ins.typ === "par") {
            const { value: exeNumArgs, errCtx } = cins.pop()!;
            //If has expression as head
            if (len(cins) > 0 && cins[len(cins) - 1].typ === "exe") {
              const headStartIdx = cins.findIndex(i => i.typ === "exp");
              const head = splice(cins, headStartIdx, len(cins) - headStartIdx);
              push(head, cins);
              cins = head;
            } else {
              cins.unshift(cins.pop()!);
            }
            cins.push({ typ: "upa", value: -1, errCtx });
            cins.push({
              typ: "val",
              value: <Val>{ t: "str", v: "..." },
              errCtx,
            });
            cins.push({ typ: "exe", value: <number>exeNumArgs + 2, errCtx });
          }
          stack.push(<Val>{ t: "clo", v: <Func>{ name, ins: cins } });
        }
        break;
      case "exp":
        break;
      default:
        assertUnreachable(ins);
    }
  }
  if (!inClosure) {
    lets.pop();
    splice(stack, stackLen, len(stack) - (stackLen + 1));
  }
  return;
}

async function parseAndExe(
  ctx: Ctx,
  code: string,
  sourceId: string,
): Promise<InvokeError[] | undefined> {
  const parsed = parse(code, sourceId);
  if (len(parsed.errors)) {
    return parsed.errors;
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return;
  }
  return await exeFunc(ctx, ctx.env.funcs["entry"], []);
}

/**
 * Parses and executes the given code.
 * @param ctx An environment context you retain.
 * @param code The code to parse and execute.
 * @param sourceId A unique ID used in immediate or future invocation errors.
 * @param printResult Automatically print the final value of this invocation?
 * @returns Invocation errors caused during execution of the code,
 *          or the final value of the invocation.
 */
export async function invoke(
  ctx: Ctx,
  code: string,
  sourceId: string,
  printResult = false,
): Promise<InvokeResult> {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  const errors = await parseAndExe(ctx, code, sourceId);
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  delete ctx.env.funcs["entry"];
  const value = stack.pop();
  [stack, lets] = [[], []];
  if (printResult && !errors && value) {
    await ctx.exe("print", [{ t: "str", v: val2str(value) }]);
  }
  return errors
    ? { kind: "errors", errors }
    : value
    ? { kind: "val", value }
    : { kind: "empty" };
}

/**
 * Executes a user-defined Insitux function by name.
 * @param ctx An environment context you retain.
 * @param funcName The function to execute.
 * @param args The arguments to pass to the function.
 * @returns Invocation errors caused during execution of the function,
 *          or the final value of the invocation,
 *          or undefined if the function was not found.
 */
export async function invokeFunction(
  ctx: Ctx,
  funcName: string,
  args: Val[],
): Promise<InvokeResult | undefined> {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  if (!(funcName in ctx.env.funcs)) {
    return;
  }
  const errors = await exeFunc(ctx, ctx.env.funcs[funcName], args);
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  const value = stack.pop()!;
  [stack, lets] = [[], []];
  return errors
    ? { kind: "errors", errors }
    : value
    ? { kind: "val", value }
    : { kind: "empty" };
}

/**
 * @param ctx An environment context you retain.
 * @param alsoSyntax To optionally include syntax symbols.
 * @returns List of symbols defined in Insitux, including built-in operations, (optionally) syntax, constants, and user-defined functions.
 */
export function symbols(ctx: Ctx, alsoSyntax = true): string[] {
  let syms = alsoSyntax ? ["function", "let", "var", "if", "if!", "while"] : [];
  push(syms, ["args", "PI", "E"]);
  syms = concat(syms, objKeys(ops));
  syms = concat(syms, objKeys(ctx.env.funcs));
  syms = concat(syms, objKeys(ctx.env.vars));
  const hidden = ["entry"];
  syms = syms.filter(o => !has(hidden, o));
  return sortBy(syms, (a, b) => (a > b ? 1 : -1));
}
