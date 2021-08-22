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
