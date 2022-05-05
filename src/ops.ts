import { typeErr, _throw } from "./checks";
import { ErrCtx, typeNames, Val } from "./types";
import { _boo, _num } from "./val";

function _numericsTypeThrow(name: string, a: Val, b: Val, errCtx: ErrCtx) {
  return _throw([
    typeErr(
      `${name} takes numeric arguments only, not ${
        a.t !== "num" ? typeNames[a.t] : typeNames[b.t]
      }`,
      errCtx,
    ),
  ]);
}

function _numericTypeThrow(name: string, a: Val, errCtx: ErrCtx) {
  return _throw([
    typeErr(
      `${name} takes a numeric argument only, not ${typeNames[a.t]}`,
      errCtx,
    ),
  ]);
}

export const fastOps: {
  [key: string]: (errCtx: ErrCtx) => (params: Val[]) => Val;
} = {
  "fast+":
    (errCtx: ErrCtx) =>
    ([a, b]: Val[]) =>
      a.t !== "num" || b.t !== "num"
        ? _numericsTypeThrow("fast+", a, b, errCtx)
        : _num(a.v + b.v),
  "fast-":
    (errCtx: ErrCtx) =>
    ([a, b]: Val[]) =>
      a.t !== "num" || b.t !== "num"
        ? _numericsTypeThrow("fast+", a, b, errCtx)
        : _num(a.v - b.v),
  "fast/":
    (errCtx: ErrCtx) =>
    ([a, b]: Val[]) =>
      a.t !== "num" || b.t !== "num"
        ? _numericsTypeThrow("fast/", a, b, errCtx)
        : _num(a.v / b.v),
  "fast<":
    (errCtx: ErrCtx) =>
    ([a, b]: Val[]) =>
      a.t !== "num" || b.t !== "num"
        ? _numericsTypeThrow("fast+", a, b, errCtx)
        : _boo(a.v < b.v),
  inc:
    (errCtx: ErrCtx) =>
    ([a]: Val[]) =>
      a.t !== "num" ? _numericTypeThrow("fast+", a, errCtx) : _num(a.v + 1),
  dec:
    (errCtx: ErrCtx) =>
    ([a]: Val[]) =>
      a.t !== "num" ? _numericTypeThrow("fast+", a, errCtx) : _num(a.v - 1),
};
