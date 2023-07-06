export const insituxVersion = 230702;
import { asBoo } from "./checks";
import { arityCheck, keyOpErr, numOpErr, typeCheck, typeErr } from "./checks";
import { isLetter, isDigit, isSpace, isPunc } from "./checks";
import { makeEnclosure } from "./closure";
import { parse } from "./parse";
import { doTests } from "./test";
import { Env, InvokeError, InvokeResult, Types, isDic, tagged } from "./types";
import { assertUnreachable, ExternalFunctions, syntaxes } from "./types";
import { Ctx, Dict, ErrCtx, Func, Ins, Val, ops, typeNames } from "./types";
import { _clo, isNum, valType } from "./val";
import { asArray, dictDrops, isEqual, stringify, val2str } from "./val";
import { dictDrop, dictGet, dictSet, toDict, pathSet } from "./val";
import { _key, _nul, _fun } from "./val";

const { sin, cos, tan, sqrt, floor, ceil, log: logn, log2, log10 } = Math;
const { min, max, abs, round, asin, acos, atan, sinh, cosh, tanh, sign } = Math;

let letsStack: { [key: string]: Val }[] = [];
let lets: (typeof letsStack)[0] = {};
let recurArgs: undefined | Val[];

type _Exception = { errors: InvokeError[] };
function _throw(errors: InvokeError[]): Val {
  throw <_Exception>{ errors };
}
function isThrown(e: unknown): e is _Exception {
  return !!e && typeof e === "object" && "errors" in e;
}
const throwTypeErr = (msg: string, errCtx: ErrCtx) =>
  _throw([typeErr(msg, errCtx)]);

const randNum = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(randNum(a, b));
export const range = (len: number) => [...Array(len).keys()];

