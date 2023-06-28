export const isObj = (x: unknown): x is object => typeof x === "object";
export const isStr = (x: unknown): x is string => typeof x === "string";
export const toNum = (x: unknown): number => Number(x); //Should also support 0b and 0x
export const slice = <T>(arr: T[], start?: number, end?: number): T[] =>
  arr.slice(start, end);
export const splice = <T>(arr: T[], start: number, numDel?: number): T[] =>
  arr.splice(start, numDel);
export const len = <T>(arr: T[]): number => arr.length;
export const slen = (str: string): number => str.length;
export const isNum = (x: unknown): x is number =>
  x !== "" && !Number.isNaN(Number(x));
export const isArray = <T>(x: unknown): x is T[] => Array.isArray(x);
export const substr = (str: string, start: number, length?: number): string =>
  str.substring(start, start + (length ?? str.length));
export const strIdx = (str: string, idx: number): string => str[idx];
export const sub = (x: string, s: string): boolean => x.includes(s);
export const subIdx = (x: string, s: string) => x.indexOf(s);
export const has = <T>(x: T[], y: T): boolean => x.includes(y);
export const starts = (str: string, prefix: string): boolean =>
  str.startsWith(prefix);
export const ends = (str: string, x: string): boolean => str.endsWith(x);
export const replace = (str: string, what: string, to: string): string =>
  str.split(what).join(to);
export const rreplace = (str: string, what: string, to: string) =>
  str.replace(new RegExp(what, "g"), to);
export const flat = <T>(arr: T[][]): T[] => arr.flat(); //e.g. [[0], [1], []] => [0, 1]
export const concat = <T>(a: T[], b: T[]): T[] => a.concat(b);
export const push = <T>(arr: T[], add: T[]) => arr.push(...add);
export const sortBy = <T>(arr: T[], by: (a: T, b: T) => number) => arr.sort(by);
export const reverse = <T>(arr: T[]) => arr.reverse();
export const lowerCase = (str: string) => str.toLowerCase();
export const upperCase = (str: string) => str.toUpperCase();
export const trim = (str: string) => str.trim();
export const trimStart = (str: string) => str.trimStart();
export const trimEnd = (str: string) => str.trimEnd();
export const padEnd = (str: string, by: number) => str.padEnd(by);
export const charCode = (str: string): number => str.charCodeAt(0);
export const codeChar = (num: number): string => String.fromCharCode(num);
export const randNum = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(randNum(a, b));
export const range = (len: number) => [...Array(len).keys()];
export const objKeys = (x: object) => Object.keys(x);
export const objVals = (x: object) => Object.values(x);
export const getTimeMs = () => new Date().getTime();
export const abs = Math.abs;
export const min = Math.min;
export const max = Math.max;
export const sin = Math.sin;
export const cos = Math.cos;
export const tan = Math.tan;
export const sinh = Math.sinh;
export const cosh = Math.cosh;
export const tanh = Math.tanh;
export const asin = Math.asin;
export const acos = Math.acos;
export const atan = Math.atan;
export const sqrt = Math.sqrt;
export const round = Math.round;
export const floor = Math.floor;
export const ceil = Math.ceil;
export const sign = Math.sign;
export const logn = Math.log;
export const log2 = Math.log2;
export const log10 = Math.log10;
