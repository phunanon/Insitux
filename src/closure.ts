import { has, len, push, slice } from "./poly-fills";
import { Closure, Func, Ins, Val } from "./types";

/** Declare a closure from instructions and other info, calculating its
 * captures ahead-of-time. Skips sub-closures as the parser builds them
 * bottom-up. */
export function makeClosure(
  name: string,
  params: string[],
  cins: Ins[],
): Closure {
  const captures: boolean[] = [];
  const derefs: Ins[] = [];
  const exclusions: string[] = params;
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    let capture = false;
    if (cin.typ === "clo") {
      //Skip sub-closures as they have already calculated their captures
      i += cin.value.length;
      continue;
    } else if (cin.typ === "let" || cin.typ === "var") {
      exclusions.push(cin.value);
    } else if (canCapture(exclusions, cin, i + 1 !== lim && cins[i + 1])) {
      derefs.push(cin);
      capture = true;
    }
    captures.push(capture);
  }
  return { name, length: len(cins), captures, derefs };
}

/** Create a function representing a parent closure, and its sub-closures with
 * all values needing captured at this point having been replaced. */
export function makeEnclosure(
  { name, length, captures, derefs }: Closure,
  cins: Ins[],
  derefed: Val[],
): Func {
  const ins: Ins[] = [];
  const errCtxs = derefs.map(i => i.errCtx);
  for (let i = 0, ci = 0; i < length; ++i) {
    const cin = cins[i];
    if (cin.typ === "clo") {
      push(ins, slice(cins, i, i + 1 + cin.value.length));
      i += cin.value.length;
    } else if (captures[ci++]) {
      ins.push({
        typ: "val",
        value: derefed.shift()!,
        errCtx: errCtxs.shift()!,
      });
    } else {
      ins.push(cin);
    }
  }
  return { name, ins };
}

/** Tests whether an Instruction in a particular context can be captured.
 * Doesn't attempt to rewrite str Vals because they are mapped and captured
 * (or not) within the let/var Ctx in the machine. */
function canCapture(exclusions: string[], ins0: Ins, ins1: false | Ins) {
  const isExeVal =
    ins1 && ins0.typ === "val" && ins0.value.t === "str" && ins1.typ === "exe";
  return (
    isExeVal ||
    (ins0.typ === "npa" && !has(exclusions, ins0.text)) ||
    (ins0.typ === "ref" && !has(exclusions, ins0.value))
  );
}
