export const toNum = (x: unknown) => Number(x);
export const slice = <T>(arr: T[], start?: number, end?: number) =>
  arr.slice(start, end);
export const splice = <T>(arr: T[], start: number, numDel?: number) =>
  arr.splice(start, numDel);
export const len = (arr: unknown[]) => arr.length;
export const slen = (str: string) => str.length;
export const isNum = (x: unknown) => !Number.isNaN(Number(x));
export const min = Math.min;
export const substr = (str: string, start: number) => str.substr(start);
export const strIdx = (str: string, idx: number) => str[idx];
export const sub = (x: string, s: string) => x.includes(s);
export const has = <T>(x: T[], y: T) => x.includes(y);
export const starts = (str: string, x: string) => str.startsWith(x);
export const flat = <T>(arr: T[]) => arr.flat(); //e.g. [[0], [1], []] => [0, 1]