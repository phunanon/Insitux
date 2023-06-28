import { invoke, invokeFunction, invokeVal } from ".";
import { padEnd, slen, starts, substr, trimStart } from "./poly-fills";
import { getTimeMs } from "./poly-fills";
import { Ctx, ErrCtx, InvokeResult, Val } from "./types";

export type InvokeOutput = {
  type: "message" | "error";
  text: string;
}[];

const invocations = new Map<string, string>();
export const parensRx = /[\[\]\(\) ,]/;

export function invoker(
  ctx: Ctx,
  code: string,
  id?: string,
  printResult = true,
): { output: InvokeOutput; result: InvokeResult } {
  id = id ? `-${id}` : `${getTimeMs()}`;
  invocations.set(id, code);
  const result = invoke(ctx, code, id, printResult);
  return { output: invokeResultToOutput(result), result };
}

export function functionInvoker(
  ctx: Ctx,
  name: string,
  params: Val[],
  printResult = true,
): { output: InvokeOutput; result?: InvokeResult } {
  const result = invokeFunction(ctx, name, params, printResult);
  if (!result) {
    const message = <InvokeOutput[0]>{
      type: "message",
      text: `Invoke Error: function '${name}' not found.`,
    };
    return { output: [message] };
  }
  return { output: invokeResultToOutput(result), result };
}

export function valueInvoker(
  ctx: Ctx,
  errCtx: ErrCtx,
  val: Val,
  params: Val[],
): { output: InvokeOutput; result: InvokeResult } {
  const result = invokeVal(ctx, errCtx, val, params);
  return { output: invokeResultToOutput(result), result };
}

function invokeResultToOutput(result: InvokeResult) {
  if (!("kind" in result) || result.kind !== "errors") {
    return [];
  }
  let out: InvokeOutput = [];
  const msg = (text: string) => out.push({ type: "message", text });
  const err = (text: string) => out.push({ type: "error", text });
  result.errors.forEach(({ e, m, errCtx: { line, col, invokeId } }) => {
    const invocation = invocations.get(invokeId);
    if (!invocation) {
      msg(`${e} Error: ${invokeId} line ${line} col ${col}: ${m}\n`);
      return;
    }
    const lineText = invocation.split("\n")[line - 1];
    const sym = substr(lineText, col - 1).split(parensRx)[0];
    const half1 = trimStart(substr(lineText, 0, col - 1));
    const path = starts(invokeId, "-") ? `In ${substr(invokeId, 1)}\n` : "";
    msg(`\n${padEnd(`${line}:${col}`, 7)} ${half1}`);
    if (!sym) {
      const half2 = substr(lineText, col);
      err(lineText[col - 1] ?? "");
      msg(`${half2}\n`);
    } else {
      const half2 = substr(lineText, col - 1 + slen(sym));
      err(sym);
      msg(`${half2}\n`);
    }
    msg(`${e} Error: ${m}.\n${path}`);
  });
  return out;
}
