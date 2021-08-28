export type Val = {
  v: Val[] | Dict | undefined | string | number | boolean | Func;
  t: "null" | "str" | "num" | "bool" | "key" | "ref" | "vec" | "dict" | "func";
};

export type ErrCtx = { invocationId: string; line: number; col: number };
export type InvokeError = { e: string; m: string; errCtx: ErrCtx };
export type ExternalError = undefined | string;
export type ValAndErr = { value: Val; err: ExternalError };

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
  set: (key: string, val: Val) => Promise<ExternalError>;
  get: (key: string) => Promise<ValAndErr>;
  exe: (name: string, args: Val[]) => Promise<ValAndErr>;
  env: Env;
  loopBudget: number;
  callBudget: number;
};

export type InsType =
  | "nul"
  | "boo"
  | "num"
  | "str"
  | "key"
  | "par"
  | "ref"
  | "var"
  | "op"
  | "exe"
  | "if"
  | "jmp"
  | "sav" //Save stack length
  | "res" //Restore stack length
  | "or";
export type Ins = {
  typ: InsType;
  value?: unknown;
  errCtx: ErrCtx;
};

export const ops: {
  [name: string]: {
    minArity?: number;
    maxArity?: number;
    exactArity?: number;
    onlyNum?: boolean;
    argTypes?: (Val["t"] | Val["t"][])[];
  };
} = {
  print: {},
  "print-str": {},
  "execute-last": {},
  define: { exactArity: 2, argTypes: ["ref"] },
  "!": { exactArity: 1 },
  "=": { minArity: 2 },
  "!=": { minArity: 2 },
  "+": { minArity: 2, onlyNum: true },
  "-": { minArity: 1, onlyNum: true },
  "*": { minArity: 2, onlyNum: true },
  "/": { minArity: 2, onlyNum: true },
  "//": { minArity: 2, onlyNum: true },
  "**": { minArity: 2, onlyNum: true },
  "<": { minArity: 2, onlyNum: true },
  ">": { minArity: 2, onlyNum: true },
  "<=": { minArity: 2, onlyNum: true },
  ">=": { minArity: 2, onlyNum: true },
  inc: { exactArity: 1, onlyNum: true },
  dec: { exactArity: 1, onlyNum: true },
  min: { minArity: 2, onlyNum: true },
  max: { minArity: 2, onlyNum: true },
  abs: { exactArity: 1, onlyNum: true },
  sqrt: { exactArity: 1, onlyNum: true },
  round: { exactArity: 1, onlyNum: true },
  floor: { exactArity: 1, onlyNum: true },
  ceil: { exactArity: 1, onlyNum: true },
  "odd?": { exactArity: 1, onlyNum: true },
  "even?": { exactArity: 1, onlyNum: true },
  "pos?": { exactArity: 1, onlyNum: true },
  "neg?": { exactArity: 1, onlyNum: true },
  "zero?": { exactArity: 1, onlyNum: true },
  "null?": { exactArity: 1 },
  "num?": { exactArity: 1 },
  "bool?": { exactArity: 1 },
  "str?": { exactArity: 1 },
  "vec?": { exactArity: 1 },
  "dict?": { exactArity: 1 },
  "key?": { exactArity: 1 },
  "func?": { exactArity: 1 },
  rem: { minArity: 2, onlyNum: true },
  sin: { exactArity: 1, onlyNum: true },
  cos: { exactArity: 1, onlyNum: true },
  tan: { exactArity: 1, onlyNum: true },
  vec: {},
  dict: {},
  len: { exactArity: 1, argTypes: [["str", "vec", "dict"]] },
  num: { exactArity: 1, argTypes: [["str", "num"]] },
  "has?": { exactArity: 2, argTypes: ["str", "str"] },
  idx: { exactArity: 2, argTypes: [["str", "vec"]] },
  map: { minArity: 2 },
  reduce: { minArity: 2 },
  filter: { minArity: 2 },
  str: {},
  "rand-num": { maxArity: 2, onlyNum: true },
  "rand-int": { maxArity: 2, onlyNum: true },
  while: {},
  apply: { minArity: 2 },
  into: {
    exactArity: 2,
    argTypes: [
      ["vec", "dict"],
      ["vec", "dict"],
    ],
  },
  sect: { minArity: 1, maxArity: 3, argTypes: [["vec", "str"], "num", "num"] },
  reverse: { exactArity: 1, argTypes: [["vec", "str"]] },
  sort: { minArity: 1, maxArity: 2, argTypes: ["vec"] },
  keys: { exactArity: 1, argTypes: ["dict"] },
  vals: { exactArity: 1, argTypes: ["dict"] },
  "starts-with?": { exactArity: 2, argTypes: ["str", "str"] },
  "ends-with?": { exactArity: 2, argTypes: ["str", "str"] },
  split: { minArity: 1, maxArity: 2, argTypes: ["str", "str"] },
  join: { minArity: 1, maxArity: 2, argTypes: ["vec", "str"] },
  time: { exactArity: 0 },
  version: { exactArity: 0 },
  tests: { exactArity: 0 },
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
};
