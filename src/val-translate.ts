import { Val } from "./types";
import { _nul, val2str } from "./val";

/** Incomplete. */
export function jsToIx(
  v: unknown,
  ifUndetermined = (x: unknown) => <Val>{ t: "str", v: `${x}` },
): Val {
  if (typeof v === "string") {
    return { t: "str", v };
  }
  if (typeof v === "number") {
    return { t: "num", v };
  }
  if (v === true || v === false) {
    return { t: "bool", v };
  }
  if (v === null) {
    return { t: "null", v: undefined };
  }
  const mapper = (v: unknown[]) => v.map(x => jsToIx(x, ifUndetermined));
  if (Array.isArray(v)) {
    return { t: "vec", v: mapper(v) };
  }
  if (typeof v === "object") {
    return {
      t: "dict",
      v: { keys: mapper(Object.keys(v)), vals: mapper(Object.values(v)) },
    };
  }
  return ifUndetermined(v);
}

/** Incomplete. */
export function ixToJs(
  v: Val,
  ifUndetermined = (x: Val) => x.v,
):
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]
  | unknown {
  if (v.t === "str" || v.t === "num" || v.t === "bool" || v.t === "key") {
    return v.v;
  }
  if (v.t === "vec") {
    return v.v.map(x => ixToJs(x, ifUndetermined));
  }
  if (v.t === "null") {
    return null;
  }
  if (v.t === "dict") {
    const keys = v.v.keys.map(x => val2str(x));
    const vals = v.v.vals.map(x => ixToJs(x, ifUndetermined));
    const obj: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      obj[k] = vals[i];
    });
    return obj;
  }
  if (v.t === "ext") {
    return v.v;
  }
  return ifUndetermined(v);
}

export const jsonToIx = (x: string) => {
  try {
    return jsToIx(JSON.parse(x));
  } catch (e) {
    return _nul();
  }
};
export const ixToJson = (x: Val) => JSON.stringify(ixToJs(x));
