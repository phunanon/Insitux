type Typ = "null" | "str" | "num" | "bool" | "key" | "ref" | "vec" | "func";
type Val = { v: Val[] | null | string | number | boolean | Func; t: Typ };

type InvokeError = { e: string; m: string; line: number; col: number };
type ExternalError = null | string;
type ValAndErr = { value: Val; error: ExternalError };

type FuncName = "print" | "print-line" | string;

type Func = {
  name: string;
  ins: Ins[];
};
type Funcs = { [key: string]: Func };
type Env = {
  funcs: Funcs;
  vars: { [key: string]: Val };
};

type Ctx = {
  set: (key: string, val: Val) => Promise<ExternalError>;
  get: (key: string) => Promise<ValAndErr>;
  exe: (name: FuncName, args: Val[]) => Promise<ValAndErr>;
  env: Env;
};

type InsType =
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
type Ins = {
  type: InsType;
  value?: unknown;
  line: number;
  col: number;
};
