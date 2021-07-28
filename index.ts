import { Test } from "./test";
import { Parse, ops, minArities, argsMustBeNum } from "./parse";
import { isNum } from "./utils";

const val2extVal = ({ v, t }: Val): ExternalValue => {
  switch (t) {
    case "bool":
      return v as boolean;
    case "num":
      return v as number;
    case "str":
    case "key":
      return v as string;
    case "vec":
      return `[${(v as Val[]).map(val2extVal).join(" ")}]`;
    case "null":
      return "null";
    case "func":
      return (<Func>v).name;
  }
  return null;
};

namespace Machine {
  export let stack: Val[] = [];
  const _boo = (v: boolean) => stack.push({ t: "bool", v });
  const _num = (v: number) => stack.push({ t: "num", v });
  const _str = (v: string) => stack.push({ t: "str", v });
  const _key = (v: string) => stack.push({ t: "key", v });
  const _vec = (v: Val[]) => stack.push({ t: "vec", v });
  const _ref = (v: string) => stack.push({ t: "ref", v });
  const _nul = () => stack.push({ t: "null", v: null });
  const _fun = (v: string) => stack.push({ t: "func", v });
  const num = ({ v }: Val) => v as number;
  const str = ({ v }: Val) => v as string;
  const vec = ({ v }: Val) => v as Val[];
  const asArray = ({ t, v }: Val): Val[] =>
    t === "vec"
      ? (v as Val[]).slice()
      : t === "str"
      ? [...(v as string)].map(s => ({ t: "str", v: s }))
      : [];
  const typeErr = (m: string, line: number, col: number): InvokeError => ({
    e: "Type Error",
    m,
    line,
    col,
  });

