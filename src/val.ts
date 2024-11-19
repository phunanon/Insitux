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
  a.length === b.length && !a.some((x, i) => !isEqual(x, b[i]));

export const isEqual = (a: Val, b: Val, wildcardByVal = true) => {
  if (wildcardByVal && (a.t === "wild" || b.t === "wild")) {
    return true;
  }
  if (a.t !== b.t) {
    return false;
  }
  switch (a.t) {
    case "null":
      return true;
    case "bool":
    case "num":
    case "unm":
      return a.v === b.v;
    case "vec":
      return isVecEqual(a.v, vec(b));
    case "dict": {
      const bd = dic(b);
      if (a.v.keys.length !== bd.keys.length) {
        return false;
      }
      //Match keys in any order
      const aks = [...a.v.keys];
      const avs = [...a.v.vals];
      for (let k = 0, kmax = bd.keys.length; k < kmax; ++k) {
        const bk = bd.keys[k];
        const idx = aks.findIndex(x => isEqual(bk, x, false));
        if (idx === -1 || !isEqual(avs[idx], bd.vals[k])) {
          return false;
        }
        aks.splice(idx, 1);
        avs.splice(idx, 1);
      }
      return true;
    }
    case "str":
    case "key":
    case "func":
      return str(a) === str(b);
    case "clo":
      return a.v.name === (<Func>b.v).name;
    case "ext":
      return a.v === b.v;
    case "wild":
      return b.t === "wild";
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
    ? [...val.v]
    : val.t === "str"
    ? [...val.v].map(s => ({ t: "str", v: s }))
    : val.t === "dict"
    ? val.v.keys.map((k, i) => ({
        t: "vec",
        v: [k, val.v.vals[i]],
      }))
    : [];

export const toDict = (args: Val[]): Val => {
  if (args.length === 1 && args[0].t === "vec") {
    const [{ v }] = args;
    args = v.flatMap(a => (a.t === "vec" ? a.v : [a]));
  }
  if (args.length % 2 === 1) {
    args.pop();
  }
  const keys = args.filter((_, i) => i % 2 === 0);
  const vals = args.filter((_, i) => i % 2 === 1);
  const ddKeys: Val[] = [],
    ddVals: Val[] = [];
  let hasWildcardKey = false;
  keys.forEach((key, i) => {
    if (key.t === "wild") {
      if (!hasWildcardKey) {
        hasWildcardKey = true;
        ddKeys.push(key);
        ddVals.push(vals[i]);
      }
      return;
    }
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

export const dictGet = ({ keys, vals }: Dict, key: Val): Val => {
  let idx = keys.findIndex(k => isEqual(k, key, false));
  //Wildcard keys act as default value
  if (idx === -1 && key.t !== "wild") {
    idx = keys.findIndex(k => k.t === "wild");
  }
  return idx === -1 ? { t: "null", v: undefined } : vals[idx];
};

export const dictSet = ({ keys, vals }: Dict, key: Val, val: Val) => {
  const [nKeys, nVals] = [[...keys], [...vals]];
  const idx = keys.findIndex(k => isEqual(k, key, false));
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
  const idx = keys.findIndex(k => isEqual(k, key, false));
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
    !path.length ||
    (coll.t !== "vec" && coll.t !== "dict") ||
    (coll.t === "vec" && (path[0].t !== "num" || path[0].v > coll.v.length))
  ) {
    return coll;
  }
  if (coll.t === "vec") {
    const vecCopy = [...coll.v];
    let idx = num(path[0]);
    if (idx < 0) idx = Math.max(vecCopy.length + idx, 0);
    if (path.length === 1) {
      vecCopy[idx] = replacer(vecCopy[idx]);
      return { t: "vec", v: vecCopy };
    }
    vecCopy[idx] = pathSet(path.slice(1), replacer, vecCopy[idx]);
    return { t: "vec", v: vecCopy };
  }
  if (path.length === 1) {
    const existing = dictGet(coll.v, path[0]);
    return { t: "dict", v: dictSet(coll.v, path[0], replacer(existing)) };
  }
  return {
    t: "dict",
    v: dictSet(
      coll.v,
      path[0],
      pathSet(path.slice(1), replacer, dictGet(coll.v, path[0])),
    ),
  };
}
