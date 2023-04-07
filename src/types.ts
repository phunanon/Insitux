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
export type ValOrErr = Val | { err: string };
/**
 * @summary "empty" occurs when there was only function declaration;
 *          "val" occurs when there were no errors and there is a final value;
 *          "errors" occurs when there were any errors.
 */
export type InvokeResult =
  | { kind: "empty" }
  | Val
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
  functions: ExternalFunctions;
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
   * Explicit recursions are unlikely to cause a stack-overflow,
   * rather this effectively limits the time an Insitux program may hang for. */
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
  captures: boolean[];
  derefs: Ins[];
};

export type Ins = { errCtx: ErrCtx } & (
  | { typ: "var" | "let" | "ref"; value: string }
  //Named and Unnamed parameters
  | { typ: "npa" | "upa"; value: number; text: string }
  | { typ: "dpa"; value: number[] } //Destructuring parameters
  | { typ: "dva" | "dle"; value: ParamsShape } //Destructuring var/let
  | { typ: "exe"; value: number } //Execute last stack value, number of args
  //Execute last stack value, number of args, with arity check
  | { typ: "exa"; value: number }
  //Number of instructions
  | { typ: "or" | "if" | "jmp" | "loo" | "cat" | "mat" | "sat"; value: number }
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
  /** Does the function cause side-effects when used? */
  hasEffects?: boolean;
  numeric?: true | "in only";
  params?: ("any" | Val["t"] | Val["t"][])[];
  returns?: [Val["t"], ...Val["t"][]];
};
export type ExternalHandler = (params: Val[]) => ValOrErr | void;
export type ExternalFunction = {
  definition: Operation;
  handler: ExternalHandler;
};
export type ExternalFunctions = { [name: string]: ExternalFunction };

