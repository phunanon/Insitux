export const isObj = (x: unknown): x is object => typeof x === "object";
export const isStr = (x: unknown): x is string => typeof x === "string";
export const fromRadix = (x: string, r: number): number => parseInt(x, r);
export const toRadix = (x: number, r: number): string => x.toString(r);
export const len = <T>(arr: T[]): number => arr.length;
export const isNum = (x: unknown): x is number =>
  x !== "" && x !== null && !Number.isNaN(Number(x));
export const isArray = <T>(x: unknown): x is T[] => Array.isArray(x);
export const substr = (str: string, start: number, length?: number): string =>
  str.substring(start, start + (length ?? str.length));
export const strIdx = (str: string, idx: number): string => str[idx];
export const subIdx = (x: string, s: string) => x.indexOf(s);
export const has = <T>(x: T[], y: T): boolean => x.includes(y);
export const replace = (str: string, what: string, to: string): string =>
  str.split(what).join(to);
export const rreplace = (str: string, what: string, to: string) =>
  str.replace(new RegExp(what, "g"), to);
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
