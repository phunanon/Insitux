export type Typ =
  | "null"
  | "str"
  | "num"
  | "bool"
  | "key"
  | "ref"
  | "vec"
  | "func";
export type Val = {
  v: Val[] | undefined | string | number | boolean | Func;
  t: Typ;
};

export type ErrCtx = { invocationId: string; line: number; col: number };
export type InvokeError = { e: string; m: string; errCtx: ErrCtx };
export type ExternalError = undefined | string;
export type ValAndErr = { value: Val; err: ExternalError };

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
};

export type InsType =
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
  | "els"
  | "ret";
export type Ins = {
  typ: InsType;
  value?: unknown;
  errCtx: ErrCtx;
};
