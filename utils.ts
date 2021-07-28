export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const a: T[] = [], b: T[] = [];
  for (let i = 0, isB = false; i < array.length; ++i) {
    isB ||= !predicate(array[i]);
    (isB ? b : a).push(array[i]);
  }
  return [a, b];
}

export const isNum = (x: unknown) => !Number.isNaN(Number(x));