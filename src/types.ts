export type Val =
  | { t: "vec"; v: Val[] }
  | { t: "str" | "func" | "key" | "ref"; v: string }
  | { t: "null"; v: undefined }
  | { t: "wild"; v: undefined }
  | { t: "bool"; v: boolean }
  | { t: "num"; v: number }
  | { t: "clo"; v: Func }
  | { t: "dict"; v: Dict };

export type ErrCtx = { sourceId: string; line: number; col: number };
export type InvokeError = { e: string; m: string; errCtx: ErrCtx };
export type ValOrErr =
  | { kind: "val"; value: Val }
  | { kind: "err"; err: string };
/**
 * @summary "empty" occurs when there was only function declaration;
 *          "val" occurs when there were no errors and there is a final value;
 *          "errors" occurs when there were any errors.
 */
export type InvokeResult =
  | { kind: "empty" }
  | { kind: "val"; value: Val }
  | { kind: "errors"; errors: InvokeError[] };

export type Dict = {
  keys: Val[];
  vals: Val[];
};

export type Func = {
  name: string;
  ins: Ins[];
};
export type Funcs = { [key: string]: Func };
export type Env = {
  funcs: Funcs;
  vars: { [key: string]: Val };
};

export type Ctx = {
  set: (key: string, val: Val) => string | undefined;
  get: (key: string) => ValOrErr;
  exe: (name: string, args: Val[]) => ValOrErr;
  env: Env;
  loopBudget: number;
  rangeBudget: number;
  callBudget: number;
  recurBudget: number;
};

export type Ins = { errCtx: ErrCtx } & (
  | { typ: "val"; value: Val }
  | { typ: "npa" | "upa"; value: number } //Named and Unnamed parameters
  | { typ: "var" | "let" | "ref"; value: string }
  | { typ: "exe"; value: number } //Execute last stack value, number of args
  | { typ: "exp"; value: number } //Marks the start of an expression as head for potential partial closures
  | { typ: "or" | "if" | "jmp" | "loo" | "cat" | "mat"; value: number } //Number of instructions
  | { typ: "ret"; value: boolean } //Return, with value?
  | { typ: "pop"; value: number } //Truncate stack, by number of values
  | { typ: "clo" | "par"; value: [string, Ins[]] } //Closure and partial, text representation and instructions
);

