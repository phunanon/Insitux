export const toNum = (x: unknown): number => Number(x);
export const slice = <T>(arr: T[], start?: number, end?: number): T[] =>
  arr.slice(start, end);
export const splice = <T>(arr: T[], start: number, numDel?: number): T[] =>
  arr.splice(start, numDel);
export const len = (arr: unknown[]): number => arr.length;
export const slen = (str: string): number => str.length;
export const isNum = (x: unknown): boolean => !Number.isNaN(Number(x));
export const min = Math.min;
export const substr = (str: string, start: number): string => str.substr(start);
export const strIdx = (str: string, idx: number): string => str[idx];
export const sub = (x: string, s: string): boolean => x.includes(s);
export const has = <T>(x: T[], y: T): boolean => x.includes(y);
export const starts = (str: string, x: string): boolean => str.startsWith(x);
export const flat = <T>(arr: T[][]): T[] => arr.flat(); //e.g. [[0], [1], []] => [0, 1]
export const concat = <T>(a: T[], b: T[]): T[] => a.concat(b);
export const push = <T>(arr: T[], add: T[]) => arr.push(...add);
