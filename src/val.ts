import { len, slice, splice } from "./poly-fills";
import { assertUnreachable, Dict, Func, InvokeError, Val } from "./types";

export const num = ({ v }: Val) => v as number;
export const str = ({ v }: Val) => v as string;
export const vec = ({ v }: Val) => v as Val[];
export const dic = ({ v }: Val) => v as Dict;

export const _boo = (v: boolean) => <Val>{ t: "bool", v };
export const _num = (v: number) => <Val>{ t: "num", v };
export const _str = (v = "") => <Val>{ t: "str", v };
export const _key = (v: string) => <Val>{ t: "key", v };
export const _vec = (v: Val[] = []) => <Val>{ t: "vec", v };
export const _dic = (v: Dict) => <Val>{ t: "dict", v };
export const _nul = () => <Val>{ t: "null", v: undefined };
export const _fun = (v: string) => <Val>{ t: "func", v };

export const isVecEqual = (a: Val[], b: Val[]): boolean =>
  len(a) === len(b) && !a.some((x, i) => !isEqual(x, b[i]));

export const isEqual = (a: Val, b: Val) => {
  if (a.t === "wild" || b.t === "wild") {
    return true;
  }
  if (a.t !== b.t) {
    return false;
  }
  switch (a.t) {
    case "null":
      return true;
    case "bool":
      return a.v === b.v;
    case "num":
      return a.v === b.v;
    case "vec":
      return isVecEqual(a.v, vec(b));
    case "dict": {
      const bd = dic(b);
      return len(a.v.keys) === len(bd.keys) && isVecEqual(a.v.keys, bd.keys);
    }
    case "str":
    case "ref":
    case "key":
    case "func":
      return str(a) === str(b);
    case "clo":
      return (<Func>a.v).name === (<Func>b.v).name;
    case "ext":
      return a.v === b.v;
  }
  return assertUnreachable(a);
};

export const stringify = (vals: Val[]) =>
  vals.reduce((cat, v) => cat + val2str(v), "");

const quoteStr = (str: string) =>
  str
    .split("")
    .map(ch => (ch === '"' ? '\\"' : ch))
    .join("");

export const val2str = (val: Val): string => {
  const quoted = (v: Val) =>
    v.t === "str" ? `"${quoteStr(v.v)}"` : val2str(v);
  if (val.t === "clo") {
    return val.v.name ?? "";
  } else if (val.t === "vec") {
    return `[${val.v.map(quoted).join(" ")}]`;
  } else if (val.t === "dict") {
    const { keys, vals } = val.v;
    const [ks, vs] = [keys.map(quoted), vals.map(quoted)];
    const entries = ks.map((k, i) => `${k} ${vs[i]}`);
    return `{${entries.join(", ")}}`;
  } else if (val.t === "null") {
    return "null";
  } else if (val.t === "wild") {
    return "_";
  }
  return `${val.v}`;
};

export const asArray = (val: Val): Val[] =>
  val.t === "vec"
    ? slice(val.v)
    : val.t === "str"
    ? [...val.v].map(s => ({ t: "str", v: s }))
    : val.t === "dict"
    ? val.v.keys.map((k, i) => ({
        t: "vec",
        v: [k, val.v.vals[i]],
      }))
    : [];

export const toDict = (args: Val[]): Val => {
  if (len(args) % 2 === 1) {
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
  return {
    t: "dict",
    v: { keys: ddKeys, vals: ddVals },
  };
};

export const dictGet = ({ keys, vals }: Dict, key: Val) => {
  const idx = keys.findIndex(k => isEqual(k, key));
  return idx === -1 ? <Val>{ t: "null", v: undefined } : vals[idx];
};

export const dictSet = ({ keys, vals }: Dict, key: Val, val: Val) => {
  const [nKeys, nVals] = [slice(keys), slice(vals)];
  const idx = keys.findIndex(k => isEqual(k, key));
  if (idx !== -1) {
    nVals[idx] = val;
  } else {
    nKeys.push(key);
    nVals.push(val);
  }
  return <Dict>{ keys: nKeys, vals: nVals };
};

export const dictDrop = ({ keys, vals }: Dict, key: Val) => {
  const [nKeys, nVals] = [slice(keys), slice(vals)];
  const idx = keys.findIndex(k => isEqual(k, key));
  if (idx !== -1) {
    splice(nKeys, idx, 1);
    splice(nVals, idx, 1);
  }
  return <Val>{ t: "dict", v: <Dict>{ keys: nKeys, vals: nVals } };
};

export function errorsToDict(errors: InvokeError[]) {
  const newKey = (d: Dict, k: string, v: Val) =>
    dictSet(d, { t: "key", v: k }, v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", { t: "str", v: e });
    dict = newKey(dict, ":m", { t: "str", v: m });
    dict = newKey(dict, ":line", { t: "num", v: errCtx.line });
    dict = newKey(dict, ":col", { t: "num", v: errCtx.col });
    return <Val>{ t: "dict", v: dict };
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
  if (
    !len(path) ||
    (coll.t !== "vec" && coll.t !== "dict") ||
    (coll.t === "vec" &&
      (path[0].t !== "num" || path[0].v < 0 || path[0].v > len(coll.v)))
  ) {
    return coll;
  }
  if (coll.t === "vec") {
    const vecCopy = slice(coll.v);
    const idx = num(path[0]);
    if (len(path) === 1) {
      vecCopy[idx] = replacer(vecCopy[idx]);
      return { t: "vec", v: vecCopy };
    }
    vecCopy[idx] = pathSet(slice(path, 1), replacer, vecCopy[idx]);
    return { t: "vec", v: vecCopy };
  }
  if (len(path) === 1) {
    const existing = dictGet(coll.v, path[0]);
    return { t: "dict", v: dictSet(coll.v, path[0], replacer(existing)) };
  }
  return {
    t: "dict",
    v: dictSet(
      coll.v,
      path[0],
      pathSet(slice(path, 1), replacer, dictGet(coll.v, path[0])),
    ),
  };
}

/** Incomplete. */
export function jsToIx(v: unknown): Val {
  if (typeof v === "string") {
    return { t: "str", v };
  }
  return { t: "str", v: `${v}` };
}
