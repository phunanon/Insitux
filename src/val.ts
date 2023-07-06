import { Dict, Func, InvokeError, isDic, tagged, Types, Val } from "./types";
import { assertUnreachable } from "./types";

export const isNum = (x: unknown): x is number =>
  x !== "" && !Number.isNaN(Number(x));

export const _key = (v: string) => <Val>{ t: "key", v };
export const _nul = () => <Val>{ t: "null", v: undefined };
export const _fun = (v: string) => <Val>{ t: "func", v };
export const _clo = (f: Func) => {
  (<Val & { t: Types }>f).t = "clo";
  return <Val>f;
};

export const valType = (v: Val): Types => {
  if (Array.isArray(v)) {
    return "vec";
  } else if (typeof v === "string") {
    return "str";
  } else if (typeof v === "boolean") {
    return "bool";
  } else if (typeof v === "number") {
    return "num";
  } else if (isDic(v)) {
    return "dict";
  } else if (tagged(v)) {
    return v.t;
  }
  return assertUnreachable(v);
};

export const isVecEqual = (a: Val[], b: Val[]): boolean =>
  a.length === b.length && !a.some((x, i) => !isEqual(x, b[i]));

export const isEqual = (a: Val, b: Val) => {
  if (typeof a !== typeof b) {
    return false;
  }
  if (tagged(a) !== tagged(b)) {
    return false;
  }
  if (tagged(a) && tagged(b) && a.t !== b.t) {
    return false;
  }
  if (
    typeof a === "boolean" ||
    typeof a === "number" ||
    typeof a === "string"
  ) {
    return a === b;
  }
  if (Array.isArray(a)) {
    return isVecEqual(a, <Val[]>b);
  }
  if (isDic(a)) {
    const bd = <Dict>b;
    if (a.keys.length !== bd.keys.length) {
      return false;
    }
    //FIXME: needs to be proper equality, even though expensive
    return a.keys.length === bd.keys.length && isVecEqual(a.keys, bd.keys);
  }
  if ("v" in a) {
    if (a.t === "ext") {
      return a === b;
    }
    return a.v === (<{ v: string }>b).v;
  }
  if (a.t === "null" || a.t === "wild") {
    return true;
  }
  if (a.t === "clo") {
    return a.name === (<Func>b).name;
  }
  return assertUnreachable(a);
};

export const stringify = (vals: Val[]) => {
  let str = "";
  vals.forEach(v => {
    str += val2str(v);
  });
  return str;
};

const quoteStr = (str: string) =>
  str
    .split("")
    .map(ch => (ch === '"' ? '\\"' : ch))
    .join("");

export const val2str = (val: Val): string => {
  const quoted = (v: Val) =>
    typeof v === "string" ? `"${quoteStr(v)}"` : val2str(v);
  if (tagged(val)) {
    if (val.t === "null") {
      return "null";
    } else if (val.t === "wild") {
      return "_";
    } else if (val.t === "clo") {
      return val.name ?? "";
    }
  } else if (Array.isArray(val)) {
    return `[${val.map(quoted).join(" ")}]`;
  } else if (isDic(val)) {
    const { keys, vals } = val;
    const [ks, vs] = [keys.map(quoted), vals.map(quoted)];
    const entries = ks.map((k, i) => `${k} ${vs[i]}`);
    return `{${entries.join(", ")}}`;
  }
  return `${val}`;
};

export const asArray = (val: Val): Val[] =>
  Array.isArray(val) || typeof val === "string"
    ? [...val]
    : typeof val === "object" && "v" in val && typeof val.v === "string"
    ? [...val.v]
    : isDic(val)
    ? val.keys.map((k, i) => [k, val.vals[i]])
    : [];

export const toDict = (args: Val[]): Val => {
  if (args.length === 1 && Array.isArray(args[0])) {
    args = args[0].flatMap(a => (Array.isArray(a) ? a : [a]));
  }
  if (args.length % 2 === 1) {
    args.pop();
  }
  const keys = args.filter((_, i) => i % 2 === 0);
  const vals = args.filter((_, i) => i % 2 === 1);
  const ddKeys: Val[] = [],
    ddVals: Val[] = [];
  keys.forEach((key, i) => {
    const existingIdx = ddKeys.findIndex(k => isEqual(k, key));
    if (existingIdx === -1) {
      ddKeys.push(key);
      ddVals.push(vals[i]);
    } else {
      ddVals[existingIdx] = vals[i];
    }
  });
  return { keys: ddKeys, vals: ddVals };
};

