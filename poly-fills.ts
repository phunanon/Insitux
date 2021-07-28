export const toNum = (x: unknown) => Number(x);
export const slice = <T>(arr: T[], start?: number, end?: number) =>
  arr.slice(start, end);
export const splice = <T>(arr: T[], start: number, numDel?: number) =>
  arr.splice(start, numDel);
export const len = (arr: unknown[]) => arr.length;
export const slen = (str: string) => str.length;
export const isNum = (x: unknown) => !Number.isNaN(Number(x));
