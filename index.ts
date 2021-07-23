import { Test } from "./test";
import { Parse } from "./parse";

const val2extVal = ({ v, t }: Val): ExternalValue => {
  switch (t) {
    case "bool":
      return v as boolean;
    case "num":
      return v as number;
    case "func":
      return (<Func>v).name;
  }
  return null;
};

async function exeFunc(stack: Val[], ctx: Ctx, func: Func): Promise<InvokeError[]> {
  const pushNum = (n: number) => stack.push({ t: "num", v: n });
  const pushStr = (n: string) => stack.push({ t: "str", v: n });
  const pushNull = () => stack.push({ t: "null", v: null });
  for (let i = 0; i < func.ins.length; ++i) {
    const { type, value, line, col } = func.ins[i];
    switch (type) {
      case "num":
        pushNum(value as number);
        break;
      case "str":
        pushStr(value as string);
        break;
      case "op":
        const [op, nArgs]: [string, number] = value;
        switch (op) {
          case "+":
            {
              const args = stack.splice(stack.length - nArgs, nArgs);
              if (args.length != nArgs) {
                return [["Unexpected Error", "+ stack depleted", line, col]];
              }
              const nAn = args.find(a => a.t != "num");
              if (nAn) {
                return [["Type Error", `"${nAn.v}" is not a number`, line, col]];
              }
              let sum = args.reduce((sum, { v }) => sum + <number>v, 0);
              pushNum(sum);
            }
            break;
          case "print-line":
            {
              const args = stack.splice(stack.length - nArgs, nArgs).map(v => `${v.v}`);
              if (args.length != nArgs) {
                return [["Unexpected Error", "+ stack depleted", line, col]];
              }
              ctx.exe(op, [args.reduce((cat, str) => cat + str, "")]);
              pushNull();
            }
            break;
        }
        break;
    }
  }
  return [];
}

export async function invoke(ctx: Ctx, code: string): Promise<InvokeError[]> {
  ctx.env = { ...ctx.env, ...Parse.parse(code) };
  console.dir(ctx.env, { depth: 10 });
  const stack: Val[] = [];
  await exeFunc(stack, ctx, ctx.env.funcs["entry"]);
  await ctx.exe("print-line", stack.length ? [val2extVal(stack[0])] : []);
  return [];
}

Test.perform();