export const ops: {
  [name: string]: {
    minArity?: number;
    maxArity?: number;
    exactArity?: number;
    numeric?: true | "in only";
    types?: (Val["t"] | Val["t"][])[];
    returns?: Val["t"][];
  };
} = {
  print: { returns: ["null"] },
  "print-str": { returns: ["null"] },
  "!": { exactArity: 1, returns: ["bool"] },
  "=": { minArity: 2 },
  "!=": { minArity: 2 },
  "+": { minArity: 2, numeric: true },
  "-": { minArity: 1, numeric: true },
  "*": { minArity: 2, numeric: true },
  "/": { minArity: 2, numeric: true },
  "//": { minArity: 2, numeric: true },
  "**": { minArity: 1, maxArity: 2, numeric: true },
  "<": { minArity: 2, numeric: true },
  ">": { minArity: 2, numeric: true },
  "<=": { minArity: 2, numeric: true },
  ">=": { minArity: 2, numeric: true },
  "fast=": { exactArity: 2 },
  "fast!=": { exactArity: 2 },
  "fast+": { exactArity: 2, numeric: true },
  "fast-": { exactArity: 2, numeric: true },
  "fast*": { exactArity: 2, numeric: true },
  "fast/": { exactArity: 2, numeric: true },
  "fast//": { exactArity: 2, numeric: true },
  "fast<": { exactArity: 2, numeric: true },
  "fast>": { exactArity: 2, numeric: true },
  "fast<=": { exactArity: 2, numeric: true },
  "fast>=": { exactArity: 2, numeric: true },
  inc: { exactArity: 1, numeric: true },
  dec: { exactArity: 1, numeric: true },
  min: { minArity: 2, numeric: true },
  max: { minArity: 2, numeric: true },
  abs: { exactArity: 1, numeric: true },
  sqrt: { exactArity: 1, numeric: true },
  round: { minArity: 1, maxArity: 2, numeric: true },
  floor: { exactArity: 1, numeric: true },
  ceil: { exactArity: 1, numeric: true },
  logn: { exactArity: 1, numeric: true },
  log2: { exactArity: 1, numeric: true },
  log10: { exactArity: 1, numeric: true },
  and: { minArity: 1 },
  or: { minArity: 1 },
  xor: { exactArity: 2 },
  "&": { exactArity: 2, numeric: true },
  "|": { exactArity: 2, numeric: true },
  "^": { exactArity: 2, numeric: true },
  "~": { exactArity: 1, numeric: true },
  "<<": { exactArity: 2, numeric: true },
  ">>": { exactArity: 2, numeric: true },
  ">>>": { exactArity: 2, numeric: true },
  "odd?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "even?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "pos?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "neg?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "zero?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "null?": { exactArity: 1, returns: ["bool"] },
  "num?": { exactArity: 1, returns: ["bool"] },
  "bool?": { exactArity: 1, returns: ["bool"] },
  "str?": { exactArity: 1, returns: ["bool"] },
  "vec?": { exactArity: 1, returns: ["bool"] },
  "dict?": { exactArity: 1, returns: ["bool"] },
  "key?": { exactArity: 1, returns: ["bool"] },
  "func?": { exactArity: 1, returns: ["bool"] },
  "wild?": { exactArity: 1, returns: ["bool"] },
  rem: { minArity: 2, numeric: true },
  sin: { exactArity: 1, numeric: true },
  cos: { exactArity: 1, numeric: true },
  tan: { exactArity: 1, numeric: true },
  vec: { returns: ["vec"] },
  dict: { returns: ["dict"] },
  len: { exactArity: 1, types: [["str", "vec", "dict"]], returns: ["num"] },
  "to-num": {
    exactArity: 1,
    types: [["str", "num"]],
    returns: ["num", "null"],
  },
  "to-key": { exactArity: 1, types: [["str", "num"]], returns: ["key"] },
  "has?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  idx: { minArity: 2, maxArity: 3, types: [["str", "vec"]], returns: ["num"] },
  map: { minArity: 2, returns: ["vec"] },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3, types: [[], ["vec", "dict", "str"]] },
  filter: {
    minArity: 2,
    types: [[], ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  remove: {
    minArity: 2,
    types: [[], ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  find: { minArity: 2, types: [[], ["vec", "dict", "str"]] },
  count: { minArity: 2, types: [[], ["vec", "dict", "str"]], returns: ["num"] },
  repeat: { minArity: 2, types: [[], "num"] },
  str: { returns: ["str"] },
  rand: { maxArity: 2, numeric: true, returns: ["num"] },
  "rand-int": { maxArity: 2, numeric: true, returns: ["num"] },
  ".": { minArity: 1 },
  "..": { minArity: 2 },
  "...": { minArity: 2 },
  into: {
    exactArity: 2,
    types: [
      ["vec", "dict"],
      ["vec", "dict"],
    ],
    returns: ["vec", "dict"],
  },
  push: {
    minArity: 2,
    maxArity: 3,
    types: [["vec", "dict"]],
    returns: ["vec", "dict"],
  },
  sect: {
    minArity: 1,
    maxArity: 3,
    types: [["vec", "str"], "num", "num"],
    returns: ["vec", "str"],
  },
  reverse: { exactArity: 1, types: [["vec", "str"]], returns: ["vec", "str"] },
  sort: {
    minArity: 1,
    maxArity: 2,
    types: [["vec", "dict", "str"]],
    returns: ["vec"],
  },
  keys: { exactArity: 1, types: ["dict"] },
  vals: { exactArity: 1, types: ["dict"] },
  do: { minArity: 1 },
  val: { minArity: 1 },
  range: { minArity: 1, maxArity: 3, numeric: "in only", returns: ["vec"] },
  "empty?": {
    exactArity: 1,
    types: [["str", "vec", "dict"]],
    returns: ["bool"],
  },
  split: { minArity: 1, maxArity: 2, types: ["str", "str"], returns: ["vec"] },
  join: {
    minArity: 1,
    maxArity: 2,
    types: [["vec", "dict", "str"], "str"],
    returns: ["str"],
  },
  "starts-with?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  "ends-with?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  "lower-case": { exactArity: 1, types: ["str"], returns: ["str"] },
  "upper-case": { exactArity: 1, types: ["str"], returns: ["str"] },
  trim: { exactArity: 1, types: ["str"], returns: ["str"] },
  "trim-start": { exactArity: 1, types: ["str"], returns: ["str"] },
  "trim-end": { exactArity: 1, types: ["str"], returns: ["str"] },
  "str*": { exactArity: 2, types: ["str", "num"], returns: ["str"] },
  "char-code": {
    minArity: 1,
    maxArity: 2,
    types: [["str", "num"], "num"],
    returns: ["str", "num", "null"],
  },
  time: { exactArity: 0, returns: ["num"] },
  version: { exactArity: 0, returns: ["num"] },
  tests: { minArity: 0, maxArity: 1, types: ["bool"], returns: ["str"] },
  symbols: { exactArity: 0, returns: ["vec"] },
  eval: { exactArity: 1, types: ["str"] },
  reset: { exactArity: 0 },
  recur: {},
};

export const typeNames = {
  null: "null",
  str: "string",
  num: "number",
  bool: "boolean",
  key: "keyword",
  ref: "reference",
  vec: "vector",
  dict: "dictionary",
  func: "function",
  clo: "closure",
  wild: "wildcard",
};

export const assertUnreachable = (_x: never): never => <never>0;
