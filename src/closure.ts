import { has, len, push } from "./poly-fills";
import { Closure, Func, Ins, Val } from "./types";

/** Declare a closure from instructions and other info, calculating its
 * captures ahead-of-time. */
export function makeClosure(
  name: string,
  outerParams: string[],
  cloParams: string[],
  cins: Ins[],
): Closure {
  const exclusions: string[] = cloParams;
  //First scan for any let/var declarations to be excluded throughout
  for (const cin of cins) {
    if (cin.typ === "let" || cin.typ === "var") {
      exclusions.push(cin.value);
    } else if (cin.typ === "dle" || cin.typ === "dva") {
      const names = cin.value.map(ps => ps.name);
      push(exclusions, names);
    }
  }
  //Calculate captures and derefs
  const captures: boolean[] = [];
  const derefs: Ins[] = [];
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    let capture = false;
    if (cin.typ === "clo") {
      //Inherit direct sub-closures' outer-parameter captures
      captures.push(false);
      const newSubDerefs: Ins[] = [];
      const newSubCaptures: boolean[] = [];
      for (let j = 0, d = 0; j < cin.value.length; ++j) {
        const ccin = cins[i + 1 + j];
        const capture = ccin.typ === "npa" && has(outerParams, ccin.text);
        captures.push(capture);
        newSubCaptures.push(!capture && cin.value.captures[j]);
        if (capture) {
          derefs.push(cin.value.derefs[d++]);
        } else if (cin.value.captures[j]) {
          newSubDerefs.push(cin.value.derefs[d++]);
        }
      }
      cin.value.derefs = newSubDerefs;
      cin.value.captures = newSubCaptures;
      i += cin.value.length;
      continue;
    } else if (cin.typ === "let" || cin.typ === "var") {
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
  if (!len(derefed)) {
    return { name, ins: cins };
  }
  const ins: Ins[] = [];
  const errCtxs = derefs.map(i => i.errCtx);
  for (let i = 0; i < length; ++i) {
    if (captures[i]) {
      ins.push({
        typ: "val",
        value: derefed.shift()!,
        errCtx: errCtxs.shift()!,
      });
    } else {
      ins.push(cins[i]);
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
    ((ins0.typ === "npa" || ins0.typ === "dpa") &&
      !has(exclusions, ins0.text)) ||
    (ins0.typ === "ref" && !has(exclusions, ins0.value))
  );
}
