export const insituxVersion = 20210826;

import { parse } from "./parse";
import {
  abs,
  ceil,
  concat,
  cos,
  flat,
  floor,
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
const visStr = (val: Val): val is { t: "str"; v: string } => val.t === "str";
const visNum = (val: Val): val is { t: "num"; v: number } => val.t === "num";
const visVec = (val: Val): val is { t: "vec"; v: Val[] } => val.t === "vec";
const visDic = (val: Val): val is { t: "dict"; v: Dict } => val.t === "dict";
const visFun = (val: Val): val is { t: "func"; v: string } => val.t === "func";

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
  const { argTypes, exactArity, maxArity, minArity, onlyNum } = ops[op];
  const aErr = (msg: string) => [{ e: "Arity", m: msg, errCtx }];
  if (exactArity && len(args) !== exactArity) {
    return aErr(
      `needs exactly ${exactArity} argument${exactArity !== 1 ? "s" : ""}`
    );
  }
  if (
    (minArity && len(args) < minArity) ||
    (maxArity && len(args) > maxArity)
  ) {
    return aErr(`needs between ${minArity} and ${maxArity} arguments`);
  }
  if (onlyNum && args.findIndex(a => a.t !== "num") !== -1) {
    return [typeErr(`numeric arguments only`, errCtx)];
  }
  if (!argTypes) {
    return [];
  }
  const typeViolations = argTypes
    .map(
      (need, i) =>
        i < len(args) &&
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
      return await getExe(ctx, args.pop()!, errCtx)(args);
    case "define":
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
    case "reduce":
    case "filter":
      {
        const closure = getExe(ctx, args.shift()!, errCtx);
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
        if (op === "filter") {
          const filtered: Val[] = [];
          for (let i = 0; i < len(array); ++i) {
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
        for (let i = 0; i < len(array); ++i) {
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
      if (len(args)) {
        stack.push(args.pop()!);
      } else {
        _nul();
      }
      return [];
    case "apply": {
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
      _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
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
    if (starts(str, ":")) {
      return async (params: Val[]) => {
        if (!len(params)) {
          return monoArityError;
        }
        if (params[0].t !== "dict") {
          return [typeErr(`argument 1 wasn't a dict`, errCtx)];
        }
        stack.push(dictGet(dic(params[0]), { t: "key", v: str }));
        return [];
      };
    }
    return async (params: Val[]) => {
      const { err, value } = await ctx.exe(str, params);
      if (!err) {
        stack.push(value);
      }
      return err ? [{ e: "External", m: err, errCtx }] : [];
    };
  } else if (visNum(op)) {
    const n = op.v;
    return async (params: Val[]) => {
      if (!len(params)) {
        return monoArityError;
      }
      const a = params[0];
      switch (a.t) {
        case "str":
          if (n >= slen(str(a))) {
            _nul();
          } else {
          _str(strIdx(str(a), n));
          }
          break;
        case "vec":
          if (n >= len(vec(a))) {
            _nul();
          } else {
          stack.push(vec(a)[n] as Val);
          }
          break;
        default:
          return [typeErr("argument must be string or vector", errCtx)];
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
  for (let i = 0; i < len(func.ins); ++i) {
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
          if (ops[name]) {
            _str(name);
          } else if (starts(name, "$")) {
            const { value, err } = await ctx.get(substr(name, 1));
            if (err) {
              return [{ e: "External", m: err, errCtx }];
            }
            stack.push(value);
          } else if (name in ctx.env.vars) {
            stack.push(ctx.env.vars[name]);
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
    objKeys(ops).filter(o => o !== "execute-last")
  );
  syms = concat(syms, objKeys(ctx.env.funcs));
  syms = concat(syms, objKeys(ctx.env.vars));
  return syms;
}