  async function exeOp(
    op: string,
    args: Val[],
    ctx: Ctx,
    line: number,
    col: number
  ): Promise<InvokeError[]> {
    //Check minimum arity
    if (args.length < (isNum(op) ? 1 : minArities[op] || 0)) {
      return [
        {
          e: "Arity error",
          m: `${op} requires at least ${minArities[op]} argument/s`,
          line,
          col,
        },
      ];
    }
    //Check for non-numeric arguments if needed
    if (argsMustBeNum.includes(op)) {
      const nAn = args.findIndex(a => a.t !== "num");
      if (nAn !== -1) {
        return [typeErr(`Argument ${nAn + 1} is not a number`, line, col)];
      }
    }

    switch (op) {
      case "execute-last":
        {
          await exeOp(args.pop()!.v as string, args, ctx, line, col);
        }
        return [];
      case "define":
        if (args[0].t !== "ref") {
          return [
            { e: "Define Error", m: "first arg wasn't reference", line, col },
          ];
        }
        ctx.env.vars[str(args[0])] = args[1];
        return [];
      case "print-line":
        {
          ctx.exe(op, [args.reduce((cat, { v }) => cat + `${v}`, "")]);
          _nul();
        }
        return [];
      case "vec":
        _vec(args);
        return [];
      case "len":
        if (args[0].t === "str") {
          _num(str(args[0]).length);
        } else if (args[0].t === "vec") {
          _num(vec(args[0]).length);
        } else {
          return [typeErr(`${args[0].v} is not a string or vector`, line, col)];
        }
        return [];
      case "+":
      case "-":
      case "*":
      case "/":
        {
          if (op === "-" && args.length === 1) {
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
        for (let i = 1; i < args.length; ++i) {
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
          const { closure, error } = realiseOperation(
            ctx,
            str(args.shift()!),
            line,
            col
          );
          if (error) {
            return [error];
          }
          const badArg =
            op === "map"
              ? args.findIndex(({ t }) => t !== "vec" && t != "str")
              : args[0].t === "str" || args[0].t === "vec"
              ? -1
              : 1;
          if (badArg !== -1) {
            return [
              typeErr(`"${args[badArg]}" is not a string or vector`, line, col),
            ];
          }

          if (op === "map") {
            const arrays = args.map(asArray);
            const min = Math.min(...arrays.map(a => a.length));
            const array: Val[] = [];
            for (let i = 0; i < min; ++i) {
              const errors = await closure!(arrays.map(a => a[i]));
              if (errors.length) {
                return errors;
              }
              array.push(stack.pop()!);
            }
            _vec(array);
            return [];
          }

          const array = asArray(args.shift()!);
          if (array.length < 2) {
            stack.push(...array);
            return [];
          }
          let reduction: Val = args.length ? args.shift()! : array.shift()!;
          for (let i = 0; i < array.length; ++i) {
            const errors = await closure!([reduction, array[i]]);
            if (errors.length) {
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
          stack.push(vec(a)[Number(op)] as Val);
          console.log(stack);
          return [];
        case "str":
          _str(str(args[0])[Number(op)]);
          return [];
      }
    }
    return [
      {
        e: "Unknown operation",
        m: `${op} with ${args.length} argument/s`,
        line,
        col,
      },
    ];
  }

  function realiseOperation(
    ctx: Ctx,
    op: string,
    line: number,
    col: number
  ): {
    closure?: (params: Val[]) => Promise<InvokeError[]>;
    error: false | InvokeError;
  } {
    const checkIsOp = (op: string) => ops.includes(op) || isNum(op);
    let isOp = checkIsOp(op);
    let isFunc = op in ctx.env.funcs;
    //If variable name
    if (!isOp && !isFunc && op in ctx.env.vars) {
      op = str(ctx.env.vars[op]);
      isOp = checkIsOp(op);
      isFunc = op in ctx.env.funcs;
    }
    return {
      closure: isOp
        ? (params: Val[]) => exeOp(op, params, ctx, line, col)
        : isFunc
        ? (params: Val[]) => exeFunc(ctx, ctx.env.funcs[op], params)
        : undefined,
      error: !isOp &&
        !isFunc && {
          e: "Unknown Operation",
          m: `${op} is an unknown operation/function`,
          line,
          col,
        },
    };
  }

  export async function exeFunc(
    ctx: Ctx,
    func: Func,
    args: Val[]
  ): Promise<InvokeError[]> {
    for (let i = 0; i < func.ins.length; ++i) {
      const { type, value, line, col } = func.ins[i];
      switch (type) {
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
            if (args.length <= paramIdx) {
              _nul();
            } else {
              stack.push(args[paramIdx]);
            }
          }
          break;
        case "var":
          {
            const name = value as string;
            if (ops.includes(name)) {
              _str(name);
            } else if (name in ctx.env.vars) {
              stack.push(ctx.env.vars[name]);
            } else if (name in ctx.env.funcs) {
              _fun(name);
            } else {
              return [{ e: "Variable not found", m: `"${name}"`, line, col }];
            }
          }
          break;
        case "op":
        case "exe":
          {
            let [op, nArgs] = value as [string, number];
            const params = stack.splice(stack.length - nArgs, nArgs);
            if (params.length !== nArgs) {
              return [
                { e: "Unexpected Error", m: `${op} stack depleted`, line, col },
              ];
            }
            const { closure, error } = realiseOperation(ctx, op, line, col);
            if (error) {
              return [error];
            }
            const errors = await closure!(params);
            if (errors.length) {
              return errors;
            }
          }
          break;
        case "if":
          if (!stack.pop()) {
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
}

export async function invoke(ctx: Ctx, code: string): Promise<InvokeError[]> {
  ctx.env = { ...ctx.env, ...Parse.parse(code) };
  console.dir(ctx.env, { depth: 10 });
  const errors = await Machine.exeFunc(ctx, ctx.env.funcs["entry"], []);
  if (!errors.length) {
    await ctx.exe(
      "print-line",
      Machine.stack.length ? [val2extVal(Machine.stack[0])] : []
    );
  }
  Machine.stack = [];
  return errors;
}

Test.perform();
