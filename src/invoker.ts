import { invoke } from ".";
import { getTimeMs, padEnd, substr, trimStart } from "./poly-fills";
import { Ctx } from "./types";

export type ErrorOutput = {
  type: "message" | "error";
  text: string;
}[];

const invocations = new Map<string, string>();
export const parensRx = /[\[\]\(\) ]/;

export async function invoker(ctx: Ctx, code: string): Promise<ErrorOutput> {
  const uuid = getTimeMs().toString();
  invocations.set(uuid, code);
  const errors = await invoke(ctx, code, uuid, true);
  let out: ErrorOutput = [];
  errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
    const lineText = invocations.get(invocationId)!.split("\n")[line - 1];
    const sym = substr(lineText, col - 1).split(parensRx)[0];
    const half1 = trimStart(substr(lineText, 0, col - 1));
    out.push({ type: "message", text: padEnd(`${line}`, 4) + half1 });
    if (!sym) {
      const half2 = substr(lineText, col);
      out.push({ type: "error", text: lineText[col - 1] });
      out.push({ type: "message", text: `${half2}\n` });
    } else {
      const half2 = substr(lineText, col - 1 + sym.length);
      out.push({ type: "error", text: sym });
      out.push({ type: "message", text: `${half2}\n` });
    }
    out.push({ type: "message", text: `${e} Error: ${m}.\n` });
  });
  return out;
}