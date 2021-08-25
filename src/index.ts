export const insituxVersion = 20210825;

import { ops, minArities, argsMustBeNum, parse } from "./parse";
import {
  abs,
  ceil,
  concat,
  cos,
  findIdx,
  flat,
  floor,
  has,
  isNum,
  len,
  max,
  min,
  objKeys,
  pi,
  push,
  randInt,
  randNum,
  round,
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
import { Ctx, Dict, ErrCtx, Func, InvokeError, Val } from "./types";

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
      return `<${(<Func>v).name}>`;
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

const asArray = ({ t, v }: Val): Val[] =>
  t === "vec"
    ? slice(v as Val[])
    : t === "str"
    ? [...(v as string)].map(s => ({ t: "str", v: s }))
    : t === "dict"
    ? flat((v as Dict).keys.map((k, i) => [k, (v as Dict).vals[i]]))
    : [];

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
  e: "Type Error",
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

async function exeVal(
  { v, t }: Val,
  args: Val[],
  ctx: Ctx,
  errCtx: ErrCtx
): Promise<InvokeError[]> {
  if (t === "str") {
    return await exeOp(v as string, args, ctx, errCtx);
  } else if (t === "num") {
    return await exeOp(v as number, args, ctx, errCtx);
  } else if (t === "vec") {
    if (len(args) === 0) {
      return [
        {
          e: "Arity Error",
          m: "vector as operation takes one argument",
          errCtx,
        },
      ];
    }
    const found = (<Val[]>v).find(val => isEqual(val, args[0]));
    if (found) {
      stack.push(found);
    } else {
      _nul();
    }
    return [];
  } else if (t === "dict") {
    const d = v as Dict;
    if (len(args) === 1) {
      stack.push(dictGet(d, args[0]));
    } else if (len(args) === 2) {
      stack.push(dictSet(d, args[0], args[1]));
    } else {
      return [
        {
          e: "Arity Error",
          m: `dict as operation takes one or two arguments`,
          errCtx,
        },
      ];
    }
    return [];
  }
  return [typeErr(`Head was not a valid operation`, errCtx)];
}

async function exeOp(
  op: string | number,
  args: Val[],
  ctx: Ctx,
  errCtx: ErrCtx
): Promise<InvokeError[]> {
  const tErr = (msg: string) => [typeErr(msg, errCtx)];
  //Arity checks
  if (isNum(op) || starts(op, ":") || starts(op, "$")) {
    if (len(args) !== 1) {
      return [{ e: "Arity Error", m: `use one argument only`, errCtx }];
    }
  } else if (op in minArities && len(args) < minArities[op]) {
    const a = minArities[op];
    return [
      {
        e: "Arity Error",
        m: `${op} requires at least ${a} argument${a === 1 ? "" : "s"}`,
        errCtx,
      },
    ];
  }
  //Check for non-numeric arguments if needed
  if (has(argsMustBeNum, op)) {
    const nAn = args.findIndex(a => a.t !== "num");
    if (nAn !== -1) {
      return tErr(`argument ${nAn + 1} is not a number`);
    }
  }

  switch (op) {
    case "version":
      _num(insituxVersion);
      return [];
    case "tests":
      {
        const tests = await performTests();
        const summary = tests.pop()!;
        for (const test of tests) {
          await exeOp("print", [{ v: test, t: "str" }], ctx, errCtx);
        }
        _str(summary);
      }
      return [];
    case "execute-last":
      return await exeVal(args.pop()!, args, ctx, errCtx);
    case "define":
      if (args[0].t !== "ref") {
        return [{ e: "Define Error", m: "first arg wasn't reference", errCtx }];
      }
      ctx.env.vars[str(args[0])] = args[1];
      stack.push(args[1]);
      return [];
    case "str":
      stack.push({
        t: "str",
        v: args.reduce((cat, v) => cat + val2str(v), ""),
      });
      return [];
    case "print":
    case "print-str":
      {
        ctx.exe(op, [
          { t: "str", v: args.reduce((cat, v) => cat + val2str(v), "") },
        ]);
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
      if (args[0].t === "str") {
        _num(slen(str(args[0])));
      } else if (args[0].t === "vec") {
        _num(len(vec(args[0])));
      } else if (args[0].t === "dict") {
        _num(len(dic(args[0]).keys));
      } else {
        return tErr(`argument must be string, vector, or dictionary`);
      }
      return [];
    case "num":
      if (args[0].t !== "str" && args[0].t !== "num") {
        return tErr("argument must be string or number");
      }
      if (!isNum(args[0].v)) {
        return [
          {
            e: "Convert Error",
            m: `"${args[0].v}" could not be parsed as a number`,
            errCtx,
          },
        ];
      }
      _num(toNum(args[0].v));
      return [];
    case "=":
    case "!=":
      {
        for (let i = 1; i < len(args); ++i) {
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
    case "**":
    case "rem":
    case "min":
    case "max":
      {
        if (op === "-" && len(args) === 1) {
          args.unshift({ t: "num", v: 0 });
        }
        const numOps: { [op: string]: (a: number, b: number) => number } = {
          "+": (a, b) => a + b,
          "-": (a, b) => a - b,
          "*": (a, b) => a * b,
          "/": (a, b) => a / b,
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
      for (let i = 1; i < len(args); ++i) {
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
    case "has?": {
      if (args[0].t !== "str" || args[1].t !== "str") {
        return tErr("strings can only contain strings");
      }
      _boo(sub(str(args[0]), str(args[1])));
      return [];
    }
    case "idx": {
      let i: number = -1;
      if (args[0].t === "str") {
        if (args[1].t !== "str") {
          return tErr("strings can only contain strings");
        }
        i = subIdx(str(args[0]), str(args[1]));
      } else if (args[0].t === "vec") {
        i = findIdx(vec(args[0]), a => isEqual(a, args[1]));
      }
      if (i === -1) {
        _nul();
      } else {
        _num(i);
      }
      return [];
    }
    case "map":
    case "reduce":
      {
        const closure = opFromName(ctx, str(args.shift()!), errCtx);
        const badArg =
          op === "map"
            ? args.findIndex(({ t }) => t !== "vec" && t !== "str")
            : args[0].t === "str" || args[0].t === "vec"
            ? -1
            : 1;
        if (badArg !== -1) {
          return tErr(`"${args[badArg]}" is not a string or vector`);
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
        if (len(array) < 2) {
          push(stack, array);
          return [];
        }
        let reduction: Val = (len(args) ? args : array).shift()!;
        for (let i = 0; i < len(array); ++i) {
          const errors = await closure!([reduction, array[i]]);
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
      if (len(args)) {
        stack.push(args.pop()!);
      } else {
        _nul();
      }
      return [];
    case "apply": {
      const closure = opFromName(ctx, str(args.shift()!), errCtx);
      return await closure(flat(args.map(a => (a.t === "vec" ? vec(a) : [a]))));
    }
    case "into": {
      const a0v = args[0].t === "vec";
      const a0d = args[0].t === "dict";
      const a1v = args[1].t === "vec";
      const a1d = args[1].t === "dict";
      if ((!a0v && !a0d) || (!a1v && !a1d)) {
        return tErr("each argument must be vector or dictionary");
      }
      if (a0v) {
        _vec(concat(vec(args[0]), a1v ? vec(args[1]) : asArray(args[1])));
      } else {
        if (a1v) {
          const v1 = asArray(args[1]);
          stack.push(toDict(concat(asArray(args[0]), v1)));
        } else {
          const { keys, vals } = dic(args[0]);
          const d1 = dic(args[1]);
          _dic({ keys: concat(keys, d1.keys), vals: concat(vals, d1.vals) });
        }
      }
      return [];
    }
    case "sect": {
      const isVec = args[0].t === "vec";
      const isStr = args[0].t === "str";
      if (!isVec && !isStr) {
        return tErr("first argument must be vector or string");
      }
      if (len(args) > 1 && args[1].t !== "num") {
        return tErr("second argument must be number");
      }
      if (len(args) > 2) {
        if (args[2].t !== "num") {
          return tErr("third argument must be number");
        }
      }
      let skip = len(args) > 1 ? num(args[1]) : 1;
      const v = args[0];
      const vlen = isVec ? len(vec(v)) : slen(str(v));
      const take = min(
        max(len(args) > 2 ? num(args[2]) : vlen - abs(skip), 0),
        vlen
      );
      if (abs(skip) > vlen) {
        (isVec ? _vec : _str)();
        return [];
      }
      if (isVec) {
        const [a, b] =
          skip < 0 ? [vlen + skip, vlen + skip + take] : [skip, skip + take];
        _vec(slice(vec(v), a, b));
      } else {
        const [start, length] = [skip < 0 ? vlen + skip : skip, take];
        _str(substr(str(args[0]), start, length));
      }
      return [];
    }
    case "keys":
    case "vals":
      if (args[0].t !== "dict") {
        return tErr("argument must be dictionary");
      }
      _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
      return [];
  }

  if (isNum(op)) {
    const a = args[0];
    switch (a.t) {
      case "vec":
        stack.push(vec(a)[toNum(op)] as Val);
        break;
      case "str":
        _str(strIdx(str(args[0]), toNum(op)));
        break;
      default:
        _nul();
        break;
    }
    return [];
  } else {
    if (starts(op, "$")) {
      const val = args.pop()!;
      const err = await ctx.set(substr(op, 1), val);
      stack.push(val);
      return err ? [{ e: "External Error", m: err, errCtx }] : [];
    } else if (starts(op, ":")) {
      if (args[0].t !== "dict") {
        return tErr(`argument 1 wasn't a dict`);
      }
      stack.push(dictGet(dic(args[0]), { t: "key", v: op }));
      return [];
    }
  }

  const { err, value } = await ctx.exe(op, args);
  if (!err) {
    stack.push(value);
  }
  return err ? [{ e: "External Error", m: err, errCtx }] : [];
}

function opFromName(
  ctx: Ctx,
  op: string,
  errCtx: ErrCtx
): (params: Val[]) => Promise<InvokeError[]> {
  const checkIsOp = (op: string) =>
    has(ops, op) || isNum(op) || starts(op, "$") || starts(op, ":");
  let isOp = checkIsOp(op);
  let isFunc = !isOp && op in ctx.env.funcs;
  //If variable name
  if (!isOp && !isFunc && op in ctx.env.vars) {
    const val = ctx.env.vars[op];
    if (val.t === "str" || val.t === "func") {
      op = str(val);
      isOp = checkIsOp(op);
      isFunc = !isOp && op in ctx.env.funcs;
    } else {
      return (params: Val[]) => exeVal(val, params, ctx, errCtx);
    }
  }
  return isFunc
    ? (params: Val[]) => exeFunc(ctx, ctx.env.funcs[op], params)
    : (params: Val[]) => exeOp(op, params, ctx, errCtx);
}

export async function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[]
): Promise<InvokeError[]> {
  --ctx.callBudget;
  let savedStackLengths: number[] = [];
  for (let i = 0; i < len(func.ins); ++i) {
    const { typ, value, errCtx } = func.ins[i];

    const tooManyLoops = ctx.loopBudget < 1;
    if (tooManyLoops || ctx.callBudget < 1) {
      return [
        {
          e: "Budget Error",
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
          if (len(args) <= paramIdx) {
            _nul();
          } else {
            stack.push(args[paramIdx]);
          }
        }
        break;
      case "var":
        {
          const name = value as string;
          if (has(ops, name)) {
            _str(name);
          } else if (starts(name, "$")) {
            const { value, err } = await ctx.get(substr(name, 1));
            if (err) {
              return [{ e: "External Error", m: err, errCtx }];
            }
            stack.push(value);
          } else if (name in ctx.env.vars) {
            stack.push(ctx.env.vars[name]);
          } else if (name in ctx.env.funcs) {
            _fun(name);
          } else {
            return [
              { e: "Reference Error", m: `"${name}" did not exist`, errCtx },
            ];
          }
        }
        break;
      case "op":
      case "exe":
        {
          let [op, nArgs] = value as [string, number];
          const params = splice(stack, len(stack) - nArgs, nArgs);
          if (len(params) !== nArgs) {
            return [
              { e: "Unexpected Error", m: `${op} stack depleted`, errCtx },
            ];
          }
          const closure = opFromName(ctx, op, errCtx);
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
    ops.filter(o => o !== "execute-last")
  );
  syms = concat(syms, objKeys(ctx.env.funcs));
  syms = concat(syms, objKeys(ctx.env.vars));
  return syms;
}