function exeOp(op: string, args: Val[], ctx: Ctx, errCtx: ErrCtx): Val {
  switch (op) {
    case "str":
      return stringify(args);
    case "strn":
      return stringify(args.filter(a => tagged(a) && a.t !== "null"));
    case "print":
    case "print-str":
      ctx.print(stringify(args), op === "print");
      return _nul();
    case "vec":
      return args;
    case "dict":
      return toDict(args);
    case "kv-dict":
      return <Dict>{ keys: args[0], vals: args[1] };
    case "len":
      return Array.isArray(args[0]) || typeof args[0] === "string"
        ? args[0].length
        : (<Dict>args[0]).keys.length;
    case "to-num":
      if (isNum(args[0])) {
        return Number(args[0]);
      } else {
        return _nul();
      }
    case "to-key":
      return _key(`:${val2str(args[0])}`);
    case "to-vec":
      return asArray(args[0]);
    case "bool":
      return asBoo(args[0]);
    case "!":
      return !asBoo(args[0]);
    case "=":
    case "!=":
      for (let i = 1, lim = args.length; i < lim; ++i) {
        if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
          return false;
        }
      }
      return true;
    case "==":
      for (let i = 1, lim = args.length; i < lim; ++i) {
        if (isEqual(args[i - 1], args[i])) {
          return args[0];
        }
      }
      return _nul();
    case "-":
      return (<number[]>args).reduce((sum, n) => sum - n);
    case "**": {
      const a = <number>args[0];
      return a ** (args.length === 1 ? 2 : <number>args[1]);
    }
    case "+":
      return (<number[]>args).reduce((sum, n) => sum + n);
    case "*":
      return (<number[]>args).reduce((sum, n) => sum * n);
    case "/":
      return (<number[]>args).reduce((sum, n) => sum / n);
    case "//":
      return (<number[]>args).reduce((sum, n) => floor(sum / n));
    case "fast=":
    case "fast!=":
      return isEqual(args[0], args[1]) === (op === "fast=");
    case "fast-":
      return <number>args[0] - <number>args[1];
    case "fast+":
      return <number>args[0] + <number>args[1];
    case "fast*":
      return <number>args[0] * <number>args[1];
    case "fast/":
      return <number>args[0] / <number>args[1];
    case "fast//":
      return floor(<number>args[0] / <number>args[1]);
    case "fast<":
      return <number>args[0] < <number>args[1];
    case "fast>":
      return <number>args[0] > <number>args[1];
    case "fast<=":
      return <number>args[0] <= <number>args[1];
    case "fast>=":
      return <number>args[0] >= <number>args[1];
    case "neg":
      return -(<number>args[0]);
    case "rem":
      return (<number[]>args).reduce((sum, n) => sum % n);
    case "min":
      return (<number[]>args).reduce((sum, n) => min(sum, n));
    case "max":
      return (<number[]>args).reduce((sum, n) => max(sum, n));
    case "<":
    case ">":
    case "<=":
    case ">=":
      for (let i = 1, lim = args.length; i < lim; ++i) {
        const [a, b] = [<number>args[i - 1], <number>args[i]];
        if (
          (op === "<" && a >= b) ||
          (op === ">" && a <= b) ||
          (op === "<=" && a > b) ||
          (op === ">=" && a < b)
        ) {
          return false;
        }
      }
      return true;
    case "str<":
    case "str>":
    case "str<=":
    case "str>=":
      if (args.some(v => typeof v !== "string")) {
        throwTypeErr("can only compare all string", errCtx);
      }
      for (let i = 1, lim = args.length; i < lim; ++i) {
        const [a, b] = [<string>args[i - 1], <string>args[i]];
        if (
          (op === "str<" && a >= b) ||
          (op === "str>" && a <= b) ||
          (op === "str<=" && a > b) ||
          (op === "str>=" && a < b)
        ) {
          return false;
        }
      }
      return true;
    case "inc":
      return <number>args[0] + 1;
    case "dec":
      return <number>args[0] - 1;
    case "abs":
      return abs(<number>args[0]);
    case "round":
      if (args.length === 2) {
        const x = 10 ** <number>args[0];
        return round(<number>args[1] * x) / x;
      } else {
        return round(<number>args[0]);
      }
    case "sin":
    case "cos":
    case "tan":
    case "sqrt":
    case "floor":
    case "ceil":
    case "logn":
    case "log2":
    case "log10": {
      const f = { sin, cos, tan, sqrt, floor, ceil, logn, log2, log10 }[op];
      return f(<number>args[0]);
    }
    case "asin":
    case "acos":
    case "atan":
    case "sinh":
    case "cosh":
    case "tanh": {
      const f = { asin, acos, atan, sinh, cosh, tanh }[op];
      return f(<number>args[0]);
    }
    case "clamp": {
      const [a, b, x] = <number[]>args;
      return min(max(a, x), b);
    }
    case "div?":
      return <number>args[0] % <number>args[1] === 0;
    case "average": {
      const src = <Val[]>args[0];
      let sum = 0;
      let count = 0;
      for (const x of src) {
        if (typeof x === "number") {
          sum += x;
          ++count;
        }
      }
      return sum / count;
    }
    case "and":
      return args.every(asBoo);
    case "or": {
      const i = args.findIndex(asBoo);
      return i === -1 ? _nul() : args[i];
    }
    case "xor":
      if (asBoo(args[0]) !== asBoo(args[1])) {
        return asBoo(args[0]) ? args[0] : args[1];
      } else {
        return false;
      }
    case "&":
    case "|":
    case "^":
    case "<<":
    case ">>":
    case ">>>":
      const [a, b] = [<number>args[0], <number>args[1]];
      return op === "&"
        ? a & b
        : op === "|"
        ? a | b
        : op === "^"
        ? a ^ b
        : op === "<<"
        ? a << b
        : op === ">>"
        ? a >> b
        : a >>> b;
    case "~":
      return ~(<number>args[0]);
    case "odd?":
    case "even?":
      return <number>args[0] % 2 === (op === "odd?" ? 1 : 0);
    case "pos?":
    case "neg?":
    case "zero?": {
      const n = <number>args[0];
      return op === "pos?" ? n > 0 : op === "neg?" ? n < 0 : !n;
    }
    case "null?":
    case "num?":
    case "bool?":
    case "str?":
    case "dict?":
    case "vec?":
    case "key?":
    case "func?":
    case "wild?":
    case "ext?": {
      const t = valType(args[0]);
      return (
        (op === "func?" && (t === "func" || t === "clo")) ||
        op.substring(0, op.length - 1) === t
      );
    }
    case "type-of":
      return valType(args[0]);
    case "substr?":
      return (
        !!(<string>args[0]).length &&
        (<string>args[1]).includes(<string>args[0])
      );
    case "idx":
    case "idx-of":
    case "last-idx":
    case "last-idx-of": {
      const isLast = op === "last-idx" || op === "last-idx-of";
      const [subject, find] =
        op === "idx" || op === "last-idx" ? args : [args[1], args[0]];
      if (typeof subject === "string") {
        if (typeof find !== "string") {
          throwTypeErr("strings can only contain strings", errCtx);
        } else {
          const s = isLast ? stringify(asArray(subject).reverse()) : subject;
          const i = s.indexOf(find);
          return i === -1 ? _nul() : isLast ? subject.length - 1 - i : i;
        }
      } else if (Array.isArray(subject)) {
        const s = isLast ? [...subject].reverse() : subject;
        const i = s.findIndex(a => isEqual(a, find));
        return i === -1 ? _nul() : isLast ? subject.length - 1 - i : i;
      }
    }
    case "set-at": {
      const [pathVal, replacement, coll] = args;
      return pathSet(<Val[]>pathVal, _ => replacement, coll);
    }
    case "update-at": {
      const [pathVal, replacer, coll] = args;
      const closure = getExe(ctx, replacer, errCtx);
      return pathSet(<Val[]>pathVal, v => closure([v]), coll);
    }
    case "juxt": {
      const makeArg = (value: Val): Ins[] => [
        { typ: "val", value, errCtx },
        { typ: "upa", value: -1, text: "args", errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: 2, errCtx },
      ];
      const ins: Ins[] = [
        ...args.flatMap(makeArg),
        { typ: "val", value: _fun("vec"), errCtx },
        { typ: "exe", value: args.length, errCtx },
      ];
      return _clo({ name: `(juxt ${args.map(val2str).join(" ")})`, ins });
    }
    case "adj": {
      const makeArg = (value: Val, n: number): Ins[] => [
        { typ: "dpa", value: [0, n], errCtx },
        { typ: "val", value, errCtx },
        { typ: "exe", value: 1, errCtx },
      ];
      const ins: Ins[] = [
        { typ: "val", value: _fun("vec"), errCtx },
        ...args.flatMap(makeArg),
        { typ: "val", value: args.length, errCtx },
        { typ: "upa", value: 0, text: "x", errCtx },
        { typ: "val", value: _fun("skip"), errCtx },
        { typ: "exe", value: 2, errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: args.length + 2, errCtx },
      ];
      return _clo({ name: `(adj ${args.map(val2str).join(" ")})`, ins });
    }
    case "comp": {
      const ins: Ins[] = [
        { typ: "val", value: args[0], errCtx },
        { typ: "upa", value: -1, text: "args", errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: 2, errCtx },
        ...args.slice(1).flatMap(
          value =>
            <Ins[]>[
              { typ: "val", value, errCtx },
              { typ: "exe", value: 1, errCtx },
            ],
        ),
      ];
      return _clo({ name: `(comp ${args.map(val2str).join(" ")})`, ins });
    }
    case "toggle": {
      const [a, b] = args;
      const name = `(toggle ${val2str(a)} ${val2str(b)})`;
      const ins: Ins[] = [
        { typ: "upa", value: 0, text: "x", errCtx },
        { typ: "val", value: a, errCtx },
        { typ: "mat", value: 2, errCtx },
        { typ: "val", value: b, errCtx },
        { typ: "jmp", value: 5, errCtx },
        { typ: "val", value: b, errCtx },
        { typ: "mat", value: 2, errCtx },
        { typ: "val", value: a, errCtx },
        { typ: "jmp", value: 1, errCtx },
        { typ: "upa", value: 0, text: "x", errCtx },
      ];
      return _clo({ name, ins });
    }
    case "criteria": {
      const name = `(criteria ${args.map(val2str).join(" ")})`;
      const ins: Ins[] = [
        ...args.flatMap((value, i) => {
          const jmp = (args.length - 1 - i) * 4 + 2;
          return [
            { typ: "upa", value: 0, text: "x", errCtx },
            { typ: "val", value, errCtx },
            { typ: "exe", value: 1, errCtx },
            { typ: "if", value: jmp, errCtx },
          ] as Ins[];
        }),
        { typ: "val", value: true, errCtx },
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: false, errCtx },
      ];
      return _clo({ name, ins });
    }
    case "map":
    case "flat-map":
    case "for":
    case "reduce":
    case "reductions":
    case "filter":
    case "remove":
    case "find":
    case "count":
    case "all?": {
      const closure = getExe(ctx, args.shift()!, errCtx);
      if (op === "map" || op === "for") {
        const badArg = args.findIndex(
          v => !Array.isArray(v) && typeof v !== "string" && !isDic(v),
        );
        if (badArg !== -1) {
          const badType = typeNames[valType(args[badArg])];
          throwTypeErr(
            `argument ${
              badArg + 2
            } must be either: string, vector, dictionary, not ${badType}`,
            errCtx,
          );
        }
      }

      if (op === "for") {
        const arrays = args.map(asArray);
        const lims = arrays.map(x => x.length);
        const divisors = lims.map((_, i) =>
          lims.slice(0, i + 1).reduce((sum, l) => sum * l),
        );
        divisors.unshift(1);
        const lim = divisors.pop()!;
        if (lim > ctx.loopBudget) {
          _throw([{ e: "Budget", m: "would exceed loop budget", errCtx }]);
        }
        const array: Val[] = [];
        for (let t = 0; t < lim; ++t) {
          const argIdxs = divisors.map((d, i) => floor((t / d) % lims[i]));
          array.push(closure(arrays.map((a, i) => a[argIdxs[i]])));
        }
        return array;
      }

      if (op === "map" || op === "flat-map") {
        const arrays = args.map(asArray);
        const shortest = min(...arrays.map(x => x.length));
        const array: Val[] = [];
        for (let i = 0; i < shortest; ++i) {
          array.push(closure(arrays.map(a => a[i])));
        }
        if (op === "map") {
          return array;
        }
        const flatArray: Val[] = [];
        for (const v of array) {
          if (Array.isArray(v)) {
            flatArray.push(...v);
          } else {
            flatArray.push(v);
          }
        }
        return flatArray;
      }

      if (op !== "reduce" && op !== "reductions") {
        const array = asArray(args[0]);
        const isRemove = op === "remove",
          isFind = op === "find",
          isCount = op === "count",
          isAll = op === "all?";
        const filtered: Val[] = [];
        let count = 0;
        for (let i = 0, lim = array.length; i < lim; ++i) {
          const b = asBoo(closure([array[i]]));
          if (isAll) {
            if (!b) {
              return false;
            }
          } else if (isCount) {
            count += b ? 1 : 0;
          } else if (isFind) {
            if (b) {
              return array[i];
            }
          } else if (b !== isRemove) {
            filtered.push(array[i]);
          }
        }
        switch (op) {
          case "count":
            return count;
          case "find":
            return _nul();
          case "all?":
            return true;
        }
        if (typeof args[0] === "string") {
          return filtered.map(v => val2str(v)).join("");
        } else if (isDic(args[0])) {
          return toDict(filtered.flatMap(v => <Val[]>v));
        } else {
          return filtered;
        }
      }
      const arrayVal = args.pop()!;
      if (
        !Array.isArray(arrayVal) &&
        typeof arrayVal !== "string" &&
        !isDic(arrayVal)
      ) {
        throwTypeErr(
          `must reduce either: string, vector, dictionary, not ${
            typeNames[valType(arrayVal)]
          }`,
          errCtx,
        );
      }
      const array = asArray(arrayVal);

      if (!array.length) {
        if (args.length) {
          return args[0];
        } else {
          return [];
        }
      }
      if (array.length < 2 && !args.length) {
        return array[0];
      }

      let reduction: Val = (args.length ? args : array).shift()!;
      if (op === "reductions") {
        const reductions: Val[] = [];
        for (let i = 0, lim = array.length; i < lim; ++i) {
          reductions.push(reduction);
          reduction = closure([reduction, array[i]]);
        }
        reductions.push(reduction);
        return reductions;
      }
      for (let i = 0, lim = array.length; i < lim; ++i) {
        reduction = closure([reduction, array[i]]);
      }
      return reduction;
    }
    case "empty?":
      return !asArray(args[0]).length;
    case "take-while":
    case "take-until":
    case "skip-while":
    case "skip-until": {
      const isTake = op === "take-while" || op === "take-until";
      const isUntil = op === "take-until" || op === "skip-until";
      const closure = getExe(ctx, args[0], errCtx);
      const array = asArray(args[1]);
      let i = 0;
      for (let lim = array.length; i < lim; ++i)
        if (asBoo(closure([array[i]])) === isUntil) break;
      const sliced = isTake ? array.slice(0, i) : array.slice(i);
      return typeof args[1] === "string" ? sliced.join("") : sliced;
    }
    case "sieve":
      return (<Val[]>args[0]).filter(asBoo);
    case "xmap": {
      const closure = getExe(ctx, args[0], errCtx);
      const src = asArray(args[1]);
      const mapped: Val[] = [];
      for (let i = 0, lim = src.length; i < lim; ++i) {
        mapped.push(closure([i, src[i]]));
      }
      return mapped;
    }
    case "repeat":
    case "times": {
      const toRepeat = args[op === "repeat" ? 0 : 1];
      const result: Val[] = [];
      const count = <number>args[op === "repeat" ? 1 : 0];
      if (count > ctx.rangeBudget) {
        _throw([{ e: "Budget", m: "would exceed range budget", errCtx }]);
      }
      ctx.rangeBudget -= count;
      if (tagged(toRepeat) && (toRepeat.t === "func" || toRepeat.t === "clo")) {
        const closure = getExe(ctx, toRepeat, errCtx);
        for (let i = 0; i < count; ++i) {
          result.push(closure([i]));
        }
      } else {
        for (let i = 0; i < count; ++i) {
          result.push(toRepeat);
        }
      }
      return result;
    }
    case "rand-int":
    case "rand": {
      const nArgs = args.length;
      const [a, b] = [
        nArgs < 2 ? 0 : <number>args[0],
        nArgs === 0
          ? 1 + Number(op === "rand-int")
          : nArgs === 1
          ? <number>args[0]
          : <number>args[1],
      ];
      return op === "rand-int" ? randInt(a, b) : randNum(a, b);
    }
    case "do":
    case "val":
      return op === "do" ? args.pop()! : args.shift()!;
    case ".":
    case "..":
    case "...": {
      const closure = getExe(ctx, args.shift()!, errCtx);
      if (op === ".") {
        return closure(args);
      }
      let flatArgs: Val[] = args;
      if (op === "..") {
        flatArgs = args.flatMap(a => (Array.isArray(a) ? a : [a]));
      } else {
        const a = flatArgs.pop()!;
        flatArgs.push(...(Array.isArray(a) ? a : [a]));
      }
      return closure(flatArgs);
    }
    case "into": {
      if (Array.isArray(args[0])) {
        return [...args[0], ...asArray(args[1])];
      } else {
        if (Array.isArray(args[1])) {
          return toDict([...asArray(args[0]).flat(), ...args[1]]);
        } else {
          const { keys: ks1, vals: vs1 } = <Dict>args[0];
          const { keys: ks2, vals: vs2 } = <Dict>args[1];
          return { keys: [...ks1, ...ks2], vals: [...vs1, ...vs2] };
        }
      }
    }
    case "omit":
      return dictDrop(<Dict>args[1], args[0]);
    case "omits":
      return dictDrops(<Dict>args[1], <Val[]>args[0]);
    case "drop": {
      const [n, v] = [<number>args[0], <Val[]>args[1]];
      const l = v.length;
      const x = min(max(n < 0 ? l + n : n, 0), l);
      return [...v.slice(0, x), ...v.slice(x + 1)];
    }
    case "assoc":
      return dictSet(<Dict>args[2], args[0], args[1]);
    case "append":
      return [...(<Val[]>args[1]), args[0]];
    case "prepend":
      return [args[0], ...(<Val[]>args[1])];
    case "insert": {
      const v = <Val[]>args[2];
      let n = <number>args[1];
      if (n === 0) {
        return [args[0], ...v];
      } else if (n === -1) {
        return [...v, args[0]];
      } else {
        n = n > 0 ? min(n, v.length) : max(v.length + 1 + n, 0);
        return [...v.slice(0, n), args[0], ...v.slice(n)];
      }
    }
    case "sect": {
      const v = args[0];
      const vlen = (<Val[] | string>v).length;
      let a = 0,
        b = vlen;
      switch (args.length) {
        case 1:
          a = 1;
          break;
        case 2: {
          const del = <number>args[1];
          if (del < 0) {
            b += del;
          } else {
            a += del;
          }
          break;
        }
        case 3: {
          const skip = <number>args[1];
          const take = <number>args[2];
          a = skip < 0 ? vlen + skip + (take < 0 ? take : 0) : a + skip;
          b = (take < 0 ? b : a) + take;
          break;
        }
      }
      a = max(a, 0);
      b = min(b, vlen);
      if (a > b) {
        return Array.isArray(v) ? [] : "";
      }
      if (Array.isArray(v)) {
        return v.slice(a, b);
      } else {
        return (<string>args[0]).substring(a, b);
      }
    }
    case "skip":
    case "first":
    case "last":
    case "trunc":
    case "crop": {
      let a = <number>args[0];
      const b = op === "crop" ? <number>args[1] : 0;
      const val = args[op === "crop" ? 2 : 1];
      const l = (<string | Val[]>val).length;
      if (a < 0) {
        a = op === "crop" ? a + l : 0;
      }
      let x =
        op === "first" ? 0 : op === "trunc" ? 0 : op === "last" ? l - a : a;
      const yIfCrop = b < 0 ? -b : l - b;
      const y =
        op === "first"
          ? a
          : op === "trunc"
          ? l - a
          : op === "crop"
          ? yIfCrop
          : l;
      x = x > y ? y : x;
      return typeof val === "string"
        ? val.substring(x, y)
        : (<Val[]>val).slice(x, y);
    }
    case "reverse":
      if (typeof args[0] === "string") {
        return stringify(asArray(args[0]).reverse());
      } else {
        return asArray(args[0]).reverse();
      }
    case "flatten": {
      const src = <Val[]>args[0];
      const flattened: Val[] = [];
      const recur = (vec: Val[]): void =>
        vec.forEach(v => (Array.isArray(v) ? recur(v) : flattened.push(v)));
      recur(src);
      return flattened;
    }
    case "shuffle": {
      const arr = [...(<Val[]>args[0])];
      for (let i = arr.length - 1; i; --i) {
        const j = floor(randInt(0, i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    case "sample": {
      const shuffled = [...(<Val[]>args[1])];
      const size = max(0, min(shuffled.length, <number>args[0]));
      const minimum = shuffled.length - size;
      for (let i = shuffled.length - 1; i >= minimum; --i) {
        const index = floor(randInt(0, i + 1));
        [shuffled[i], shuffled[index]] = [shuffled[index], shuffled[i]];
      }
      return shuffled.slice(minimum);
    }
    case "rand-pick": {
      const arr = <Val[]>args[0];
      return arr[randInt(0, arr.length)];
    }
    case "sort":
    case "sort-by": {
      const src = asArray(args[op === "sort" ? 0 : 1]);
      if (!src.length) {
        return [];
      }
      const mapped: Val[][] = [];
      if (op === "sort") {
        mapped.push(...src.map(v => [v, v]));
      } else {
        const closure = getExe(ctx, args[0], errCtx);
        for (let i = 0, lim = src.length; i < lim; ++i) {
          mapped.push([src[i], closure([src[i]])]);
        }
      }
      const okT = valType(mapped[0][1]);
      if (
        mapped.some(
          ([_, v]) =>
            valType(v) !== okT ||
            !(typeof v === "number" || typeof v === "string"),
        )
      ) {
        throwTypeErr("can only sort by all number or all string", errCtx);
      }
      if (okT === "num") {
        mapped.sort(([x, a], [y, b]) => (<number>a > <number>b ? 1 : -1));
      } else {
        mapped.sort(([x, a], [y, b]) => (<string>a > <string>b ? 1 : -1));
      }
      return mapped.map(([v]) => v);
    }
    case "group-by": {
      const closure = getExe(ctx, args[0], errCtx);
      const groups: Dict = { keys: [], vals: [] };
      if (isDic(args[1])) {
        const { keys, vals } = args[1];
        for (let i = 0, lim = keys.length; i < lim; ++i) {
          const v = closure([keys[i], vals[i]]);
          const existingKey = groups.keys.findIndex(k => isEqual(k, v));
          if (existingKey === -1) {
            groups.keys.push(v);
            groups.vals.push({ keys: [keys[i]], vals: [vals[i]] });
          } else {
            const subDict = <Dict>groups.vals[existingKey];
            subDict.keys.push(keys[i]);
            subDict.vals.push(vals[i]);
          }
        }
      } else {
        const src = asArray(args[1]);
        for (let i = 0, lim = src.length; i < lim; ++i) {
          const v = closure([src[i]]);
          const existingKey = groups.keys.findIndex(k => isEqual(k, v));
          if (existingKey === -1) {
            groups.keys.push(v);
            groups.vals.push([src[i]]);
          } else {
            const subVec = <Val[]>groups.vals[existingKey];
            subVec.push(src[i]);
          }
        }
      }
      return groups;
    }
    case "part-by": {
      const closure = getExe(ctx, args[0], errCtx);
      if (isDic(args[1])) {
        const { keys, vals } = args[1];
        const parted: Dict[] = [
          { keys: [], vals: [] },
          { keys: [], vals: [] },
        ];
        for (let i = 0, lim = keys.length; i < lim; ++i) {
          const p = asBoo(closure([keys[i], vals[i]])) ? 0 : 1;
          parted[p].keys.push(keys[i]);
          parted[p].vals.push(vals[i]);
        }
        return parted;
      } else {
        const src = asArray(args[1]);
        const parted: Val[][] = [[], []];
        for (let i = 0, lim = src.length; i < lim; ++i) {
          parted[asBoo(closure([src[i]])) ? 0 : 1].push(src[i]);
        }
        return parted;
      }
    }
    case "part-when": {
      const closure = getExe(ctx, args[0], errCtx);
      const src = asArray(args[1]);
      const isStr = typeof args[1] === "string";
      let wasTrue = false;
      if (isStr) {
        const parted: string[] = ["", ""];
        for (let i = 0, lim = src.length; i < lim; ++i) {
          const p = asBoo(closure([src[i]]));
          if (p && !wasTrue) {
            wasTrue = true;
            continue;
          }
          parted[wasTrue ? 1 : 0] += <string>src[i];
        }
        return parted;
      } else {
        const parted: Val[][] = [[], []];
        for (let i = 0, lim = src.length; i < lim; ++i) {
          const p = asBoo(closure([src[i]]));
          if (p && !wasTrue) {
            wasTrue = true;
            continue;
          }
          parted[wasTrue ? 1 : 0].push(src[i]);
        }
        return parted;
      }
    }
    case "partition": {
      const n = <number>args[0];
      const src = args[1];
      const parted: Val[] = [];
      if (typeof src === "string") {
        for (let i = 0, lim = src.length; i < lim; i += n) {
          parted.push(src.substring(i, i + n));
        }
      } else if (Array.isArray(src)) {
        for (let i = 0, lim = src.length; i < lim; i += n) {
          parted.push(src.slice(i, i + n));
        }
      }
      return parted;
    }
    case "skip-each": {
      const n = max(<number>args[0], 0);
      const src = asArray(args[1]);
      const skipped: Val[] = [];
      for (let i = 0, lim = src.length; i < lim; i += n + 1) {
        skipped.push(src[i]);
      }
      return typeof args[1] === "string"
        ? skipped.map(x => `${x}`).join("")
        : skipped;
    }
    case "freqs": {
      const src = asArray(args[0]);
      const distinct: Val[] = [];
      const counts: number[] = [];
      src.forEach(x => {
        const i = distinct.findIndex(y => isEqual(x, y));
        if (i !== -1) {
          ++counts[i];
        } else {
          distinct.push(x);
          counts.push(1);
        }
      });
      return { keys: distinct, vals: counts };
    }
    case "distinct": {
      const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const distinct: Val[] = [];
      arr.forEach(a => {
        if (!distinct.some(v => isEqual(a, v))) {
          distinct.push(a);
        }
      });
      return distinct;
    }
    case "range": {
      const [a, b, s] = <number[]>args;
      const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
      const [x, y] =
        args.length > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
      const step = sign((y - x) * (s || 1)) * (s || 1);
      const count = ceil(abs((y - x) / step));
      if (!count) {
        return [];
      }
      if (count > ctx.rangeBudget) {
        _throw([{ e: "Budget", m: "would exceed range budget", errCtx }]);
      }
      ctx.rangeBudget -= count;
      const nums = range(count).map(n => n * step + x);
      return nums;
    }
    case "keys":
    case "vals":
      return (<Dict>args[0])[op === "keys" ? "keys" : "vals"];
    case "split":
      return (<string>args[1]).split(<string>args[0]);
    case "join":
      return asArray(args[1])
        .map(val2str)
        .join(<string>args[0]);
    case "replace":
    case "rreplace": {
      const a = <string>args[0];
      const b = <string>args[1];
      const c = <string>args[2];
      return op === "replace"
        ? c.replaceAll(a, b)
        : c.replace(new RegExp(a, "g"), b);
    }
    case "starts?":
    case "ends?": {
      const a = <string>args[0];
      const b = <string>args[1];
      return (
        (op === "starts?" ? a.startsWith(b) : a.endsWith(b)) ||
        (a === "" && b === "")
      );
    }
    case "upper-case":
      return (<string>args[0]).toUpperCase();
    case "lower-case":
      return (<string>args[0]).toLowerCase();
    case "trim":
      return (<string>args[0]).trim();
    case "trim-start":
      return (<string>args[0]).trimStart();
    case "trim-end":
      return (<string>args[0]).trimEnd();
    case "upper?":
    case "lower?": {
      const s = <string>args[0];
      const x = op === "upper?" ? s.toUpperCase() : s.toLowerCase();
      return s === x;
    }
    case "letter?":
    case "digit?":
    case "space?":
    case "punc?": {
      const s = <string>args[0];
      const f =
        op === "digit?"
          ? isDigit
          : op === "punc?"
          ? isPunc
          : op === "space?"
          ? isSpace
          : isLetter;
      return f(s.charCodeAt(0));
    }
    case "str*": {
      const text = <string>args[0];
      return range(max(ceil(<number>args[1]), 0))
        .map(n => text)
        .join("");
    }
    case "char-code": {
      if (typeof args[0] === "string") {
        const n = args.length > 1 ? <number>args[1] : 0;
        const s = <string>args[0];
        if (s.length <= n || n < 0) {
          return _nul();
        } else {
          return s.charCodeAt(n);
        }
      } else {
        return String.fromCharCode(<number>args[0]);
      }
    }
    case "time":
      return new Date().getTime();
    case "version":
      return insituxVersion;
    case "tests": {
      const letsTemp = lets;
      const summary = doTests(invoke, !(args.length && asBoo(args[0])));
      lets = letsTemp;
      return summary.join("\n");
    }
    case "symbols": {
      let syms = symbols(ctx.env, false);
      if (args.length && asBoo(args[0])) {
        syms = syms.filter(s => !ops[s]?.hasEffects ?? false);
      }
      return syms;
    }
    case "eval": {
      delete ctx.env.funcs["entry"];
      const invokeId = `${errCtx.invokeId} eval`;
      try {
        const valOrNone = parseAndExe(ctx, <string>args[0], invokeId, []);
        return valOrNone ? valOrNone : _nul();
      } catch (e) {
        if (isThrown(e)) {
          _throw([
            { e: "Eval", m: "error within evaluated code", errCtx },
            ...e.errors,
          ]);
        }
      }
    }
    case "about": {
      const func = <string>args[0];
      const entry = ops[func];
      if (!entry) {
        return _nul();
      }
      const infos: Val[] = [];
      const info = (what: string, val: Val) =>
        infos.push(_key(`:${what}`), val);
      info("name", func);
      info("external?", !!entry.external);
      if (entry.exactArity) {
        info("exact-arity", entry.exactArity);
      } else {
        if (entry.minArity) {
          info("minimum-arity", entry.minArity);
        }
        if (entry.maxArity) {
          info("maximum-arity", entry.maxArity);
        }
      }
      if (entry.params || entry.numeric) {
        info("in-types", entry.params ? entry.params : ["num"]);
      }
      if (entry.returns || entry.numeric === true) {
        info("out-types", entry.returns ? entry.returns : ["num"]);
      }
      return toDict(infos);
    }
    case "recur":
      recurArgs = args;
      return _nul();
    case "reset":
      ctx.env.vars = {};
      ctx.env.funcs = {};
      return _nul();
  }

  return _throw([{ e: "Unexpected", m: "operation doesn't exist", errCtx }]);
}

const monoArityError = (t: Types, errCtx: ErrCtx) => [
  {
    e: "Arity",
    m: `${typeNames[t]} as operation requires one sole argument`,
    errCtx,
  },
];

function checks(op: string, args: Val[], errCtx: ErrCtx, checkArity: boolean) {
  //Optional arity check
  if (checkArity) {
    const violations = arityCheck(op, args.length, errCtx);
    if (violations) {
      return violations;
    }
  }
  //Argument type check
  const types = args.map(a => [valType(a)]);
  const violations = typeCheck(op, types, errCtx);
  return violations ? violations : false;
}

function getExe(
  ctx: Ctx,
  op: Val,
  errCtx: ErrCtx,
  checkArity = true,
): (params: Val[]) => Val {
  if (typeof op === "string" || (tagged(op) && op.t === "func")) {
    const name = typeof op === "string" ? op : op.v;
    if (ops[name]) {
      if (ops[name].external) {
        return (params: Val[]) => {
          const violations = checks(name, params, errCtx, checkArity);
          if (violations) {
            _throw(violations);
          }
          const oldLetsStack = [...letsStack];
          const valOrErr =
            ctx.functions[name].handler(params, errCtx) || _nul();
          letsStack = oldLetsStack; //In case invoker was called externally
          if (typeof valOrErr === "object" && "err" in valOrErr) {
            return _throw([{ e: "External", m: valOrErr.err, errCtx }]);
          }
          return valOrErr;
        };
      }
      return (params: Val[]) => {
        const violations = checks(name, params, errCtx, true);
        if (violations) {
          _throw(violations);
        }
        return exeOp(name, params, ctx, errCtx);
      };
    }
    if (name in ctx.env.funcs && name !== "entry") {
      return (params: Val[]) => exeFunc(ctx, ctx.env.funcs[name], params);
    }
    if (name in lets) {
      return getExe(ctx, lets[name], errCtx);
    }
    if (name in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[name], errCtx);
    }
    if (name.startsWith("$")) {
      return (params: Val[]) => {
        if (!params.length) {
          _throw(monoArityError(valType(op), errCtx));
        }
        if (!ctx.set) {
          const m = `"set" feature not implemented on this platform`;
          return _throw([{ e: "External", m, errCtx }]);
        }
        const err = ctx.set(name.substring(1), params[0]);
        if (err) {
          _throw([{ e: "External", m: err, errCtx }]);
        }
        return params[0];
      };
    }
    return (params: Val[]) => {
      if (!ctx.exe) {
        const m = `operation "${name}" does not exist"`;
        return _throw([{ e: "External", m, errCtx }]);
      }
      const valAndErr = ctx.exe(name, params);
      if (typeof valAndErr === "object" && "err" in valAndErr) {
        return _throw([{ e: "External", m: valAndErr.err, errCtx }]);
      }
      return valAndErr;
    };
  } else if (tagged(op) && op.t === "clo") {
    return (params: Val[]) => exeFunc(ctx, op, params);
  } else if (tagged(op) && op.t === "key") {
    return (params: Val[]) => {
      if (!params.length) {
        _throw(monoArityError(valType(op), errCtx));
      }
      if (isDic(params[0])) {
        return dictGet(params[0], op);
      } else if (Array.isArray(params[0])) {
        const found = params[0].find(v => isEqual(v, op));
        return found ?? _nul();
      } else {
        return _throw(keyOpErr(errCtx, [valType(params[0])]));
      }
    };
  } else if (typeof op === "number") {
    const n = floor(op);
    return (params: Val[]) => {
      if (!params.length) {
        _throw(monoArityError("num", errCtx));
      }
      const a = params[0];
      if (typeof a !== "string" && !Array.isArray(a) && !isDic(a)) {
        return _throw(numOpErr(errCtx, [valType(a)]));
      }
      const arr = asArray(a),
        alen = arr.length;
      if ((n >= 0 && n >= alen) || (n < 0 && -n > alen)) {
        return _nul();
      } else if (n < 0) {
        return arr[alen + n];
      }
      return arr[n];
    };
  } else if (Array.isArray(op)) {
    return (params: Val[]) => {
      if (!params.length) {
        _throw(monoArityError("vec", errCtx));
      }
      const found = op.find(val => isEqual(val, params[0]));
      return found ?? _nul();
    };
  } else if (isDic(op)) {
    return (params: Val[]) => {
      if (params.length === 1) {
        return dictGet(op, params[0]);
      } else if (params.length === 2) {
        return dictSet(op, params[0], params[1]);
      }
      return _throw([
        { e: "Arity", m: "provide 1 or 2 arguments for dictionary", errCtx },
      ]);
    };
  } else if (typeof op === "boolean") {
    return (params: Val[]) => {
      if (!params.length || params.length > 2) {
        return _throw([
          { e: "Arity", m: "provide 1 or 2 arguments for boolean", errCtx },
        ]);
      }
      return op ? params[0] : params.length > 1 ? params[1] : _nul();
    };
  } else if (op.t === "wild") {
    return (params: Val[]) => {
      if (!params.length) {
        _throw(monoArityError(op.t, errCtx));
      }
      return params[0];
    };
  }
  return _ =>
    _throw([
      { e: "Operation", m: `${val2str(op)} is an invalid operation`, errCtx },
    ]);
}

function errorsToDict(errors: InvokeError[]) {
  const newKey = (d: Dict, k: string, v: Val) => dictSet(d, _key(k), v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", e);
    dict = newKey(dict, ":m", m);
    dict = newKey(dict, ":line", errCtx.line);
    dict = newKey(dict, ":col", errCtx.col);
    return dict;
  });
}