export const dictGet = ({ keys, vals }: Dict, key: Val) => {
  const idx = keys.findIndex(k => isEqual(k, key));
  return idx === -1 ? <Val>{ t: "null", v: undefined } : vals[idx];
};

export const dictSet = ({ keys, vals }: Dict, key: Val, val: Val) => {
  const [nKeys, nVals] = [[...keys], [...vals]];
  const idx = keys.findIndex(k => isEqual(k, key));
  if (idx !== -1) {
    nVals[idx] = val;
  } else {
    nKeys.push(key);
    nVals.push(val);
  }
  return <Dict>{ keys: nKeys, vals: nVals };
};

export const dictDrop = ({ keys, vals }: Dict, key: Val): Dict => {
  const [nKeys, nVals] = [[...keys], [...vals]];
  const idx = keys.findIndex(k => isEqual(k, key));
  if (idx !== -1) {
    nKeys.splice(idx, 1);
    nVals.splice(idx, 1);
  }
  return { keys: nKeys, vals: nVals };
};

export const dictDrops = ({ keys, vals }: Dict, drop: Val[]): Dict => {
  const [nKeys, nVals] = [[...keys], [...vals]];
  drop.forEach(key => {
    const idx = nKeys.findIndex(k => isEqual(k, key));
    if (idx !== -1) {
      nKeys.splice(idx, 1);
      nVals.splice(idx, 1);
    }
  });
  return { keys: nKeys, vals: nVals };
};

export function errorsToDict(errors: InvokeError[]) {
  const newKey = (d: Dict, k: string, v: Val) => dictSet(d, _key(k), v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", e);
    dict = newKey(dict, ":m", m);
    dict = newKey(dict, ":line", errCtx.line);
    dict = newKey(dict, ":col", errCtx.col);
    return dict;
  });
}

/** Replaces or sets index or key/value with another value in a string or
 * dictionary */
export function pathSet(
  path: Val[],
  replacer: (v: Val) => Val,
  coll: Val,
): Val {
  //If we're at the end of the path or it's a non-number index for non-dict
  if (!path.length || !isDic(coll)) {
    return coll;
  }
  if (Array.isArray(coll)) {
    if (typeof path[0] !== "number" || path[0] > coll.length) {
      return coll;
    }
    const vecCopy = [...coll];
    let idx = path[0];
    if (idx < 0) idx = Math.max(vecCopy.length + idx, 0);
    if (path.length === 1) {
      vecCopy[idx] = replacer(vecCopy[idx]);
      return vecCopy;
    }
    vecCopy[idx] = pathSet(path.slice(1), replacer, vecCopy[idx]);
    return vecCopy;
  }
  if (path.length === 1) {
    const existing = dictGet(coll, path[0]);
    return dictSet(coll, path[0], replacer(existing));
  }
  return dictSet(
    coll,
    path[0],
    pathSet(path.slice(1), replacer, dictGet(coll, path[0])),
  );
}

/** Incomplete. */
export function jsToIx(
  v: unknown,
  ifUndetermined = (x: unknown) => `${x}`,
): Val {
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (v === null) {
    return { t: "null" };
  }
  const mapper = (v: unknown[]) => v.map(x => jsToIx(x, ifUndetermined));
  if (Array.isArray(v)) {
    return mapper(v);
  }
  if (typeof v === "object") {
    return <Dict>{
      keys: mapper(Object.keys(v)),
      vals: mapper(Object.values(v)),
    };
  }
  return ifUndetermined(v);
}

/** Incomplete. */
export function ixToJs(
  v: Val,
  ifUndetermined = (x: Val) => x,
):
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]
  | unknown {
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(x => ixToJs(x, ifUndetermined));
  }
  if (isDic(v)) {
    const keys = v.keys.map(x => val2str(x));
    const vals = v.vals.map(x => ixToJs(x, ifUndetermined));
    const obj: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      obj[k] = vals[i];
    });
    return obj;
  }
  if (v.t === "null") {
    return null;
  }
  if (v.t === "ext") {
    return v.v;
  }
  return ifUndetermined(v);
}
