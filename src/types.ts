export type Val =
  | { t: "vec"; v: Val[] }
  | { t: "str" | "func" | "key" | "unm"; v: string }
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
export type InvokeValResult = Val | { kind: "errors"; errors: InvokeError[] };

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
  mocks: { [key: string]: Val };
};

/** A context supplied with an Insitux invocation to provide its environment. */
export type Ctx = {
  /** Called to print data out of Insitux. */
  print: (str: string, withNewline: boolean) => void;
  /** Extra function definitions to make available within this invocation */
  functions: ExternalFunctions;
  /** Called when Insitux cannot find a function definition otherwise.
   * You should return an error if unknown externally too. */
  exe?: (name: string, args: Val[]) => ValOrErr;
  /** Callback for code coverage report */
  coverageReport?: (uncoveredLineCols: string[], allLineCols: string[]) => void;
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
  env: { funcs: {}, vars: {}, mocks: {} },
  loopBudget: 1e7,
  rangeBudget: 1e6,
  callBudget: 1e8,
  recurBudget: 1e4,
};

export type ParamsShape = {
  name: string;
  position: number[];
  rest?: true;
}[];
export type Closure = {
  readonly name: string;
  readonly length: number;
  captures: boolean[];
  derefs: Ins[];
};

type VariableIns = { errCtx: ErrCtx } & (
  | { typ: "var" | "let" | "ref"; value: string; errCtx: ErrCtx }
  //Destructuring var/let
  | { typ: "dva" | "dle"; value: ParamsShape; errCtx: ErrCtx }
);
export type Ins = { errCtx: ErrCtx } & (
  | VariableIns
  | {
      /** Named / unnamed parameter */
      typ: "npa" | "upa";
      /** Position */
      value: number;
      text: string;
    }
  | {
      /** Destructured parameter */
      typ: "dpa";
      /** Position */
      value: number[];
      /** Is rest? */
      rest?: true;
      text?: string;
    }
  | {
      /** Execute last stack value */
      typ: "exe";
      /** Number of arguments */
      value: number;
    }
  | {
      /** Execute last stack value with arity check */
      typ: "exa";
      /** Number of arguments */
      value: number;
    }
  | {
      typ: "or" | "if" | "jmp" | "loo" | "cat" | "mat" | "sat";
      /** Number of instructions */
      value: number;
    }
  | {
      /** Return */
      typ: "ret";
      /** Has value? */
      value: boolean;
    }
  | {
      /** Recur */
      typ: "rec";
      /** Number of arguments */
      value: number;
    }
  | {
      /** Truncate stack */
      typ: "pop";
      /** Number of values to truncate */
      value: number;
    }
  | {
      /** Closure / partial */
      typ: "clo";
      value: Closure;
    }
  | { typ: "val"; value: Val }
  | {
      /** A descriptor of following instructions: `[def [val]] [body]` */
      typ: "for";
      /** Length of `def [val]`, including definition instruction (1) */
      collInsLens: number[];
      bodyLen: number;
      /** Sum of `collInsLens` and `bodyLen` */
      totalLen: number;
    }
  | {
      /** Break / continue */
      typ: "brk" | "cnt";
    }
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
export type ExternalHandler = (
  params: Val[],
  errCtx: ErrCtx,
) => ValOrErr | void;
export type ExternalFunction = {
  definition: Operation;
  handler: ExternalHandler;
};
export type ExternalFunctions = { [name: string]: ExternalFunction };

const anyAndVecStrToVec: Operation = {
  exactArity: 2,
  params: ["any", ["vec", "str"]],
  returns: ["vec"],
};
export const ops: {
  [name: string]: Operation & { external?: boolean };
} = {
  print: { returns: ["null"], hasEffects: true },
  "print-str": { returns: ["null"], hasEffects: true },
  not: { exactArity: 1, returns: ["bool"] },
  "=": { minArity: 2, returns: ["bool"] },
  "==": { minArity: 2 },
  "not=": { minArity: 2, returns: ["bool"] },
  "+": { minArity: 2, numeric: true },
  "-": { minArity: 2, numeric: true },
  "*": { minArity: 2, numeric: true },
  "/": { minArity: 2, numeric: true },
  "//": { minArity: 2, numeric: true },
  "+0": { numeric: true },
  "*1": { numeric: true },
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
  min: { minArity: 1, numeric: true },
  max: { minArity: 1, numeric: true },
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
  "int?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
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
  "kv-dict": { exactArity: 2, params: ["vec", "vec"], returns: ["dict"] },
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
  "has?": {
    exactArity: 2,
    params: ["any", ["str", "vec", "dict"]],
    returns: ["bool"],
  },
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
  criteria: { minArity: 2, returns: ["clo"] },
  either: { minArity: 2, returns: ["clo"] },
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
    exactArity: 2,
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
  find: { exactArity: 2, params: ["any", ["vec", "dict", "str"]] },
  "find-idx": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
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
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
  "count-while": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
  "count-until": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["num"],
  },
  "max-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
  },
  "min-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
  },
  "empty?": {
    exactArity: 1,
    params: [["str", "vec", "dict"]],
    returns: ["bool"],
  },
  "nonempty?": {
    exactArity: 1,
    params: [["str", "vec", "dict"]],
    returns: ["bool"],
  },
  "all?": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["bool"],
  },
  "some?": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["bool"],
  },
  "none?": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["bool"],
  },
  repeat: { minArity: 2, params: ["any", "num"] },
  times: { minArity: 2, params: ["num", "any"] },
  str: { returns: ["str"] },
  strn: { returns: ["str"] },
  "to-base": { exactArity: 2, params: ["num", "num"], returns: ["str"] },
  "from-base": { exactArity: 2, params: ["num", "str"], returns: ["num"] },
  rand: { maxArity: 2, numeric: true, returns: ["num"] },
  "rand-int": { maxArity: 2, numeric: true, returns: ["num"] },
  ".": { minArity: 1 },
  "..": { minArity: 2 },
  "...": { minArity: 2 },
  proj: { minArity: 2, returns: ["vec"] },
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
  omits: {
    exactArity: 2,
    params: ["vec", "dict"],
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
  "rand-pick": { exactArity: 1, params: [["vec", "dict", "str"]] },
  sort: { exactArity: 1, params: [["vec", "str"]], returns: ["vec"] },
  "sort-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["vec"],
  },
  distinct: { exactArity: 1, params: [["vec", "str"]], returns: ["vec"] },
  rotate: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
  },
  interleave: {
    minArity: 2,
    params: [["vec", "str"]],
    returns: ["vec", "str"],
  },
  "group-by": {
    exactArity: 2,
    params: ["any", ["vec", "dict", "str"]],
    returns: ["dict"],
  },
  "part-by": anyAndVecStrToVec,
  "part-when": anyAndVecStrToVec,
  "part-before": anyAndVecStrToVec,
  "part-after": anyAndVecStrToVec,
  "part-at": {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec"],
  },
  partition: {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec"],
  },
  "split-when": anyAndVecStrToVec,
  "split-before": anyAndVecStrToVec,
  "split-after": anyAndVecStrToVec,
  "split-with": anyAndVecStrToVec,
  "skip-each": {
    exactArity: 2,
    params: ["num", ["vec", "str"]],
    returns: ["vec", "str"],
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
  "pad-left": {
    exactArity: 3,
    params: ["str", "num", "any"],
    returns: ["str"],
  },
  "pad-right": {
    exactArity: 3,
    params: ["str", "num", "any"],
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
  "str*": {
    exactArity: 2,
    params: [
      ["str", "num"],
      ["str", "num"],
    ],
    returns: ["str"],
  },
  "char-code": {
    minArity: 1,
    maxArity: 2,
    params: [["str", "num"], "num"],
    returns: ["str", "num", "null"],
  },
  "to-json": { exactArity: 1, returns: ["str"] },
  "from-json": { exactArity: 1, params: ["str"] },
  time: { exactArity: 0, returns: ["num"] },
  version: { exactArity: 0, returns: ["num"] },
  tests: { minArity: 0, maxArity: 1, params: ["bool"], returns: ["str"] },
  symbols: { exactArity: 0, returns: ["vec"] },
  eval: { exactArity: 1, params: ["str"] },
  "safe-eval": { exactArity: 1, params: ["str"] },
  deref: { exactArity: 1, params: ["str"] },
  about: { exactArity: 1, params: [["str", "func", "unm"]], returns: ["dict"] },
  reset: { exactArity: 0 },
  assert: { minArity: 1 },
  mock: { minArity: 2, returns: ["null"] },
  unmock: { returns: ["null"] },
  unmocked: { exactArity: 1, params: [["str", "func"]], returns: ["unm"] },
};

export const syntaxes = [
  ...["function", "fn", "var", "let", "var!", "let!", "if", "if-not"],
  ...["return", "return-when", "return-unless", "recur", "continue", "break"],
  ...["when", "unless", "while", "loop", "for", "match", "satisfy"],
  ...["catch", "args", "E", "PI"],
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
  unm: "unmocked callable",
};

export const assertUnreachable = (_x: never): never => <never>0;
