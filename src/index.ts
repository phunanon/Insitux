import { ops, minArities, argsMustBeNum, parse } from "./parse";
import {
  has,
  isNum,
  len,
  min,
  push,
  slen,
  slice,
  splice,
  starts,
  strIdx,
  sub,
  substr,
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
      return (<Func>v).name;
  }
  return "?";
};

let stack: Val[] = [];
const _boo = (v: boolean) => stack.push({ t: "bool", v });
const _num = (v: number) => stack.push({ t: "num", v });
const _str = (v: string) => stack.push({ t: "str", v });
const _key = (v: string) => stack.push({ t: "key", v });
const _vec = (v: Val[]) => stack.push({ t: "vec", v });
const _ref = (v: string) => stack.push({ t: "ref", v });
const _nul = () => stack.push({ t: "null", v: undefined });
const _fun = (v: string) => stack.push({ t: "func", v });
const num = ({ v }: Val) => v as number;
const str = ({ v }: Val) => v as string;
const vec = ({ v }: Val) => v as Val[];
const dict = ({ v }: Val) => v as Dict;
const asBoo = ({ t, v }: Val) => (t === "bool" ? (v as boolean) : t !== "null");

const asArray = ({ t, v }: Val): Val[] =>
  t === "vec"
    ? slice(v as Val[])
    : t === "str"
    ? [...(v as string)].map(s => ({ t: "str", v: s }))
    : [];

const typeErr = (m: string, errCtx: ErrCtx): InvokeError => ({
  e: "Type Error",
  m,
  errCtx,
});

const isVecEqual = (a: Val[], b: Val[]): boolean =>
  len(a) === len(b) && !a.some((x, i) => !isEqual(x, b[i]));

const isDictEqual = (a: Val, b: Val): boolean => {
  const [ad, bd] = [dict(a), dict(b)];
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
    const arr = slice(v as Val[]);
    push(arr, args);
    _vec(arr);
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
  //Check minimum arity
  if (
    len(args) <
    (isNum(op) || starts(op, "$") || starts(op, ":") ? 1 : minArities[op] || 0)
  ) {
    return [
      {
        e: "Arity Error",
        m: `${op} requires at least ${minArities[op]} argument/s`,
        errCtx,
      },
    ];
  }
  //Check for non-numeric arguments if needed
  if (has(argsMustBeNum, op)) {
    const nAn = args.findIndex(a => a.t !== "num");
    if (nAn !== -1) {
      return [typeErr(`argument ${nAn + 1} is not a number`, errCtx)];
    }
  }

  switch (op) {
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
    case "print-line":
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
    case "dict":
      if (len(args) % 2 === 1) {
        args.pop();
      }
      stack.push({
        t: "dict",
        v: {
          keys: args.filter((_, i) => i % 2 === 0),
          vals: args.filter((_, i) => i % 2 === 1),
        },
      });
      return [];
    case "len":
      if (args[0].t === "str") {
        _num(slen(str(args[0])));
      } else if (args[0].t === "vec") {
        _num(len(vec(args[0])));
      } else {
        return [typeErr(`${args[0].v} is not a string or vector`, errCtx)];
      }
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
      {
        if (op === "-" && len(args) === 1) {
          args.unshift({ t: "num", v: 0 });
        }
        const numOps: { [op: string]: (a: number, b: number) => number } = {
          "+": (a, b) => a + b,
          "-": (a, b) => a - b,
          "*": (a, b) => a * b,
          "/": (a, b) => a / b,
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
          return [
            typeErr(`"${args[badArg]}" is not a string or vector`, errCtx),
          ];
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
        return [typeErr(`argument 1 wasn't a dict`, errCtx)];
      }
      stack.push(dictGet(dict(args[0]), { t: "key", v: op }));
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

async function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[]
): Promise<InvokeError[]> {
  for (let i = 0; i < len(func.ins); ++i) {
    const { typ, value, errCtx } = func.ins[i];
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
      case "els":
        i += value as number;
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
    await ctx.exe("print-line", [
      { t: "str", v: val2str(stack[len(stack) - 1]) },
    ]);
  }
  stack = [];
  return errors;
}

performTests();
