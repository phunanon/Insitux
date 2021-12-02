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

/** A context supplied with an Insitux invocation to provide its environment. */
export type Ctx = {
  /** Called to set an external variable, returning nothing or an error. */
  set: (key: string, val: Val) => undefined | string;
  /** Called to retrieve an external variable,
   * returning the value or an error. */
  get: (key: string) => ValOrErr;
  /** Called when Insitux cannot find a function and assumes it is external.
   * You should return an error if unknown externally too. */
  exe: (name: string, args: Val[]) => ValOrErr;
  /** Called to print data out of Insitux. */
  print: (str: string, withNewline: boolean) => void;
  /** Function and variable definitions, retained by you for each invocation. */
  env: Env;
  /** The number of loops an invocation is permitted. */
  loopBudget: number;
  /** The total length of all `range` calls permitted. */
  rangeBudget: number;
  /** The total number of function calls permitted. */
  callBudget: number;
  /** The total number of explicit recursions permitted.
   * Explicit recursions are unlikely to cause a stack-overflow. */
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

/** Definition of an operation in Insitux,
 * with guarantees made for arity (number of parameters) and parameter types.
 * Return type is specified to inform the parse-time type-checker. */
export type Operation = {
  minArity?: number;
  maxArity?: number;
  exactArity?: number;
  numeric?: true | "in only";
  params?: (Val["t"] | Val["t"][])[];
  returns?: Val["t"][];
};
export type ExternalHandler = (params: Val[]) => ValOrErr;

export const ops: {
  [name: string]: Operation & { external?: boolean };
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
  len: { exactArity: 1, params: [["str", "vec", "dict"]], returns: ["num"] },
  "to-num": {
    exactArity: 1,
    params: [["str", "num"]],
    returns: ["num", "null"],
  },
  "to-key": { exactArity: 1, params: [["str", "num"]], returns: ["key"] },
  "has?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  idx: { minArity: 2, maxArity: 3, params: [["str", "vec"]], returns: ["num"] },
  map: { minArity: 2, returns: ["vec"] },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3, params: [[], ["vec", "dict", "str"]] },
  filter: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  remove: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  find: { minArity: 2, params: [[], ["vec", "dict", "str"]] },
  count: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["num"],
  },
  repeat: { minArity: 2, params: [[], "num"] },
  "->": { minArity: 2 },
  str: { returns: ["str"] },
  rand: { maxArity: 2, numeric: true, returns: ["num"] },
  "rand-int": { maxArity: 2, numeric: true, returns: ["num"] },
  ".": { minArity: 1 },
  "..": { minArity: 2 },
  "...": { minArity: 2 },
  into: {
    exactArity: 2,
    params: [
      ["vec", "dict"],
      ["vec", "dict"],
    ],
    returns: ["vec", "dict"],
  },
  push: {
    minArity: 2,
    maxArity: 3,
    params: [["vec", "dict"]],
    returns: ["vec", "dict"],
  },
  sect: {
    minArity: 1,
    maxArity: 3,
    params: [["vec", "str"], "num", "num"],
    returns: ["vec", "str"],
  },
  reverse: { exactArity: 1, params: [["vec", "str"]], returns: ["vec", "str"] },
  sort: {
    minArity: 1,
    maxArity: 2,
    params: [["vec", "dict", "str"]],
    returns: ["vec"],
  },
  keys: { exactArity: 1, params: ["dict"] },
  vals: { exactArity: 1, params: ["dict"] },
  do: { minArity: 1 },
  val: { minArity: 1 },
  range: { minArity: 1, maxArity: 3, numeric: "in only", returns: ["vec"] },
  "empty?": {
    exactArity: 1,
    params: [["str", "vec", "dict"]],
    returns: ["bool"],
  },
  split: { minArity: 1, maxArity: 2, params: ["str", "str"], returns: ["vec"] },
  join: {
    minArity: 1,
    maxArity: 2,
    params: [["vec", "dict", "str"], "str"],
    returns: ["str"],
  },
  "starts-with?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "ends-with?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "lower-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  "upper-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  trim: { exactArity: 1, params: ["str"], returns: ["str"] },
  "trim-start": { exactArity: 1, params: ["str"], returns: ["str"] },
  "trim-end": { exactArity: 1, params: ["str"], returns: ["str"] },
  "str*": { exactArity: 2, params: ["str", "num"], returns: ["str"] },
  "char-code": {
    minArity: 1,
    maxArity: 2,
    params: [["str", "num"], "num"],
    returns: ["str", "num", "null"],
  },
  time: { exactArity: 0, returns: ["num"] },
  version: { exactArity: 0, returns: ["num"] },
  tests: { minArity: 0, maxArity: 1, params: ["bool"], returns: ["str"] },
  symbols: { exactArity: 0, returns: ["vec"] },
  eval: { exactArity: 1, params: ["str"] },
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
