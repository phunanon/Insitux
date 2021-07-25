import { Test } from "./test";
import { Parse, ops } from "./parse";

const val2extVal = ({ v, t }: Val): ExternalValue => {
  switch (t) {
    case "bool":
      return v as boolean;
    case "num":
      return v as number;
    case "str":
      return v as string;
    case "func":
      return (<Func>v).name;
  }
  return null;
};

namespace Machine {
  export let stack: Val[] = [];
  const boo = (b: boolean) => stack.push({ t: "bool", v: b });
  const num = (n: number) => stack.push({ t: "num", v: n });
  const str = (s: string) => stack.push({ t: "str", v: s });
  const nul = () => stack.push({ t: "null", v: null });

  async function exeOp(
    op: string,
    args: Val[],
    ctx: Ctx,
    line: number,
    col: number
  ): Promise<InvokeError[]> {
    switch (op) {
      case "execute-last":
        {
          await exeOp(args.pop()!.v as string, args, ctx, line, col);
        }
        break;
      case "+":
      case "-":
        {
          const nAn = args.find(a => a.t != "num");
          if (nAn) {
            return [["Type Error", `"${nAn.v}" is not a number`, line, col]];
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
          num(args.map(({ v }) => <number>v).reduce((sum, n) => f(sum, n)));
        }
        break;
      case "print-line":
        {
          ctx.exe(op, [args.reduce((cat, { v }) => cat + `${v}`, "")]);
          nul();
        }
        break;
    }
    return [];
  }

  export async function exeFunc(ctx: Ctx, func: Func): Promise<InvokeError[]> {
    for (let i = 0; i < func.ins.length; ++i) {
      const { type, value, line, col } = func.ins[i];
      switch (type) {
        case "boo":
          boo(value as boolean);
          break;
        case "num":
          num(value as number);
          break;
        case "str":
          str(value as string);
          break;
        case "var":
          if (ops.includes(value)) {
            str(value as string);
          }
          break;
        case "op":
          const [op, nArgs]: [string, number] = value;
          const args = stack.splice(stack.length - nArgs, nArgs);
          if (args.length != nArgs) {
            return [["Unexpected Error", `${op} stack depleted`, line, col]];
          }
          await exeOp(op, args, ctx, line, col);
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
  await Machine.exeFunc(ctx, ctx.env.funcs["entry"]);
  await ctx.exe("print-line", Machine.stack.length ? [val2extVal(Machine.stack[0])] : []);
  Machine.stack = [];
  return [];
}

Test.perform();
