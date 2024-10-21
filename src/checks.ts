import { ErrCtx, InvokeError, ops, typeNames, Val } from "./types";

export const asBoo = (val: Val) =>
  val.t === "bool" ? val.v : val.t !== "null";

export function arityCheck(op: string, nArg: number, errCtx: ErrCtx) {
  const { exactArity, maxArity, minArity } = ops[op];
  const aErr = (msg: string, amount: number) => [
    <InvokeError>{
      e: "Arity",
      m: `${op} needs ${msg} argument${amount !== 1 ? "s" : ""}, not ${nArg}`,
      errCtx,
    },
  ];
  if (exactArity !== undefined) {
    if (nArg !== exactArity) {
      return aErr(`exactly ${exactArity}`, exactArity);
    }
  } else {
    if (minArity && !maxArity && nArg < minArity) {
      return aErr(`at least ${minArity}`, minArity);
    } else if (!minArity && maxArity && nArg > maxArity) {
      return aErr(`at most ${maxArity}`, maxArity);
    } else if (minArity && maxArity && (nArg < minArity || nArg > maxArity)) {
      return aErr(`between ${minArity} and ${maxArity}`, maxArity);
    }
  }
}

export function typeCheck(
  op: string,
  args: Val["t"][][],
  errCtx: ErrCtx,
  optimistic = false,
): InvokeError[] | undefined {
  const { params: types, numeric: onlyNum } = ops[op];
  const nArg = args.length;
  if (onlyNum) {
    const nonNumArgIdx = args.findIndex(
      a =>
        !!a.length && (optimistic ? !a.find(t => t === "num") : a[0] !== "num"),
    );
    if (nonNumArgIdx === -1) {
      return;
    }
    const names = args[nonNumArgIdx]!.map(t => typeNames[t]).join(", ");
    return [
      typeErr(`${op} takes numeric arguments only, not ${names}`, errCtx),
    ];
  }
  if (!types) {
    return;
  }
  const typeViolations = types
    .map((need, i) => {
      if (i >= nArg || !args[i] || need === "any") {
        return false;
      }
      const argTypes = args[i]!;
      if (Array.isArray(need)) {
        if (
          optimistic
            ? !argTypes.length || argTypes.some(t => need.includes(t))
            : argTypes.length === 1 && need.includes(argTypes[0])
        ) {
          return false;
        }
        const names = argTypes.map(t => typeNames[t]);
        const needs = need.map(t => typeNames[t]).join(", ");
        return `argument ${i + 1} must be either: ${needs}, not ${names}`;
      } else {
        if (
          optimistic
            ? !argTypes.length || argTypes.includes(need)
            : argTypes.length === 1 && need === argTypes[0]
        ) {
          return false;
        }
        const names = argTypes.map(t => typeNames[t]).join(", ");
        return `argument ${i + 1} must be ${typeNames[need]}, not ${names}`;
      }
    })
    .filter(r => !!r);
  return typeViolations.length
    ? typeViolations.map(v => typeErr(<string>v, errCtx))
    : undefined;
}

export const typeErr = (m: string, errCtx: ErrCtx): InvokeError => ({
  e: "Type",
  m,
  errCtx,
});

export function numOpErr(errCtx: ErrCtx, types: Val["t"][]): InvokeError[] {
  const names = types.map(t => typeNames[t]).join(", ");
  return [
    typeErr(
      `number as operation argument must be string, vector, or dictionary, not ${names}`,
      errCtx,
    ),
  ];
}

export function keyOpErr(errCtx: ErrCtx, types: Val["t"][]): InvokeError[] {
  const names = types.map(t => typeNames[t]).join(", ");
  return [
    typeErr(
      `keyword as operation argument must be dictionary or vector, not ${names}`,
      errCtx,
    ),
  ];
}

export const isLetter = (code: number) =>
  (code >= 65 && code <= 90) || (code >= 97 && code <= 122);

export const isDigit = (code: number) => code >= 48 && code <= 57;

export const isSpace = (code: number) => code === 32 || code === 9;

export const isPunc = (code: number) =>
  !isLetter(code) && !isDigit(code) && !isSpace(code);
