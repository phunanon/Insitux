export type Val =
  | { t: "vec"; v: Val[] }
  | { t: "str" | "func" | "key" | "ref"; v: string }
  | { t: "null"; v: undefined }
  | { t: "wild"; v: undefined }
  | { t: "bool"; v: boolean }
  | { t: "num"; v: number }
  | { t: "clo"; v: Func }
  | { t: "dict"; v: Dict }
  | { t: "ext"; v: unknown };

export type ErrCtx = { invokeId: string; line: number; col: number };
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
  name?: string;
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
  set?: (key: string, val: Val) => undefined | string;
  /** Called to retrieve an external variable,
   * returning the value or an error. */
  get?: (key: string) => ValOrErr;
  /** Called to print data out of Insitux. */
  print: (str: string, withNewline: boolean) => void;
  /** Extra function definitions to make available within this invocation */
  functions: ExternalFunction[];
  /** Called when Insitux cannot find a function definition otherwise.
   * You should return an error if unknown externally too. */
  exe?: (name: string, args: Val[]) => ValOrErr;
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

export const defaultCtx = {
  env: { funcs: {}, vars: {} },
  loopBudget: 1e7,
  rangeBudget: 1e6,
  callBudget: 1e8,
  recurBudget: 1e4,
};

export type ParamsShape = { name: string; position: number[] }[];
export type Closure = {
  readonly name: string;
  readonly length: number;
  readonly captures: boolean[];
  readonly derefs: Ins[];
};

export type Ins = { errCtx: ErrCtx } & (
  | { typ: "npa" | "upa"; value: number; text: string } //Named and Unnamed parameters
  | { typ: "dpa"; value: number[] } //Destructuring parameters
  | { typ: "var" | "let" | "ref"; value: string }
  | { typ: "dva" | "dle"; value: ParamsShape } //Destructuring var/let
  | { typ: "exe"; value: number } //Execute last stack value, number of args
  | { typ: "exa"; value: number } //Execute last stack value, number of args, with arity check
  | { typ: "or" | "if" | "jmp" | "loo" | "cat" | "mat"; value: number } //Number of instructions
  | { typ: "ret"; value: boolean } //Return, with value?
  | { typ: "pop"; value: number } //Truncate stack, by number of values
  | { typ: "clo"; value: Closure } //Closure/partial
  | { typ: "val"; value: Val }
);

/** Definition of an operation in Insitux,
 * with guarantees made for arity (number of parameters) and parameter types.
 * Return type is specified to inform the parse-time type-checker. */
export type Operation = {
  minArity?: number;
  maxArity?: number;
  exactArity?: number;
  numeric?: true | "in only";
  params?: ("any" | Val["t"] | Val["t"][])[];
  returns?: Val["t"][];
};
export type ExternalHandler = (params: Val[]) => ValOrErr;
export type ExternalFunction = {
  name: string;
  definition: Operation;
  handler: ExternalHandler;
};

export const ops: {
  [name: string]: Operation & { external?: boolean };
} = {
  print: { returns: ["null"] },
  "print-str": { returns: ["null"] },
  "!": { exactArity: 1, returns: ["bool"] },
  "=": { minArity: 2, returns: ["bool"] },
  "!=": { minArity: 2, returns: ["bool"] },
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
  "ext?": { exactArity: 1, returns: ["bool"] },
  "type-of": { exactArity: 1, returns: ["str"] },
  rem: { minArity: 2, numeric: true },
  sin: { exactArity: 1, numeric: true },
  cos: { exactArity: 1, numeric: true },
  tan: { exactArity: 1, numeric: true },
  asin: { exactArity: 1, numeric: true },
  acos: { exactArity: 1, numeric: true },
  atan: { exactArity: 1, numeric: true },
  sinh: { exactArity: 1, numeric: true },
  cosh: { exactArity: 1, numeric: true },
  tanh: { exactArity: 1, numeric: true },
  vec: { returns: ["vec"] },
  dict: { returns: ["dict"] },
  len: { exactArity: 1, params: [["str", "vec", "dict"]], returns: ["num"] },
  "to-num": {
    exactArity: 1,
    params: [["str", "num"]],
    returns: ["num", "null"],
  },
  "to-key": { exactArity: 1, params: [["str", "num"]], returns: ["key"] },
  "to-vec": { exactArity: 1, params: [["str", "dict"]], returns: ["vec"] },
  "substr?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  idx: {
    exactArity: 2,
    params: ["any", ["str", "vec"]],
    returns: ["num"],
  },
  "set-at": {
    exactArity: 3,
    params: ["vec", "any", ["vec", "dict"]],
    returns: ["vec", "dict"],
  },
  map: { minArity: 2, returns: ["vec"] },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3 },
  filter: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec", "str", "dict"],
  },
  remove: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec", "str", "dict"],
  },
  find: { minArity: 2, params: ["any", ["vec", "dict", "str"]] },
  count: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
  repeat: { minArity: 2, params: ["any", "num"] },
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
  assoc: {
    exactArity: 3,
    params: ["any", "any", "dict"],
    returns: ["dict"],
  },
  omit: {
    exactArity: 2,
    params: ["any", "dict"],
    returns: ["dict"],
  },
  insert: {
    exactArity: 3,
    params: ["any", "num", "vec"],
    returns: ["vec"],
  },
  append: {
    exactArity: 2,
    params: ["any", "vec"],
    returns: ["vec"],
  },
  prepend: {
    exactArity: 2,
    params: ["any", "vec"],
    returns: ["vec"],
  },
  sect: {
    minArity: 1,
    maxArity: 3,
    params: [["vec", "str"], "num", "num"],
    returns: ["vec", "str"],
  },
  reverse: { exactArity: 1, params: [["vec", "str"]], returns: ["vec", "str"] },
  flatten: {
    exactArity: 1,
    params: ["vec"],
    returns: ["vec"],
  },
  shuffle: {
    exactArity: 1,
    params: ["vec"],
    returns: ["vec"],
  },
  sort: {
    exactArity: 1,
    params: [["vec", "str"]],
    returns: ["vec"],
  },
  "sort-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  distinct: {
    returns: ["vec"],
  },
  "group-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["dict"],
  },
  "part-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  frequencies: {
    exactArity: 1,
    params: [["vec", "str"]],
    returns: ["dict"],
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
  split: { exactArity: 2, params: ["str", "str"], returns: ["vec"] },
  join: {
    exactArity: 2,
    params: ["str", ["vec", "dict", "str"]],
    returns: ["str"],
  },
  replace: {
    exactArity: 3,
    params: ["str", "str", "str"],
    returns: ["str"],
  },
  "starts?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "ends?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
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
  about: { exactArity: 1, params: [["str", "func"]], returns: ["dict"] },
  reset: { exactArity: 0 },
  recur: {},
};

export const syntaxes = [
  "function",
  "fn",
  "var",
  "let",
  "var!",
  "let!",
  "return",
  "if",
  "if!",
  "when",
  "unless",
  "while",
  "loop",
  "match",
  "catch",
];

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
  ext: "external",
};

export const assertUnreachable = (_x: never): never => <never>0;
