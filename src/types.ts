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

export const ops = [
  "print",
  "print-str",
  "execute-last",
  "define",
  "=",
  "!=",
  "+",
  "-",
  "*",
  "/",
  "**",
  "<",
  ">",
  "<=",
  ">=",
  "inc",
  "dec",
  "min",
  "max",
  "abs",
  "sqrt",
  "round",
  "floor",
  "ceil",
  "odd?",
  "even?",
  "rem",
  "sin",
  "cos",
  "tan",
  "vec",
  "dict",
  "len",
  "num",
  "has?",
  "map",
  "reduce",
  "filter",
  "str",
  "rand-num",
  "rand-int",
  "while",
  "apply",
  "into",
  "sect",
  "keys",
  "vals",
  "version",
  "tests",
];

export const minArities: { [op: string]: number } = {
  define: 2,
  "=": 2,
  "!=": 2,
  "+": 2,
  "-": 1,
  "*": 2,
  "/": 2,
  "**": 1,
  "<": 2,
  ">": 2,
  "<=": 2,
  ">=": 2,
  inc: 1,
  dec: 1,
  min: 2,
  max: 2,
  abs: 1,
  sqrt: 1,
  round: 1,
  floor: 1,
  ceil: 1,
  "odd?": 1,
  "even?": 1,
  rem: 2,
  sin: 1,
  cos: 1,
  tan: 1,
  len: 1,
  num: 1,
  "has?": 2,
  map: 2,
  reduce: 2,
  filter: 2,
  apply: 2,
  into: 2,
  sect: 1,
  keys: 1,
  vals: 1,
};

export const argsMustBeNum = [
  "+",
  "-",
  "*",
  "/",
  "**",
  "<",
  ">",
  "<=",
  ">=",
  "inc",
  "dec",
  "min",
  "max",
  "abs",
  "sqrt",
  "round",
  "floor",
  "ceil",
  "odd?",
  "even?",
  "rem",
  "sin",
  "cos",
  "tan",
  "rand-num",
  "rand-int",
];

export const argsMustBe: { [op: string]: (Val["t"] | Val["t"][])[] } = {
  define: ["ref"],
  len: [["str", "vec", "dict"]],
  num: [["str", "num"]],
  idx: [["str", "vec"]],
  "has?": ["str", "str"],
  keys: ["dict"],
  vals: ["dict"],
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
