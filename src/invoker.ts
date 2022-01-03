import { invoke } from ".";
import { padEnd, slen, starts, substr, trimStart } from "./poly-fills";
import { getTimeMs } from "./poly-fills";
import { Ctx } from "./types";

export type InvokeOutput = {
  type: "message" | "error";
  text: string;
}[];

const invocations = new Map<string, string>();
export const parensRx = /[\[\]\(\) ,]/;

export function invoker(ctx: Ctx, code: string, id?: string): InvokeOutput {
  id = id ? `-${id}` : `${getTimeMs()}`;
  invocations.set(id, code);
  const valOrErrs = invoke(ctx, code, id, true);
  if (valOrErrs.kind !== "errors") {
    return [];
  }
  let out: InvokeOutput = [];
  const msg = (text: string) => out.push({ type: "message", text });
  const err = (text: string) => out.push({ type: "error", text });
  valOrErrs.errors.forEach(({ e, m, errCtx: { line, col, invokeId } }) => {
    const invocation = invocations.get(invokeId);
    if (!invocation) {
      msg(`${e} Error: ${invokeId} line ${line} col ${col}: ${m}\n`);
      return;
    }
    const lineText = invocation.split("\n")[line - 1];
    const sym = substr(lineText, col - 1).split(parensRx)[0];
    const half1 = trimStart(substr(lineText, 0, col - 1));
    const id = starts(invokeId, "-") ? `${substr(invokeId, 1)} ` : "";
    msg(`${id}${padEnd(`${line}`, 4)} ${half1}`);
    if (!sym) {
      const half2 = substr(lineText, col);
      err(lineText[col - 1]);
      msg(`${half2}\n`);
    } else {
      const half2 = substr(lineText, col - 1 + slen(sym));
      err(sym);
      msg(`${half2}\n`);
    }
    msg(`${e} Error: ${m}.\n`);
  });
  return out;
}
