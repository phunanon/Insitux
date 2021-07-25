import { Test } from "./test";
import { Parse, ops, minArities } from "./parse";

const val2extVal = ({ v, t }: Val): ExternalValue => {
  switch (t) {
    case "bool":
      return v as boolean;
    case "num":
      return v as number;
    case "str":
    case "key":
      return v as string;
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
  const num = ({ v }: Val) => v as number;
  const str = ({ v }: Val) => v as string;
  const vec = ({ v }: Val) => v as Val[];

  async function exeOp(
    op: string,
    args: Val[],
    ctx: Ctx,
    line: number,
    col: number
  ): Promise<InvokeError[]> {
    if (args.length < (Number(op) ? 1 : minArities[op])) {
      return [
        {
          e: "Arity error",
          m: `${op} requires at least ${minArities[op]} argument/s`,
          line,
          col,
        },
      ];
    }
    switch (op) {
      case "execute-last":
        {
          await exeOp(args.pop()!.v as string, args, ctx, line, col);
        }
        return [];
      case "define":
        if (args[0].t != "ref") {
          return [
            { e: "Define error", m: "first arg wasn't reference", line, col },
          ];
        }
        ctx.env.vars[str(args[0])] = args[1];
        return [];
      case "vec":
        _vec(args);
        return [];
      case "+":
      case "-":
      case "*":
      case "/":
        {
          const nAn = args.find(a => a.t != "num");
          if (nAn) {
            return [
              { e: "Type Error", m: `"${nAn.v}" is not a number`, line, col },
            ];
          }
          const f: (a: number, b: number) => number =
            op == "+"
              ? (a, b) => a + b
              : op == "-"
              ? (a, b) => a - b
              : op == "*"
              ? (a, b) => a * b
              : op == "/"
              ? (a, b) => a / b
              : () => 0;
          if (op == "-" && args.length == 1) {
            args.unshift({ t: "num", v: 0 });
          }
          _num(args.map(({ v }) => <number>v).reduce((sum, n) => f(sum, n)));
        }
        return [];
      case "inc":
        if (args[0].t != "num") {
          return [
            { e: "Type Error", m: `${args[0]} is not a number`, line, col },
          ];
        }
        _num(num(args[0]) + 1);
        return [];
      case "print-line":
        {
          ctx.exe(op, [args.reduce((cat, { v }) => cat + `${v}`, "")]);
          _nul();
        }
        return [];
    }
    if (Number(op)) {
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

  export async function exeFunc(ctx: Ctx, func: Func): Promise<InvokeError[]> {
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
        case "ref":
          _ref(value as string);
          break;
        case "key":
          _key(value as string);
          break;
        case "var":
          {
            const name = value as string;
            if (ops.includes(name)) {
              _str(name);
            } else if (name in ctx.env.vars) {
              stack.push(ctx.env.vars[name]);
            } else {
              return [{ e: "Variable not found", m: `"${name}"`, line, col }];
            }
          }
          break;
        case "op":
        case "exe":
          {
            const [op, nArgs]: [string, number] = value;
            const args = stack.splice(stack.length - nArgs, nArgs);
            if (args.length != nArgs) {
              return [
                { e: "Unexpected Error", m: `${op} stack depleted`, line, col },
              ];
            }
            const errors = await exeOp(op, args, ctx, line, col);
            if (errors.length) {
              return errors;
            }
          }
          break;
        case "if":
          if (!stack.pop()) {
            i += value;
          }
          break;
        case "els":
          i += value;
          break;
      }
    }
    return [];
  }
}

export async function invoke(ctx: Ctx, code: string): Promise<InvokeError[]> {
  ctx.env = { ...ctx.env, ...Parse.parse(code) };
  console.dir(ctx.env, { depth: 10 });
  const errors = await Machine.exeFunc(ctx, ctx.env.funcs["entry"]);
  await ctx.exe(
    "print-line",
    Machine.stack.length ? [val2extVal(Machine.stack[0])] : []
  );
  Machine.stack = [];
  return errors;
}

Test.perform();
