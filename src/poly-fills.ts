export const toNum = (x: unknown): number => Number(x);
export const slice = <T>(arr: T[], start?: number, end?: number): T[] =>
  arr.slice(start, end);
export const splice = <T>(arr: T[], start: number, numDel?: number): T[] =>
  arr.splice(start, numDel);
export const len = (arr: unknown[]): number => arr.length;
export const slen = (str: string): number => str.length;
export const isNum = (x: unknown): x is number => !Number.isNaN(Number(x));
export const isArray = <T>(x: unknown): x is T[] => Array.isArray(x);
export const substr = (str: string, start: number, length?: number): string =>
  str.substring(start, length ? start + length : str.length);
export const strIdx = (str: string, idx: number): string => str[idx];
export const sub = (x: string, s: string): boolean => x.includes(s);
export const subIdx = (x: string, s: string) => x.indexOf(s);
export const has = <T>(x: T[], y: T): boolean => x.includes(y);
export const starts = (str: string, x: string): boolean => str.startsWith(x);
export const ends = (str: string, x: string): boolean => str.endsWith(x);
export const flat = <T>(arr: T[][]): T[] => arr.flat(); //e.g. [[0], [1], []] => [0, 1]
export const concat = <T>(a: T[], b: T[]): T[] => a.concat(b);
export const push = <T>(arr: T[], add: T[]) => arr.push(...add);
export const sortBy = <T>(arr: T[], by: (a: T, b: T) => number) => arr.sort(by);
export const reverse = <T>(arr: T[]) => arr.reverse();
export const trim = (str: string) => str.trim();
export const padEnd = (str: string, by: number) => str.padEnd(by);
export const randNum = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(randNum(a, b));
export const range = (len: number) => [...Array(len).keys()];
export const objKeys = (x: object) => Object.keys(x);
export const getTimeMs = () => new Date().getTime();
export const abs = Math.abs;
export const min = Math.min;
export const max = Math.max;
export const sin = Math.sin;
export const cos = Math.cos;
export const tan = Math.tan;
export const sqrt = Math.sqrt;
export const round = Math.round;
export const floor = Math.floor;
export const ceil = Math.ceil;
export const sign = Math.sign;
export const pi = Math.PI;
