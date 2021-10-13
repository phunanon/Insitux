import { len, slice, splice } from "./poly-fills";
import { assertUnreachable, Dict, Func, InvokeError, Val } from "./types";

export const num = ({ v }: Val) => v as number;
export const str = ({ v }: Val) => v as string;
export const vec = ({ v }: Val) => v as Val[];
export const dic = ({ v }: Val) => v as Dict;

export const isVecEqual = (a: Val[], b: Val[]): boolean =>
  len(a) === len(b) && !a.some((x, i) => !isEqual(x, b[i]));

export const isEqual = (a: Val, b: Val) => {
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
  }
  return assertUnreachable(a);
};

export const stringify = (vals: Val[]) =>
  vals.reduce((cat, v) => cat + val2str(v), "");

export const val2str = (val: Val): string => {
  const quoted = (v: Val) => (v.t === "str" ? `"${v.v}"` : val2str(v));
  if (val.t === "clo") {
    return `#${val.v.name}`;
  } else if (val.t === "vec") {
    return `[${val.v.map(quoted).join(" ")}]`;
  } else if (val.t === "dict") {
    const { keys, vals } = val.v;
    const [ks, vs] = [keys.map(quoted), vals.map(quoted)];
    const entries = ks.map((k, i) => `${k} ${vs[i]}`);
    return `{${entries.join(", ")}}`;
  } else if (val.t === "null") {
    return "null";
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