export const ops: {
  [name: string]: Operation & { external?: boolean };
} = {
  print: { returns: ["null"], hasEffects: true },
  "print-str": { returns: ["null"], hasEffects: true },
  "!": { exactArity: 1, returns: ["bool"] },
  "=": { minArity: 2, returns: ["bool"] },
  "==": { minArity: 2 },
  "!=": { minArity: 2, returns: ["bool"] },
  "+": { minArity: 2, numeric: true },
  "-": { minArity: 2, numeric: true },
  "*": { minArity: 2, numeric: true },
  "/": { minArity: 2, numeric: true },
  "//": { minArity: 2, numeric: true },
  "**": { minArity: 1, maxArity: 2, numeric: true },
  "<": { minArity: 2, numeric: "in only", returns: ["bool"] },
  ">": { minArity: 2, numeric: "in only", returns: ["bool"] },
  "<=": { minArity: 2, numeric: "in only", returns: ["bool"] },
  ">=": { minArity: 2, numeric: "in only", returns: ["bool"] },
  "str<": { minArity: 2, returns: ["bool"] },
  "str>": { minArity: 2, returns: ["bool"] },
  "str<=": { minArity: 2, returns: ["bool"] },
  "str>=": { minArity: 2, returns: ["bool"] },
  "fast=": { exactArity: 2, returns: ["bool"] },
  "fast!=": { exactArity: 2, returns: ["bool"] },
  "fast+": { exactArity: 2, numeric: true },
  "fast-": { exactArity: 2, numeric: true },
  "fast*": { exactArity: 2, numeric: true },
  "fast/": { exactArity: 2, numeric: true },
  "fast//": { exactArity: 2, numeric: true },
  "fast<": { exactArity: 2, numeric: "in only", returns: ["bool"] },
  "fast>": { exactArity: 2, numeric: "in only", returns: ["bool"] },
  "fast<=": { exactArity: 2, numeric: "in only", returns: ["bool"] },
  "fast>=": { exactArity: 2, numeric: "in only", returns: ["bool"] },
  neg: { exactArity: 1, numeric: true },
  inc: { exactArity: 1, numeric: true },
  dec: { exactArity: 1, numeric: true },
  min: { minArity: 2, numeric: true },
  max: { minArity: 2, numeric: true },
  abs: { exactArity: 1, numeric: true },
  sqrt: { exactArity: 1, numeric: true },
  round: { minArity: 1, maxArity: 2, numeric: true },
  floor: { exactArity: 1, numeric: true },
  ceil: { exactArity: 1, numeric: true },
  clamp: { exactArity: 3, numeric: true },
  logn: { exactArity: 1, numeric: true },
  log2: { exactArity: 1, numeric: true },
  log10: { exactArity: 1, numeric: true },
  "div?": { exactArity: 2, numeric: "in only", returns: ["bool"] },
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
  average: { exactArity: 1, params: ["vec"], returns: ["num"] },
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
  bool: { exactArity: 1, returns: ["bool"] },
  "substr?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  idx: {
    exactArity: 2,
    params: [["str", "vec"], "any"],
    returns: ["num"],
  },
  "idx-of": {
    exactArity: 2,
    params: ["any", ["str", "vec"]],
    returns: ["num"],
  },
  "last-idx": {
    exactArity: 2,
    params: [["str", "vec"], "any"],
    returns: ["num"],
  },
  "last-idx-of": {
    exactArity: 2,
    params: ["any", ["str", "vec"]],
    returns: ["num"],
  },
  "set-at": {
    exactArity: 3,
    params: ["vec", "any", ["vec", "dict"]],
    returns: ["vec", "dict"],
  },
  "update-at": {
    exactArity: 3,
    params: ["vec", "any", ["vec", "dict"]],
    returns: ["vec", "dict"],
  },
  juxt: { returns: ["clo"] },
  adj: { returns: ["clo"] },
  comp: { minArity: 2, returns: ["clo"] },
  toggle: { exactArity: 2, returns: ["clo"] },
  map: { minArity: 2, returns: ["vec"] },
  "flat-map": { minArity: 2, returns: ["vec"] },
  xmap: {
    minArity: 2,
    params: ["any", ["vec", "str", "dict"]],
    returns: ["vec"],
  },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3 },
  reductions: { minArity: 2, maxArity: 3 },
  filter: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec", "str", "dict"],
  },
  sieve: {
    exactArity: 1,
    params: ["vec"],
    returns: ["vec"],
  },
  remove: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec", "str", "dict"],
  },
  find: { minArity: 2, params: ["any", ["vec", "dict", "str"]] },
  "take-while": {
    exactArity: 2,
    params: ["any", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  "take-until": {
    exactArity: 2,
    params: ["any", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  "skip-while": {
    exactArity: 2,
    params: ["any", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  "skip-until": {
    exactArity: 2,
    params: ["any", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  count: {
    minArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
  "empty?": {
    exactArity: 1,
    params: [["str", "vec", "dict"]],
    returns: ["bool"],
  },
  "all?": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["bool"],
  },
  repeat: { minArity: 2, params: ["any", "num"] },
  times: { minArity: 2, params: ["num", "any"] },
  str: { returns: ["str"] },
  strn: { returns: ["str"] },
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
  drop: {
    exactArity: 2,
    params: ["num", "vec"],
    returns: ["vec"],
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
  skip: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  first: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  last: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  trunc: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  crop: {
    exactArity: 3,
    params: ["num", "num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  reverse: { exactArity: 1, params: [["vec", "str"]], returns: ["vec", "str"] },
  flatten: { exactArity: 1, params: ["vec"], returns: ["vec"] },
  shuffle: { exactArity: 1, params: ["vec"], returns: ["vec"] },
  sample: { exactArity: 2, params: ["num", "vec"], returns: ["vec"] },
  "rand-pick": { exactArity: 1, params: ["vec"] },
  sort: { exactArity: 1, params: [["vec", "str"]], returns: ["vec"] },
  "sort-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  distinct: { returns: ["vec"] },
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
  partition: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec"],
  },
  freqs: { exactArity: 1, params: [["vec", "str"]], returns: ["dict"] },
  keys: { exactArity: 1, params: ["dict"] },
  vals: { exactArity: 1, params: ["dict"] },
  do: { minArity: 1 },
  val: { minArity: 1 },
  range: { minArity: 1, maxArity: 3, numeric: "in only", returns: ["vec"] },
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
  rreplace: {
    exactArity: 3,
    params: ["str", "str", "str"],
    returns: ["str"],
  },
  "starts?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "ends?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "lower-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  "upper-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  "upper?": { exactArity: 1, params: ["str"], returns: ["bool"] },
  "lower?": { exactArity: 1, params: ["str"], returns: ["bool"] },
  "letter?": { exactArity: 1, params: ["str"], returns: ["bool"] },
  "digit?": { exactArity: 1, params: ["str"], returns: ["bool"] },
  "space?": { exactArity: 1, params: ["str"], returns: ["bool"] },
  "punc?": { exactArity: 1, params: ["str"], returns: ["bool"] },
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
  symbols: { minArity: 0, maxArity: 1, params: ["bool"], returns: ["vec"] },
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
  "loop-over",
  "match",
  "satisfy",
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
