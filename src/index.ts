export const insituxVersion = 20210902;

import { parse } from "./parse";
import {
  abs,
  ceil,
  concat,
  cos,
  ends,
  flat,
  floor,
  getTimeMs,
  has,
  isArray,
  isNum,
  len,
  max,
  min,
  objKeys,
  pi,
  push,
  randInt,
  randNum,
  range,
  round,
  sign,
  sin,
  slen,
  slice,
  splice,
  sqrt,
  starts,
  strIdx,
  sub,
  subIdx,
  substr,
  tan,
  toNum,
} from "./poly-fills";
import { performTests } from "./test";
import {
  Ctx,
  Dict,
  ErrCtx,
  Func,
  InvokeError,
  ops,
  typeNames,
  Val,
} from "./types";

const val2str = ({ v, t }: Val): string => {
  switch (t) {
    case "bool":
      return `${v as boolean}`;
    case "num":
      return `${v as number}`;
    case "str":
    case "key":
      return v as string;
    case "vec":
      return `[${(v as Val[]).map(v => val2str(v)).join(" ")}]`;
    case "dict": {
      const { keys, vals } = v as Dict;
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

let stack: Val[] = [];
const _boo = (v: boolean) => stack.push({ t: "bool", v });
const _num = (v: number) => stack.push({ t: "num", v });
const _str = (v: string = "") => stack.push({ t: "str", v });
const _key = (v: string) => stack.push({ t: "key", v });
const _vec = (v: Val[] = []) => stack.push({ t: "vec", v });
const _dic = (v: Dict) => stack.push({ t: "dict", v });
const _ref = (v: string) => stack.push({ t: "ref", v });
const _nul = () => stack.push({ t: "null", v: undefined });
const _fun = (v: string) => stack.push({ t: "func", v });
const num = ({ v }: Val) => v as number;
const str = ({ v }: Val) => v as string;
const vec = ({ v }: Val) => v as Val[];
const dic = ({ v }: Val) => v as Dict;
const asBoo = ({ t, v }: Val) => (t === "bool" ? (v as boolean) : t !== "null");
export const visStr = (val: Val): val is { t: "str"; v: string } =>
  val.t === "str";
export const visNum = (val: Val): val is { t: "num"; v: number } =>
  val.t === "num";
export const visVec = (val: Val): val is { t: "vec"; v: Val[] } =>
  val.t === "vec";
export const visDic = (val: Val): val is { t: "dict"; v: Dict } =>
  val.t === "dict";
export const visFun = (val: Val): val is { t: "func"; v: string } =>
  val.t === "func";
export const visKey = (val: Val): val is { t: "key"; v: string } =>
  val.t === "key";

const asArray = ({ t, v }: Val): Val[] =>
  t === "vec"
    ? slice(v as Val[])
    : t === "str"
    ? [...(v as string)].map(s => ({ t: "str", v: s }))
    : t === "dict"
    ? (v as Dict).keys.map((k, i) => ({
        t: "vec",
        v: [k, (v as Dict).vals[i]],
      }))
    : [];

const stringify = (vals: Val[]) =>
  vals.reduce((cat, v) => cat + val2str(v), "");

const toDict = (args: Val[]): Val => {
  if (len(args) % 2 === 1) {
    args.pop();
  }
  const keys = args.filter((_, i) => i % 2 === 0);
  const vals = args.filter((_, i) => i % 2 === 1);
  const ddKeys: Val[] = [],
    ddVals: Val[] = [];
  keys.forEach((key, i) => {
    const existingIdx = ddKeys.findIndex(k => isEqual(k, key));
    if (existingIdx === -1) {
      ddKeys.push(key);
      ddVals.push(vals[i]);
    } else {
      ddVals[existingIdx] = vals[i];
    }
  });
  return {
    t: "dict",
    v: { keys: ddKeys, vals: ddVals },
  };
};

const typeErr = (m: string, errCtx: ErrCtx): InvokeError => ({
  e: "Type",
  m,
  errCtx,
});

const isVecEqual = (a: Val[], b: Val[]): boolean =>
  len(a) === len(b) && !a.some((x, i) => !isEqual(x, b[i]));

const isDictEqual = (a: Val, b: Val): boolean => {
  const [ad, bd] = [dic(a), dic(b)];
  return len(ad.keys) === len(bd.keys) && isVecEqual(ad.keys, bd.keys);
};

const isEqual = (a: Val, b: Val) => {
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

const dictGet = ({ keys, vals }: Dict, key: Val) => {
  const idx = keys.findIndex(k => isEqual(k, key));
  return idx === -1 ? <Val>{ t: "null", v: undefined } : vals[idx];
};

const dictSet = ({ keys, vals }: Dict, key: Val, val: Val) => {
  const [nKeys, nVals] = [slice(keys), slice(vals)];
  const idx = keys.findIndex(k => isEqual(k, key));
  if (idx !== -1) {
    nVals[idx] = val;
  } else {
    nKeys.push(key);
    nVals.push(val);
  }
  return <Val>{ t: "dict", v: <Dict>{ keys: nKeys, vals: nVals } };
};

function exeOpViolations(op: string, args: Val[], errCtx: ErrCtx) {
  const { types, exactArity, maxArity, minArity, onlyNum } = ops[op];
  const aErr = (msg: string) => [
    { e: "Arity", m: `${op} needs ${msg}`, errCtx },
  ];
  const nArg = len(args);
  if (exactArity && nArg !== exactArity) {
    return aErr(`exactly ${exactArity} argument${exactArity !== 1 ? "s" : ""}`);
  }
  if (minArity && !maxArity && nArg < minArity) {
    return aErr(`at least ${minArity} argument${minArity !== 1 ? "s" : ""}`);
  } else if (!minArity && maxArity && nArg > maxArity) {
    return aErr(`at most ${maxArity} argument${maxArity !== 1 ? "s" : ""}`);
  } else if (minArity && maxArity && (nArg < minArity || nArg > maxArity)) {
    return aErr(`between ${minArity} and ${maxArity} arguments`);
  }
  if (onlyNum && args.findIndex(a => a.t !== "num") !== -1) {
    return [typeErr(`numeric arguments only`, errCtx)];
  }
  if (!types) {
    return [];
  }
  const typeViolations = types
    .map(
      (need, i) =>
        i < nArg &&
        (isArray(need)
          ? has(need, args[i].t)
            ? false
            : `argument ${i + 1} must be either: ${need
                .map(t => typeNames[t])
                .join(", ")}`
          : need === args[i].t
          ? false
          : `argument ${i + 1} must be ${typeNames[need]}`)
    )
    .filter(r => r);
  return typeViolations.map(v => typeErr(<string>v, errCtx));
}

async function exeOp(
  op: string,
  args: Val[],
  ctx: Ctx,
  errCtx: ErrCtx
): Promise<InvokeError[]> {
  const tErr = (msg: string) => [typeErr(msg, errCtx)];
  //Argument arity and type checks
  {
    const violations = exeOpViolations(op, args, errCtx);
    if (len(violations)) {
      return violations;
    }
  }

  switch (op) {
    case "execute-last":
      return await getExe(ctx, args.pop()!, errCtx)(args);
    case "define":
      ctx.env.vars[str(args[0])] = args[1];
      stack.push(args[1]);
      return [];
    case "let":
      ctx.env.lets[len(ctx.env.lets) - 1][str(args[0])] = args[1];
      stack.push(args[1]);
      return [];
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
      _num(
        args[0].t === "str"
          ? slen(str(args[0]))
          : args[0].t === "vec"
          ? len(vec(args[0]))
          : len(dic(args[0]).keys)
      );
      return [];
    case "num":
      if (!isNum(args[0].v)) {
        return [
          {
            e: "Convert",
            m: `"${args[0].v}" could not be parsed as a number`,
            errCtx,
          },
        ];
      }
      _num(toNum(args[0].v));
      return [];
    case "!":
      _boo(!asBoo(args[0]));
      return [];
    case "=":
    case "!=":
      {
        for (let i = 1, lim = len(args); i < lim; ++i) {
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
        if (len(args) === 1) {
          if (op === "-") {
            args.unshift({ t: "num", v: 0 });
          } else if (op === "**") {
            _num(num(args[0]) ** 2);
            return [];
          }
        }
        const numOps: { [op: string]: (a: number, b: number) => number } = {
          "+": (a, b) => a + b,
          "-": (a, b) => a - b,
          "*": (a, b) => a * b,
          "/": (a, b) => a / b,
          "//": (a, b) => floor(a / b),
          "**": (a, b) => a ** b,
          rem: (a, b) => a % b,
          min: (a, b) => min(a, b),
          max: (a, b) => max(a, b),
        };
        const f = numOps[op];
        _num(args.map(({ v }) => <number>v).reduce((sum, n) => f(sum, n)));
      }
      return [];
    case "<":
    case ">":
    case "<=":
    case ">=":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        const [a, b] = [num(args[i - 1]), num(args[i])];
        if (
          (op === "<" && a < b) ||
          (op === ">" && a > b) ||
          (op === "<=" && a <= b) ||
          (op === ">=" && a >= b)
        ) {
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
      _num(abs(num(args[0])));
      return [];
    case "pi":
      _num(pi);
      return [];
    case "sin":
    case "cos":
    case "tan":
    case "sqrt":
    case "round":
    case "floor":
    case "ceil":
      _num({ sin, cos, tan, sqrt, round, floor, ceil }[op](num(args[0])));
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
      _boo(
        (op === "null?" && args[0].t === "null") ||
          (op === "num?" && args[0].t === "num") ||
          (op === "bool?" && args[0].t === "bool") ||
          (op === "str?" && args[0].t === "str") ||
          (op === "dict?" && args[0].t === "dict") ||
          (op === "vec?" && args[0].t === "vec") ||
          (op === "key?" && args[0].t === "key") ||
          (op === "func?" && args[0].t === "func")
      );
      return [];
    case "has?":
      _boo(sub(str(args[0]), str(args[1])));
      return [];
    case "idx": {
      let i: number = -1;
      if (args[0].t === "str") {
        if (args[1].t !== "str") {
          return tErr("strings can only contain strings");
        }
        i = subIdx(str(args[0]), str(args[1]));
      } else if (args[0].t === "vec") {
        i = vec(args[0]).findIndex(a => isEqual(a, args[1]));
      }
      if (i === -1) {
        _nul();
      } else {
        _num(i);
      }
      return [];
    }
    case "map":
    case "for":
    case "reduce":
    case "filter":
      {
        const closure = getExe(ctx, args.shift()!, errCtx);
        const okT = (t: Val["t"]) => t === "vec" || t === "str" || t === "dict";
        const badArg =
          op === "map" || op === "for"
            ? args.findIndex(({ t }) => !okT(t))
            : okT(args[0].t)
            ? -1
            : 0;
        if (badArg !== -1) {
          return tErr(`argument 2 must be either: string, vector, dictionary`);
        }

        if (op === "for") {
          const arrays = args.map(asArray);
          const lims = arrays.map(len);
          const dividors = lims.map((_, i) =>
            lims.slice(0, i + 1).reduce((sum, l) => sum * l)
          );
          dividors.unshift(1);
          const lim = dividors.pop()!;
          if (lim > ctx.loopBudget) {
            return [{ e: "Budget", m: "would exceed loop budget", errCtx }];
          }
          const array: Val[] = [];
          for (let t = 0; t < lim; ++t) {
            const argIdxs = dividors.map((d, i) =>
              Math.floor((t / d) % lims[i])
            );
            const errors = await closure(arrays.map((a, i) => a[argIdxs[i]]));
            if (len(errors)) {
              return errors;
            }
            array.push(stack.pop()!);
          }
          _vec(array);
          return [];
        }

        if (op === "map") {
          const arrays = args.map(asArray);
          const shortest = min(...arrays.map(a => len(a)));
          const array: Val[] = [];
          for (let i = 0; i < shortest; ++i) {
            const errors = await closure(arrays.map(a => a[i]));
            if (len(errors)) {
              return errors;
            }
            array.push(stack.pop()!);
          }
          _vec(array);
          return [];
        }

        const array = asArray(args.shift()!);
        if (op === "filter") {
          const filtered: Val[] = [];
          for (let i = 0, lim = len(array); i < lim; ++i) {
            const errors = await closure([array[i]]);
            if (len(errors)) {
              return errors;
            }
            if (asBoo(stack.pop()!)) {
              filtered.push(array[i]);
            }
          }
          _vec(filtered);
          return [];
        }

        if (len(array) < 2) {
          push(stack, array);
          return [];
        }
        let reduction: Val = (len(args) ? args : array).shift()!;
        for (let i = 0, lim = len(array); i < lim; ++i) {
          const errors = await closure([reduction, array[i]]);
          if (len(errors)) {
            return errors;
          }
          reduction = stack.pop()!;
        }
        stack.push(reduction);
      }
      return [];
    case "rand-int":
    case "rand-num":
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
      return [];
    case "do":
    case "val":
      stack.push(op === "do" ? args.pop()! : args.shift()!);
      return [];
    case "..": {
      const closure = getExe(ctx, args.shift()!, errCtx);
      return await closure(flat(args.map(a => (a.t === "vec" ? vec(a) : [a]))));
    }
    case "into": {
      const a0v = args[0].t === "vec";
      const a1v = args[1].t === "vec";
      if (a0v) {
        _vec(concat(vec(args[0]), a1v ? vec(args[1]) : asArray(args[1])));
      } else {
        if (a1v) {
          const v1 = asArray(args[1]);
          stack.push(toDict(concat(flat(asArray(args[0]).map(vec)), v1)));
        } else {
          const { keys, vals } = dic(args[0]);
          const d1 = dic(args[1]);
          _dic({ keys: concat(keys, d1.keys), vals: concat(vals, d1.vals) });
        }
      }
      return [];
    }
    case "sect": {
      const v = args[0];
      const isVec = v.t === "vec";
      const vlen = isVec ? len(vec(v)) : slen(str(v));
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
        (isVec ? _vec : _str)();
        return [];
      }
      if (isVec) {
        _vec(slice(vec(v), a, b));
      } else {
        _str(substr(str(args[0]), a, b - a));
      }
      return [];
    }
    case "reverse":
      if (args[0].t === "str") {
        _str(stringify(asArray(args[0]).reverse()));
      } else {
        _vec(asArray(args[0]).reverse());
      }
      return [];
    case "sort": {
      if (!len(vec(args[0]))) {
        _vec();
        return [];
      }
      const src = asArray(args[0]);
      const mapped: Val[][] = [];
      if (len(args) === 1) {
        push(
          mapped,
          src.map(v => [v, v])
        );
      } else {
        const closure = getExe(ctx, args.pop()!, errCtx);
        for (let i = 0, lim = len(src); i < lim; ++i) {
          const errors = await closure([src[i]]);
          if (len(errors)) {
            return errors;
          }
          mapped.push([src[i], stack.pop()!]);
        }
      }
      const okT = mapped[0][1].t;
      if (mapped.some(([_, { t }]) => t !== okT || !has(["num", "str"], t))) {
        return tErr("can only sort by all number or all string");
      }
      if (visNum(mapped[0][1])) {
        mapped.sort(([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
      } else {
        mapped.sort(([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
      }
      _vec(mapped.map(([v]) => v));
      return [];
    }
    case "range": {
      const [a, b, s] = args.map(num);
      const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
      const [start, end] =
        len(args) > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
      const step = sign((end - start) * (s || 1)) * (s || 1);
      const count = ceil(abs((end - start) / step));
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "range too large", errCtx }];
      }
      const nums = range(count).map(n => n * step + start);
      _vec(nums.map(v => <Val>{ t: "num", v }));
      return [];
    }
    case "empty?":
      _boo(!len(asArray(args[0])));
      return [];
    case "keys":
    case "vals":
      _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
      return [];
    case "starts-with?":
      _boo(starts(str(args[0]), str(args[1])));
      return [];
    case "ends-with?":
      _boo(ends(str(args[0]), str(args[1])));
      return [];
    case "split":
      _vec(
        str(args[0])
          .split(len(args) > 1 ? str(args[1]) : " ")
          .map(v => <Val>{ t: "str", v })
      );
      return [];
    case "join":
      _str(
        vec(args[0])
          .map(val2str)
          .join(len(args) > 1 ? str(args[1]) : " ")
      );
      return [];
    case "time":
      _num(getTimeMs());
      return [];
    case "version":
      _num(insituxVersion);
      return [];
    case "tests":
      {
        const tests = await performTests(!(len(args) && asBoo(args[0])));
        const summary = tests.pop()!;
        for (const test of tests) {
          await exeOp("print", [{ v: test, t: "str" }], ctx, errCtx);
        }
        _str(summary);
      }
      return [];
  }

  return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}

function getExe(
  ctx: Ctx,
  op: Val,
  errCtx: ErrCtx
): (params: Val[]) => Promise<InvokeError[]> {
  const monoArityError = [{ e: "Arity", m: `one argument required`, errCtx }];
  if (visStr(op) || visFun(op)) {
    const str = op.v;
    if (ops[str]) {
      return (params: Val[]) => exeOp(str, params, ctx, errCtx);
    }
    if (str in ctx.env.funcs) {
      return (params: Val[]) => exeFunc(ctx, ctx.env.funcs[str], params);
    }
    if (str in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[str], errCtx);
    }
    if (str in ctx.env.lets[len(ctx.env.lets) - 1]) {
      return getExe(ctx, ctx.env.lets[len(ctx.env.lets) - 1][str], errCtx);
    }
    if (starts(str, "$")) {
      return async (params: Val[]) => {
        if (!len(params)) {
          return monoArityError;
        }
        const err = await ctx.set(substr(str, 1), params[0]);
        stack.push(params[0]);
        return err ? [{ e: "External", m: err, errCtx }] : [];
      };
    }
    return async (params: Val[]) => {
      const { err, value } = await ctx.exe(str, params);
      if (!err) {
        stack.push(value);
      }
      return err ? [{ e: "External", m: err, errCtx }] : [];
    };
  } else if (visKey(op)) {
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
      }
      if (params[0].t !== "dict") {
        return [typeErr(`argument 1 must be dictionary`, errCtx)];
      }
      stack.push(dictGet(dic(params[0]), op));
      return [];
    };
  } else if (visNum(op)) {
    const n = op.v;
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
      }
      const a = params[0];
      if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
        return [
          typeErr("argument must be string, vector, or dictionary", errCtx),
        ];
      }
      const arr = asArray(a);
      if (abs(n) >= len(arr)) {
        _nul();
      } else if (n < 0) {
        stack.push(arr[len(arr) + n]);
      } else {
        stack.push(arr[n]);
      }
      return [];
    };
  } else if (visVec(op)) {
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
      return [];
    };
  } else if (visDic(op)) {
    const dict = op.v;
    return async (params: Val[]) => {
      if (len(params) === 1) {
        stack.push(dictGet(dict, params[0]));
      } else if (len(params) === 2) {
        stack.push(dictSet(dict, params[0], params[1]));
      } else {
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
  return async _ => [{ e: "Unexpected", m: "operation is invalid", errCtx }];
}

export async function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[]
): Promise<InvokeError[]> {
  --ctx.callBudget;
  let savedStackLengths: number[] = [];
  ctx.env.lets.push({});
  for (let i = 0, lim = len(func.ins); i < lim; ++i) {
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
        _boo(value as boolean);
        break;
      case "num":
        _num(value as number);
        break;
      case "str":
        _str(value as string);
        break;
      case "key":
        _key(value as string);
        break;
      case "ref":
        _ref(value as string);
        break;
      case "par":
        {
          const paramIdx = value as number;
          if (paramIdx === -1) {
            _vec(args);
          } else if (len(args) <= paramIdx) {
            _nul();
          } else {
            stack.push(args[paramIdx]);
          }
        }
        break;
      case "var":
        {
          const name = value as string;
          if (ops[name]) {
            _fun(name);
          } else if (starts(name, "$")) {
            const { value, err } = await ctx.get(substr(name, 1));
            if (err) {
              return [{ e: "External", m: err, errCtx }];
            }
            stack.push(value);
          } else if (name in ctx.env.vars) {
            stack.push(ctx.env.vars[name]);
          } else if (name in ctx.env.lets[len(ctx.env.lets) - 1]) {
            stack.push(ctx.env.lets[len(ctx.env.lets) - 1][name]);
          } else if (name in ctx.env.funcs) {
            _fun(name);
          } else {
            return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
          }
        }
        break;
      case "op":
      case "exe":
        {
          let [op, nArgs] = value as [Val, number];
          const params = splice(stack, len(stack) - nArgs, nArgs);
          if (len(params) !== nArgs) {
            return [{ e: "Unexpected", m: `${op} stack depleted`, errCtx }];
          }
          const closure = getExe(ctx, op, errCtx);
          const errors = await closure(params);
          if (len(errors)) {
            return errors;
          }
        }
        break;
      case "or":
        if (asBoo(stack[len(stack) - 1])) {
          i += value as number;
        } else {
          stack.pop();
        }
        break;
      case "if":
        if (!asBoo(stack.pop()!)) {
          i += value as number;
        }
        break;
      case "jmp":
        i += value as number;
        --ctx.loopBudget;
        break;
      case "sav":
        savedStackLengths.push(len(stack));
        break;
      case "res":
        {
          const numDel = len(stack) - savedStackLengths.pop()!;
          splice(stack, len(stack) - numDel, numDel);
        }
        break;
    }
  }
  ctx.env.lets.pop();
  return [];
}

export async function invoke(
  ctx: Ctx,
  code: string,
  invocationId: string,
  printResult = false
): Promise<InvokeError[]> {
  const parsed = parse(code, invocationId);
  if (len(parsed.errors)) {
    return parsed.errors;
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return [];
  }
  const errors = await exeFunc(ctx, ctx.env.funcs["entry"], []);
  ctx.env.lets = [];
  delete ctx.env.funcs["entry"];
  if (!len(errors) && printResult) {
    await ctx.exe("print", [{ t: "str", v: val2str(stack[len(stack) - 1]) }]);
  }
  stack = [];
  return errors;
}

export function symbols(ctx: Ctx): string[] {
  let syms = ["function"];
  syms = concat(
    syms,
    objKeys(ops).filter(o => o !== "execute-last")
  );
  syms = concat(syms, objKeys(ctx.env.funcs));
  syms = concat(syms, objKeys(ctx.env.vars));
  return syms;
}
