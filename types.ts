export type Typ = "null" | "str" | "num" | "bool" | "key" | "ref" | "vec" | "func";
export type Val = { v: Val[] | null | string | number | boolean | Func; t: Typ };

export type InvokeError = { e: string; m: string; line: number; col: number };
export type ExternalError = null | string;
export type ValAndErr = { value: Val; error: ExternalError };

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
  type: InsType;
  value?: unknown;
  line: number;
  col: number;
};