function destruct(args: Val[], shape: number[]): Val {
  let arr: Val[] = args;
  for (let a = 0, b = shape.length - 1; a < b; ++a) {
    const val = arr[shape[a]];
    if (!val) {
      return _nul();
    } else if (Array.isArray(val)) {
      arr = val;
    } else if (
      typeof val === "string" &&
      a + 1 === b &&
      shape[a + 1] < val.length
    ) {
      return val[shape[a + 1]];
    } else {
      return _nul();
    }
  }
  const pos = shape[shape.length - 1];
  return pos >= arr.length ? _nul() : arr[pos];
}

function exeFunc(ctx: Ctx, func: Func, args: Val[], closureDeref = false): Val {
  --ctx.callBudget;
  if (!closureDeref) {
    letsStack.push({});
    lets = letsStack[letsStack.length - 1];
  }
  const stack: Val[] = [];
  for (let i = 0, lim = func.ins.length; i < lim; ++i) {
    const ins = func.ins[i];
    const { errCtx } = func.ins[i];

    const tooManyLoops = ctx.loopBudget < 1;
    if (tooManyLoops || ctx.callBudget < 1) {
      _throw([
        {
          e: "Budget",
          m: `${tooManyLoops ? "looped" : "called"} too many times`,
          errCtx,
        },
      ]);
    }

    switch (ins.typ) {
      case "val":
        stack.push(ins.value);
        break;
      case "var":
        ctx.env.vars[ins.value] = stack[stack.length - 1];
        break;
      case "let":
        lets[ins.value] = stack[stack.length - 1];
        break;
      case "dle":
      case "dva": {
        const val = stack.pop()!;
        let last: Val | undefined;
        ins.value.forEach(({ name, position }) => {
          if (ins.typ === "dva") {
            last = ctx.env.vars[name] = destruct([val], position);
          } else {
            last = lets[name] = destruct([val], position);
          }
        });
        stack.push(last!);
        break;
      }
      case "npa":
      case "upa": {
        const paramIdx = ins.value;
        if (paramIdx === -1) {
          stack.push(args);
        } else if (args.length <= paramIdx) {
          stack.push(_nul());
        } else {
          stack.push(args[paramIdx]);
        }
        break;
      }
      case "dpa":
        stack.push(destruct(args, ins.value));
        break;
      case "ref": {
        const name = ins.value;
        if (ops[name]) {
          stack.push(_fun(name));
        } else if (name.startsWith("$")) {
          if (!ctx.get) {
            const m = `"get" feature not implemented on this platform`;
            return _throw([{ e: "External", m, errCtx }]);
          }
          const valAndErr = ctx.get(name.substring(1));
          if (typeof valAndErr === "object" && "err" in valAndErr) {
            return _throw([{ e: "External", m: valAndErr.err, errCtx }]);
          }
          stack.push(valAndErr);
        } else if (name in lets) {
          stack.push(lets[name]);
        } else if (name in ctx.env.vars) {
          stack.push(ctx.env.vars[name]);
        } else if (name in ctx.env.funcs) {
          stack.push(_fun(name));
        } else {
          _throw([{ e: "Reference", m: `"${name}" did not exist`, errCtx }]);
        }
        break;
      }
      case "exa":
      case "exe": {
        const op = stack.pop()!;
        const closure = getExe(ctx, op, errCtx, ins.typ === "exa");
        const nArgs = ins.value;
        const params = stack.splice(stack.length - nArgs, nArgs);
        try {
          stack.push(closure(params));
        } catch (e) {
          if (isThrown(e)) {
            //Find next catch statement
            const nextCat = func.ins
              .slice(i)
              .findIndex(ins => ins.typ === "cat");
            if (nextCat !== -1) {
              i += nextCat;
              lets["errors"] = errorsToDict(e.errors);
              break;
            }
          }
          throw e;
        }
        if (recurArgs) {
          letsStack[letsStack.length - 1] = {};
          i = -1;
          args = recurArgs;
          recurArgs = undefined;
          --ctx.recurBudget;
          if (!ctx.recurBudget) {
            _throw([{ e: "Budget", m: `recurred too many times`, errCtx }]);
          }
        }
        break;
      }
      case "or":
        if (asBoo(stack[stack.length - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      case "mat": {
        const cond = stack[stack.length - 2];
        if (!isEqual(cond, stack.pop()!)) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      }
      case "sat": {
        const cond = stack[stack.length - 2];
        const closure = getExe(ctx, stack.pop()!, errCtx);
        if (!asBoo(closure([cond]))) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      }
      case "if":
        if (!asBoo(stack.pop()!)) {
          i += ins.value;
        }
        break;
      case "jmp":
      case "cat":
        i += ins.value;
        break;
      case "loo":
        i += ins.value;
        --ctx.loopBudget;
        break;
      case "pop":
        if (ins.value === 1) {
          stack.pop();
        } else {
          stack.splice(stack.length - ins.value, ins.value);
        }
        break;
      case "ret":
        if (!ins.value) {
          stack.push(_nul());
        }
        i = lim;
        break;
      case "clo": {
        //Ensure any in-scope declarations are captured here
        const derefIns = ins.value.derefs.map(ins => {
          const decl =
            ins.typ === "val" &&
            typeof ins.value === "string" &&
            (lets[ins.value] ?? ctx.env.vars[ins.value]);
          return decl ? <Ins>{ typ: "val", value: decl } : ins;
        });
        //Dereference closure captures
        const captures = <Val[]>exeFunc(ctx, { ins: derefIns }, args, true);
        //Enclose the closure with dereferenced values
        const cins = func.ins.slice(i + 1, i + 1 + ins.value.length);
        stack.push(_clo(makeEnclosure(ins.value, cins, captures)));
        i += ins.value.length;
        break;
      }
      default:
        assertUnreachable(ins);
    }
  }
  if (closureDeref) {
    return stack;
  } else {
    letsStack.pop();
    lets = letsStack[letsStack.length - 1];
  }
  return stack[stack.length - 1];
}

function parseAndExe(
  ctx: Ctx,
  code: string,
  invokeId: string,
  params: Val[],
): Val | undefined {
  const parsed = parse(code, invokeId);
  if (parsed.errors.length) {
    _throw(parsed.errors);
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return;
  }
  return exeFunc(ctx, ctx.env.funcs["entry"], params);
}

function ingestExternalOperations(functions: ExternalFunctions) {
  Object.keys(functions).forEach(name => {
    if (ops[name] && !ops[name].external) {
      throw "Redefining internal operations is disallowed.";
    }
    ops[name] = { ...functions[name].definition, external: true };
  });
}

export function removeExternalOperations(functionNames: string[]) {
  functionNames.forEach(name => {
    if (ops[name] && !ops[name].external) {
      throw "Removing internal operations is disallowed.";
    }
    delete ops[name];
  });
}

function innerInvoke(
  ctx: Ctx,
  closure: () => Val | undefined,
  printResult: boolean,
): InvokeResult {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  ingestExternalOperations(ctx.functions);
  let errors: InvokeError[] = [];
  let value: Val | undefined;
  try {
    value = closure();
  } catch (e) {
    if (!isThrown(e)) {
      throw e;
    }
    errors = e.errors;
  }
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  delete ctx.env.funcs["entry"];
  letsStack = [];
  if (errors.length) {
    return { kind: "errors", errors };
  }
  if (printResult && value) {
    ctx.print(val2str(value), true);
  }
  return value ? value : { kind: "empty" };
}

/**
 * Parses and executes the given code.
 * @param ctx An environment context you retain.
 * @param code The code to parse and execute.
 * @param invokeId A unique ID referenced in invocation errors.
 * @param printResult Automatically print the final value of this invocation?
 * @returns Invocation errors caused during execution of the code,
 * or the final value of the invocation.
 */
export function invoke(
  ctx: Ctx,
  code: string,
  invokeId: string,
  printResult = false,
  params: Val[] = [],
): InvokeResult {
  return innerInvoke(
    ctx,
    () => parseAndExe(ctx, code, invokeId, params),
    printResult,
  );
}

/**
 * Executes a user-defined Insitux function by name.
 * @param ctx An environment context you retain.
 * @param funcName The function to execute.
 * @param params The parameters to pass to the function.
 * @param printResult Automatically print the final value of this invocation?
 * @returns Invocation errors caused during execution of the function,
 * or the final value of the invocation,
 * or undefined if the function was not found.
 */
export function invokeFunction(
  ctx: Ctx,
  funcName: string,
  params: Val[],
  printResult = false,
): InvokeResult | undefined {
  if (!(funcName in ctx.env.funcs)) {
    return;
  }
  return innerInvoke(
    ctx,
    () => exeFunc(ctx, ctx.env.funcs[funcName], params),
    printResult,
  );
}

/**
 * Executes a value
 * @param ctx An environment context you retain.
 * @param value The value to execute.
 * @returns Invocation errors caused during the execution of the function,
 * or the final value of the invocation.
 */
export function invokeVal(
  ctx: Ctx,
  errCtx: ErrCtx,
  val: Val,
  params: Val[],
): InvokeResult {
  const ins: Ins[] = [
    ...params.map(value => <Ins>{ typ: "val", value, errCtx }),
    { typ: "val", value: val, errCtx },
    { typ: "exe", value: params.length, errCtx },
  ];
  try {
    return exeFunc(ctx, { ins }, params);
  } catch (e) {
    if (!isThrown(e)) {
      throw e;
    }
    return { kind: "errors", errors: e.errors };
  }
}

/**
 * @param env An environment context you retain.
 * @param alsoSyntax To optionally include syntax symbols.
 * @returns List of symbols defined in Insitux, including built-in operations,
 * (optionally) syntax, constants, and user-defined functions.
 */
export function symbols(env: Env, alsoSyntax = true): string[] {
  let syms: string[] = [];
  if (alsoSyntax) {
    syms.push(...syntaxes);
  }
  syms.push("args", "PI", "E");
  syms = [...syms, ...Object.keys(ops)];
  syms = [...syms, ...Object.keys(env.funcs)];
  syms = [...syms, ...Object.keys(env.vars)];
  const hidden = ["entry"];
  syms = syms.filter(o => !hidden.includes(o));
  return syms.sort((a, b) => (a > b ? 1 : -1));
}
