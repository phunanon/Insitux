import { has, len, push } from "./poly-fills";
import { Closure, Func, Ins, Val } from "./types";

export function enclose(name: string, cins: Ins[]): Closure {
  const declarations: string[] = [];
  cins.forEach(i => {
    if (i.typ === "let" || i.typ === "var") {
      declarations.push(i.value);
    }
  });
  const closure: Closure = { name, cins, declarations, derefIns: [] };
  makeDerefFunc(closure);
  return closure;
}

export function capture(
  { name, cins, declarations }: Closure,
  derefed: Val[],
): Func {
  const ins: Ins[] = [];
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    if (cin.typ === "clo") {
      const closure: Closure = {
        name: cin.value.name,
        derefIns: cin.value.derefIns,
        declarations: cin.value.declarations,
        cins: capture(cin.value, derefed).ins,
      };
      ins.push(<Ins>{ typ: "clo", value: closure });
    } else if (canCapture(declarations, cin, i + 1 !== lim && cins[i + 1])) {
      ins.push(<Ins>{ typ: "val", value: derefed.shift() });
    } else {
      ins.push(cin);
    }
  }
  return { name, ins };
}

function makeDerefFunc({ cins, derefIns, declarations }: Closure) {
  for (let i = 0, lim = len(cins); i < lim; ++i) {
    const cin = cins[i];
    if (cin.typ === "clo") {
      makeDerefFunc(cin.value);
      push(derefIns, cin.value.derefIns);
    } else if (canCapture(declarations, cin, i + 1 !== lim && cins[i + 1])) {
      derefIns.push(cin);
    }
  }
}

function canCapture(declarations: string[], cin: Ins, next: false | Ins) {
  const isExeVal =
    next && cin.typ === "val" && cin.value.t === "str" && next.typ === "exe";
  return (
    isExeVal ||
    cin.typ === "npa" ||
    (cin.typ === "ref" && !has(declarations, cin.value))
  );
}
