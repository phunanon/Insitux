import { has, len, push } from "./poly-fills";
import { Closure, Func, Ins, Val } from "./types";

/** Declare a closure from instructions and other info, calculating its
 * captures (including sub-closure captures) ahead-of-time. */
export function makeClosure(
  name: string,
  params: string[],
  cins: Ins[],
): Closure {
  const exclusions: string[] = params;
  cins.forEach(i => {
    if (i.typ === "let" || i.typ === "var") {
      exclusions.push(i.value);
    }
  });
  const closure: Closure = { name, cins, exclusions, derefIns: [] };
  populateDereferences(closure);
  return closure;
}

/** Create a function representing a parent closure and its sub-closures with
 * all values needing captured at this point having been replaced.
 * The parent closure's parameters are passed down to ensure its parameters
 * aren't treated as external captures; its declarations will also be excluded
 * at the first level. All these will be captured by subsequent enclosures. */
export function makeEnclosure(
  closure: Closure,
  derefed: Val[],
  exclusions: string[] = closure.exclusions,
): Func {
  const { name, cins } = closure;
  const ins: Ins[] = [];
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    if (cin.typ === "clo") {
      //Partially enclose this closure only with values captured at this level
      const closure: Closure = {
        name: cin.value.name,
        derefIns: cin.value.derefIns,
        exclusions: cin.value.exclusions,
        cins: makeEnclosure(cin.value, derefed, exclusions).ins,
      };
      ins.push(<Ins>{ typ: "clo", value: closure });
    } else if (canCapture(exclusions, cin, i + 1 !== lim && cins[i + 1])) {
      ins.push(<Ins>{ typ: "val", value: derefed.shift() });
    } else {
      ins.push(cin);
    }
  }
  return { name, ins };
}

/** Populate a closure with a list of Instructions used upon enclosing
 * (i.e. capturing all references/parameters needing so at the time).
 * Sub-closures' non-excluded dereferences are appended to a parent's
 * dereferences, so also captured and replaced upon the parent's enclosing. */
function populateDereferences({ cins, derefIns, exclusions }: Closure) {
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    if (cin.typ === "clo") {
      //Don't capture the parameters of a fn closure, nor any decls
      const subDerefs = cin.value.derefIns.filter(
        di =>
          !(di.typ === "npa" && has(exclusions, di.text)) &&
          !(di.typ === "ref" && has(exclusions, di.value)),
      );
      //Ensure to capture sub-closures' captures not satisfied by their parents
      push(derefIns, subDerefs);
    } else if (canCapture(exclusions, cin, i + 1 !== lim && cins[i + 1])) {
      derefIns.push(cin);
    }
  }
}

/** Tests whether an Instruction in a particular context can be captured.
 * Used deterministically in both creating a closure and its enclosing.
 * Doesn't attempt to rewrite str Vals because they are mapped and captured
 * (or not) within the let/var Ctx. */
function canCapture(exclusions: string[], ins0: Ins, ins1: false | Ins) {
  const isExeVal =
    ins1 && ins0.typ === "val" && ins0.value.t === "str" && ins1.typ === "exe";
  return (
    isExeVal ||
    (ins0.typ === "npa" && !has(exclusions, ins0.text)) ||
    (ins0.typ === "ref" && !has(exclusions, ins0.value))
  );
}
