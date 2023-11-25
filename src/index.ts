export const insituxVersion = 231117;
import { asBoo } from "./checks";
import { arityCheck, keyOpErr, numOpErr, typeCheck, typeErr } from "./checks";
import { isLetter, isDigit, isSpace, isPunc } from "./checks";
import { makeEnclosure } from "./closure";
import { forReader, parse } from "./parse";
import * as pf from "./poly-fills";
const { abs, sign, sqrt, floor, ceil, round, max, min, logn, log2, log10 } = pf;
const { cos, sin, tan, acos, asin, atan, sinh, cosh, tanh } = pf;
const { len, concat, has, flat, push, reverse, slice, splice, sortBy } = pf;
const { ends, slen, starts, sub, subIdx, substr, upperCase, lowerCase } = pf;
const { trim, trimStart, trimEnd, strIdx, replace, rreplace } = pf;
const { charCode, codeChar, getTimeMs, randInt, randNum } = pf;
const { isNum, objKeys, range, toNum, isArray, isObj, toRadix, fromRadix } = pf;
import { doTests } from "./test";
import { Env, InvokeError, InvokeResult, InvokeValResult } from "./types";
import { assertUnreachable, ExternalFunctions, syntaxes } from "./types";
import { Ctx, Dict, ErrCtx, Func, Ins, Val, ops, typeNames } from "./types";
import { asArray, dictDrops, isEqual, num, stringify, val2str } from "./val";
import { dic, vec, dictDrop, dictGet, dictSet, toDict, pathSet } from "./val";
import { _boo, _num, _str, _key, _vec, _dic, _nul, _fun, str } from "./val";
import { ixToJson, jsonToIx } from "./val-translate";

let lets: { [key: string]: Val } = {};
/** Used for code coverage reporting. */
let lineCols: { [key: string]: 1 } = {};
const errCtx2lineCol = (errCtx: ErrCtx) =>
  `${errCtx.invokeId}\t${errCtx.line}\t${errCtx.col}`;

type _Exception = { errors: InvokeError[] };
function _throw(errors: InvokeError[]): Val {
  throw <_Exception>{ errors };
}
function isThrown(e: unknown): e is _Exception {
  return !!e && isObj(e) && "errors" in e;
}
const throwTypeErr = (msg: string, errCtx: ErrCtx) =>
  _throw([typeErr(msg, errCtx)]);

function exeOp(op: string, args: Val[], ctx: Ctx, errCtx: ErrCtx): Val {
  switch (op) {
    case "str":
      return _str(stringify(args));
    case "strn":
      return _str(stringify(args.filter(a => a.t !== "null")));
    case "to-base":
    case "from-base": {
      const base = max(min(num(args[0]), 36), 2);
      if (op === "to-base") {
        return _str(toRadix(num(args[1]), base));
      }
      return _num(fromRadix(str(args[1]), num(args[0])));
    }
    case "print":
    case "print-str":
      ctx.print(stringify(args), op === "print");
      return _nul();
    case "vec":
      return _vec(args);
    case "dict":
      return toDict(args);
    case "kv-dict": {
      const shortest = min(...args.map(vec).map(len));
      return _dic({
        keys: slice(vec(args[0]), 0, shortest),
        vals: slice(vec(args[1]), 0, shortest),
      });
    }
    case "len":
      return _num(
        args[0].t === "str"
          ? slen(args[0].v)
          : args[0].t === "vec"
          ? len(args[0].v)
          : len(dic(args[0]).keys),
      );
    case "to-num":
      if (isNum(args[0].v)) {
        return _num(toNum(args[0].v));
      } else {
        return _nul();
      }
    case "to-key":
      return _key(`:${val2str(args[0])}`);
    case "to-vec":
      return _vec(asArray(args[0]));
    case "bool":
      return _boo(asBoo(args[0]));
    case "not":
      return _boo(!asBoo(args[0]));
    case "=":
    case "not=":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
          return _boo(false);
        }
      }
      return _boo(true);
    case "==":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        if (isEqual(args[i - 1], args[i])) {
          return args[0];
        }
      }
      return _nul();
    case "-":
      return _num(args.map(num).reduce((sum, n) => sum - n));
    case "**":
      return _num(num(args[0]) ** (len(args) === 1 ? 2 : num(args[1])));
    case "+":
      return _num(args.map(num).reduce((sum, n) => sum + n));
    case "*":
      return _num(args.map(num).reduce((sum, n) => sum * n));
    case "/":
      return _num(args.map(num).reduce((sum, n) => sum / n));
    case "//":
      return _num(args.map(num).reduce((sum, n) => floor(sum / n)));
    case "+0":
      return _num(args.map(num).reduce((sum, n) => sum + n, 0));
    case "*1":
      return _num(args.map(num).reduce((sum, n) => sum * n, 1));
    case "fast=":
    case "fast!=":
      return _boo(isEqual(args[0], args[1]) === (op === "fast="));
    case "fast-":
      return _num(<number>args[0].v - <number>args[1].v);
    case "fast+":
      return _num(<number>args[0].v + <number>args[1].v);
    case "fast*":
      return _num(<number>args[0].v * <number>args[1].v);
    case "fast/":
      return _num(<number>args[0].v / <number>args[1].v);
    case "fast//":
      return _num(floor(<number>args[0].v / <number>args[1].v));
    case "fast<":
      return _boo(<number>args[0].v < <number>args[1].v);
    case "fast>":
      return _boo(<number>args[0].v > <number>args[1].v);
    case "fast<=":
      return _boo(<number>args[0].v <= <number>args[1].v);
    case "fast>=":
      return _boo(<number>args[0].v >= <number>args[1].v);
    case "neg":
      return _num(-num(args[0]));
    case "rem":
      return _num(args.map(num).reduce((sum, n) => sum % n));
    case "min":
      return _num(args.map(num).reduce((sum, n) => min(sum, n)));
    case "max":
      return _num(args.map(num).reduce((sum, n) => max(sum, n)));
    case "<":
    case ">":
    case "<=":
    case ">=":
      for (let i = 1, lim = len(args); i < lim; ++i) {
        const [a, b] = [<number>args[i - 1].v, <number>args[i].v];
        if (
          (op === "<" && a >= b) ||
          (op === ">" && a <= b) ||
          (op === "<=" && a > b) ||
          (op === ">=" && a < b)
        ) {
          return _boo(false);
        }
      }
      return _boo(true);
    case "str<":
    case "str>":
    case "str<=":
    case "str>=":
      if (args.some(({ t }) => t !== "str")) {
        throwTypeErr("can only compare all string", errCtx);
      }
      for (let i = 1, lim = len(args); i < lim; ++i) {
        const [a, b] = [<string>args[i - 1].v, <string>args[i].v];
        if (
          (op === "str<" && a >= b) ||
          (op === "str>" && a <= b) ||
          (op === "str<=" && a > b) ||
          (op === "str>=" && a < b)
        ) {
          return _boo(false);
        }
      }
      return _boo(true);
    case "inc":
      return _num(<number>args[0].v + 1);
    case "dec":
      return _num(<number>args[0].v - 1);
    case "abs":
      return _num(abs(<number>args[0].v));
    case "round":
      if (len(args) === 2) {
        const x = 10 ** <number>args[0].v;
        return _num(round(<number>args[1].v * x) / x);
      } else {
        return _num(round(<number>args[0].v));
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
      return _num(f(num(args[0])));
    }
    case "asin":
    case "acos":
    case "atan":
    case "sinh":
    case "cosh":
    case "tanh": {
      const f = { asin, acos, atan, sinh, cosh, tanh }[op];
      return _num(f(num(args[0])));
    }
    case "clamp": {
      const [a, b, x] = args.map(num);
      return _num(min(max(a, x), b));
    }
    case "div?":
      return _boo(num(args[0]) % num(args[1]) === 0);
    case "average": {
      const src = vec(args[0]);
      let sum = 0;
      let count = 0;
      for (let i = 0, lim = len(src); i < lim; ++i) {
        if (src[i].t === "num") {
          sum += num(src[i]);
          ++count;
        }
      }
      return _num(sum / count);
    }
    case "and":
      return _boo(args.every(asBoo));
    case "or": {
      const i = args.findIndex(asBoo);
      return i === -1 ? _nul() : args[i];
    }
    case "xor":
      if (asBoo(args[0]) !== asBoo(args[1])) {
        return asBoo(args[0]) ? args[0] : args[1];
      } else {
        return _boo(false);
      }
    case "&":
    case "|":
    case "^":
    case "<<":
    case ">>":
    case ">>>":
      const [a, b] = [num(args[0]), num(args[1])];
      return _num(
        op === "&"
          ? a & b
          : op === "|"
          ? a | b
          : op === "^"
          ? a ^ b
          : op === "<<"
          ? a << b
          : op === ">>"
          ? a >> b
          : a >>> b,
      );
    case "~":
      return _num(~num(args[0]));
    case "odd?":
    case "even?":
      return _boo(num(args[0]) % 2 === (op === "odd?" ? 1 : 0));
    case "pos?":
    case "neg?":
    case "zero?": {
      const n = num(args[0]);
      return _boo(op === "pos?" ? n > 0 : op === "neg?" ? n < 0 : !n);
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
      const { t } = args[0];
      return _boo(
        (op === "func?" && (t === "func" || t === "clo" || t === "unm")) ||
          substr(op, 0, slen(op) - 1) === t,
      );
    }
    case "type-of":
      return _str(args[0].t);
    case "substr?":
      return _boo(!!slen(str(args[0])) && sub(str(args[1]), str(args[0])));
    case "has?":
      if (args[1].t === "dict") {
        return _boo(!!args[1].v.keys.find(x => isEqual(x, args[0])));
      }
      return _boo(!!asArray(args[1]).find(x => isEqual(x, args[0])));
    case "idx":
    case "idx-of":
    case "last-idx":
    case "last-idx-of": {
      const isLast = op === "last-idx" || op === "last-idx-of";
      const [subject, find] =
        op === "idx" || op === "last-idx" ? args : [args[1], args[0]];
      if (subject.t === "str") {
        if (find.t !== "str") {
          throwTypeErr("strings can only contain strings", errCtx);
        } else {
          const s = isLast ? stringify(reverse(asArray(subject))) : subject.v;
          const i = subIdx(s, find.v);
          return i === -1 ? _nul() : _num(isLast ? slen(subject.v) - 1 - i : i);
        }
      } else if (subject.t === "vec") {
        const s = isLast ? reverse(slice(subject.v)) : subject.v;
        const i = s.findIndex(a => isEqual(a, find));
        return i === -1 ? _nul() : _num(isLast ? len(subject.v) - 1 - i : i);
      }
    }
    case "set-at": {
      const [pathVal, replacement, coll] = args;
      return pathSet(vec(pathVal), _ => replacement, coll);
    }
    case "update-at": {
      const [pathVal, replacer, coll] = args;
      const closure = getExe(ctx, replacer, errCtx);
      return pathSet(vec(pathVal), v => closure([v]), coll);
    }
    case "juxt": {
      const makeArg = (value: Val): Ins[] => [
        { typ: "val", value, errCtx },
        { typ: "upa", value: -1, text: "args", errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: 2, errCtx },
      ];
      const ins: Ins[] = [
        ...flat(args.map(makeArg)),
        { typ: "val", value: _fun("vec"), errCtx },
        { typ: "exe", value: len(args), errCtx },
      ];
      return {
        t: "clo",
        v: <Func>{
          name: `(juxt ${args.map(val2str).join(" ")})`,
          ins,
        },
      };
    }
    case "adj": {
      const makeArg = (value: Val, n: number): Ins[] => [
        { typ: "dpa", value: [0, n], errCtx },
        { typ: "val", value, errCtx },
        { typ: "exe", value: 1, errCtx },
      ];
      const ins: Ins[] = [
        { typ: "val", value: _fun("vec"), errCtx },
        ...flat(args.map(makeArg)),
        { typ: "val", value: _num(len(args)), errCtx },
        { typ: "upa", value: 0, text: "x", errCtx },
        { typ: "val", value: _fun("skip"), errCtx },
        { typ: "exe", value: 2, errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: len(args) + 2, errCtx },
      ];
      return {
        t: "clo",
        v: <Func>{ name: `(adj ${args.map(val2str).join(" ")})`, ins },
      };
    }
    case "comp": {
      const ins: Ins[] = [
        { typ: "val", value: args[0], errCtx },
        { typ: "upa", value: -1, text: "args", errCtx },
        { typ: "val", value: _fun("..."), errCtx },
        { typ: "exe", value: 2, errCtx },
        ...flat(
          slice(args, 1).map(value => [
            <Ins>{ typ: "val", value, errCtx },
            <Ins>{ typ: "exe", value: 1, errCtx },
          ]),
        ),
      ];
      return {
        t: "clo",
        v: <Func>{
          name: `(comp ${args.map(val2str).join(" ")})`,
          ins,
        },
      };
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
      return { t: "clo", v: <Func>{ name, ins } };
    }
    case "criteria": {
      const name = `(criteria ${args.map(val2str).join(" ")})`;
      const ins: Ins[] = [
        ...flat(
          args.map((value, i) => {
            const jmp = (len(args) - 1 - i) * 4 + 2;
            return [
              { typ: "upa", value: 0, text: "x", errCtx },
              { typ: "val", value, errCtx },
              { typ: "exe", value: 1, errCtx },
              { typ: "if", value: jmp, errCtx },
            ] as Ins[];
          }),
        ),
        { typ: "val", value: _boo(true), errCtx },
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: _boo(false), errCtx },
      ];
      return { t: "clo", v: <Func>{ name, ins } };
    }
    case "map": {
      const collections = slice(args, 1);
      const badArg = collections.findIndex(
        ({ t }) => t !== "vec" && t !== "str" && t !== "dict",
      );
      if (badArg !== -1) {
        const badType = typeNames[collections[badArg].t];
        throwTypeErr(
          `argument ${
            badArg + 2
          } must be either: string, vector, dictionary, not ${badType}`,
          errCtx,
        );
      }
    }
    case "flat-map":
    case "reduce":
    case "reductions":
    case "filter":
    case "remove":
    case "find":
    case "find-idx":
    case "count":
    case "all?":
    case "some?":
    case "none?": {
      const closure = getExe(ctx, args.shift()!, errCtx);

      if (op === "map" || op === "flat-map") {
        const arrays = args.map(asArray);
        const shortest = min(...arrays.map(len));
        const array: Val[] = [];
        for (let i = 0; i < shortest; ++i) {
          array.push(closure(arrays.map(a => a[i])));
        }
        if (op === "map") {
          return _vec(array);
        }
        const flatArray: Val[] = [];
        for (const v of array) {
          if (v.t === "vec") {
            push(flatArray, v.v);
          } else {
            flatArray.push(v);
          }
        }
        return _vec(flatArray);
      }

      if (op !== "reduce" && op !== "reductions") {
        const array = asArray(args[0]);
        const isRemove = op === "remove",
          isFind = op === "find" || op === "find-idx",
          isCount = op === "count";
        const filtered: Val[] = [];
        let count = 0;
        for (let i = 0, lim = len(array); i < lim; ++i) {
          const b = asBoo(closure([array[i]]));
          if (op === "all?") {
            if (!b) return _boo(false);
          } else if (op === "some?") {
            if (b) return _boo(true);
          } else if (op === "none?") {
            if (b) return _boo(false);
          } else if (isCount) {
            count += b ? 1 : 0;
          } else if (isFind) {
            if (b) return op === "find" ? array[i] : _num(i);
          } else if (b !== isRemove) {
            filtered.push(array[i]);
          }
        }
        switch (op) {
          case "count":
            return _num(count);
          case "find":
          case "find-idx":
            return _nul();
          case "all?":
          case "none?":
            return _boo(true);
          case "some?":
            return _boo(false);
        }
        if (args[0].t === "str") {
          return _str(filtered.map(v => val2str(v)).join(""));
        } else if (args[0].t === "dict") {
          return toDict(flat(filtered.map(v => <Val[]>v.v)));
        } else {
          return _vec(filtered);
        }
      }
      const arrayVal = args.pop()!;
      if (!has(["vec", "dict", "str"], arrayVal.t)) {
        throwTypeErr(
          `must reduce either: string, vector, dictionary, not ${
            typeNames[arrayVal.t]
          }`,
          errCtx,
        );
      }
      const array = asArray(arrayVal);

      if (!len(array)) {
        if (len(args)) {
          return args[0];
        } else {
          return _vec();
        }
      }
      if (len(array) < 2 && !len(args)) {
        return array[0];
      }

      let reduction: Val = (len(args) ? args : array).shift()!;
      if (op === "reductions") {
        const reductions: Val[] = [];
        for (let i = 0, lim = len(array); i < lim; ++i) {
          reductions.push(reduction);
          reduction = closure([reduction, array[i]]);
        }
        reductions.push(reduction);
        return _vec(reductions);
      }
      for (let i = 0, lim = len(array); i < lim; ++i) {
        reduction = closure([reduction, array[i]]);
      }
      return reduction;
    }
    case "max-by":
    case "min-by": {
      const closure = getExe(ctx, args[0], errCtx);
      const coll = asArray(args[1]);
      let bestIdx = 0;
      let bestValue: undefined | number = undefined;
      for (let i = 0, lim = len(coll); i < lim; ++i) {
        const value = closure([coll[i]]);
        if (value.t !== "num") {
          const badTypeName = typeNames[value.t];
          const m = `predicate must return number not ${badTypeName}`;
          return _throw([{ e: "Type", m, errCtx }]);
        }
        if (bestValue === undefined) {
          bestValue = value.v;
          bestIdx = i;
        } else if (
          op === "max-by" ? bestValue < value.v : bestValue > value.v
        ) {
          bestValue = value.v;
          bestIdx = i;
        }
      }
      return coll[bestIdx];
    }
    case "empty?":
    case "nonempty?":
      return _boo((op === "empty?") === !len(asArray(args[0])));
    case "take-while":
    case "take-until":
    case "skip-while":
    case "skip-until":
    case "count-while":
    case "count-until": {
      const isTake = op === "take-while" || op === "take-until";
      const isUntil =
        op === "take-until" || op === "skip-until" || op === "count-until";
      const closure = getExe(ctx, args[0], errCtx);
      const array = asArray(args[1]);

      let i = 0;
      for (let lim = len(array); i < lim; ++i)
        if (asBoo(closure([array[i]])) === isUntil) break;

      if (op === "count-while" || op === "count-until") {
        return _num(i);
      }

      const sliced = isTake ? slice(array, 0, i) : slice(array, i);
      return args[1].t === "str"
        ? _str(sliced.map(str).join(""))
        : _vec(sliced);
    }
    case "sieve":
      return _vec(vec(args[0]).filter(asBoo));
    case "xmap": {
      const closure = getExe(ctx, args[0], errCtx);
      const src = asArray(args[1]);
      const mapped: Val[] = [];
      for (let i = 0, lim = len(src); i < lim; ++i) {
        mapped.push(closure([_num(i), src[i]]));
      }
      return _vec(mapped);
    }
    case "repeat":
    case "times": {
      const toRepeat = args[op === "repeat" ? 0 : 1];
      const result: Val[] = [];
      const count = num(args[op === "repeat" ? 1 : 0]);
      if (count > ctx.rangeBudget) {
        _throw([{ e: "Budget", m: "would exceed range budget", errCtx }]);
      }
      ctx.rangeBudget -= count;
      if (toRepeat.t === "func" || toRepeat.t === "clo") {
        const closure = getExe(ctx, toRepeat, errCtx);
        for (let i = 0; i < count; ++i) {
          result.push(closure([_num(i)]));
        }
      } else {
        for (let i = 0; i < count; ++i) {
          result.push(toRepeat);
        }
      }
      return _vec(result);
    }
    case "rand-int":
    case "rand": {
      const nArgs = len(args);
      const [a, b] = [
        nArgs < 2 ? 0 : num(args[0]),
        nArgs === 0
          ? 1 + toNum(op === "rand-int")
          : nArgs === 1
          ? num(args[0])
          : num(args[1]),
      ];
      return _num(op === "rand-int" ? randInt(a, b) : randNum(a, b));
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
        flatArgs = flat(args.map(a => (a.t === "vec" ? a.v : [a])));
      } else {
        const a = flatArgs.pop()!;
        push(flatArgs, flat([a.t === "vec" ? a.v : [a]]));
      }
      return closure(flatArgs);
    }
    case "proj": {
      const closure = getExe(ctx, args[0], errCtx);
      const results = slice(args, 1).map(x => closure([x]));
      return _vec(results);
    }
    case "into": {
      if (args[0].t === "vec") {
        return _vec(concat(args[0].v, asArray(args[1])));
      } else {
        let dict = dic(args[0]);
        if (args[1].t === "vec") {
          const coll = args[1].v;
          for (let i = 0, imax = len(dict.keys); i < imax - 1; i += 2) {
            dict = dictSet(dict, coll[i], coll[i + 1]);
          }
        } else {
          const dict2 = dic(args[1]);
          for (let i = 0, imax = len(dict2.keys); i < imax; ++i) {
            dict = dictSet(dict, dict2.keys[i], dict2.vals[i]);
          }
        }
        return _dic(dict);
      }
    }
    case "omit":
      return <Val>{ t: "dict", v: dictDrop(dic(args[1]), args[0]) };
    case "omits":
      return <Val>{ t: "dict", v: dictDrops(dic(args[1]), vec(args[0])) };
    case "drop": {
      const [n, v] = [num(args[0]), vec(args[1])];
      const l = len(v);
      const x = min(max(n < 0 ? l + n : n, 0), l);
      return _vec(concat(slice(v, 0, x), slice(v, x + 1)));
    }
    case "assoc":
      return _dic(dictSet(dic(args[2]), args[0], args[1]));
    case "append":
      return _vec(concat(vec(args[1]), [args[0]]));
    case "prepend":
      return _vec(concat([args[0]], vec(args[1])));
    case "insert": {
      const v = vec(args[2]);
      let n = num(args[1]);
      if (n === 0) {
        return _vec(concat([args[0]], v));
      } else if (n === -1) {
        return _vec(concat(v, [args[0]]));
      } else {
        n = n > 0 ? min(n, len(v)) : max(len(v) + 1 + n, 0);
        return _vec(concat(concat(slice(v, 0, n), [args[0]]), slice(v, n)));
      }
    }
    case "skip":
    case "first":
    case "last":
    case "trunc":
    case "crop": {
      let a = num(args[0]);
      const b = op === "crop" ? num(args[1]) : 0;
      const { t, v } = args[op === "crop" ? 2 : 1];
      const l = t === "str" ? slen(<string>v) : len(<Val[]>v);
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
      return t === "str"
        ? _str(substr(<string>v, x, y - x))
        : _vec(slice(<Val[]>v, x, y));
    }
    case "reverse":
      if (args[0].t === "str") {
        return _str(stringify(reverse(asArray(args[0]))));
      } else {
        return _vec(reverse(asArray(args[0])));
      }
    case "flatten": {
      const src = vec(args[0]);
      const flattened: Val[] = [];
      const recur = (vec: Val[]): void =>
        vec.forEach(v => (v.t === "vec" ? recur(v.v) : flattened.push(v)));
      recur(src);
      return _vec(flattened);
    }
    case "shuffle": {
      const arr = slice(vec(args[0]));
      for (let i = len(arr) - 1; i; --i) {
        const j = floor(randInt(0, i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return _vec(arr);
    }
    case "sample": {
      const shuffled = slice(vec(args[1]));
      const size = max(0, min(len(shuffled), num(args[0])));
      const minimum = len(shuffled) - size;
      for (let i = len(shuffled) - 1; i >= minimum; --i) {
        const index = floor(randInt(0, i + 1));
        [shuffled[i], shuffled[index]] = [shuffled[index], shuffled[i]];
      }
      return _vec(slice(shuffled, minimum));
    }
    case "rand-pick": {
      const arr = asArray(args[0]);
      const l = len(arr);
      return l ? arr[randInt(0, l)] : _nul();
    }
    case "sort":
    case "sort-by": {
      const src = asArray(args[op === "sort" ? 0 : 1]);
      if (!len(src)) {
        return _vec();
      }
      const mapped: Val[][] = [];
      if (op === "sort") {
        push(
          mapped,
          src.map(v => [v, v]),
        );
      } else {
        const closure = getExe(ctx, args[0], errCtx);
        for (let i = 0, lim = len(src); i < lim; ++i) {
          mapped.push([src[i], closure([src[i]])]);
        }
      }
      const okT = mapped[0][1].t;
      if (mapped.some(([_, { t }]) => t !== okT || !has(["num", "str"], t))) {
        throwTypeErr("can only sort by all number or all string", errCtx);
      }
      if (okT === "num") {
        sortBy(mapped, ([x, a], [y, b]) => (num(a) > num(b) ? 1 : -1));
      } else {
        sortBy(mapped, ([x, a], [y, b]) => (str(a) > str(b) ? 1 : -1));
      }
      return _vec(mapped.map(([v]) => v));
    }
    case "group-by": {
      const closure = getExe(ctx, args[0], errCtx);
      const groups: Dict = { keys: [], vals: [] };
      const isDic = args[1].t === "dict";
      if (isDic) {
        const { keys, vals } = dic(args[1]);
        for (let i = 0, lim = len(keys); i < lim; ++i) {
          const v = closure([keys[i], vals[i]]);
          const existingKey = groups.keys.findIndex(k => isEqual(k, v));
          if (existingKey === -1) {
            groups.keys.push(v);
            groups.vals.push(_dic({ keys: [keys[i]], vals: [vals[i]] }));
          } else {
            const subDict = dic(groups.vals[existingKey]);
            subDict.keys.push(keys[i]);
            subDict.vals.push(vals[i]);
          }
        }
      } else {
        const src = asArray(args[1]);
        for (let i = 0, lim = len(src); i < lim; ++i) {
          const v = closure([src[i]]);
          const existingKey = groups.keys.findIndex(k => isEqual(k, v));
          if (existingKey === -1) {
            groups.keys.push(v);
            groups.vals.push(_vec([src[i]]));
          } else {
            const subVec = vec(groups.vals[existingKey]);
            subVec.push(src[i]);
          }
        }
      }
      return _dic(groups);
    }
    case "part-by": {
      const closure = getExe(ctx, args[0], errCtx);
      const isDic = args[1].t === "dict";
      if (isDic) {
        const { keys, vals } = dic(args[1]);
        const parted: Dict[] = [
          { keys: [], vals: [] },
          { keys: [], vals: [] },
        ];
        for (let i = 0, lim = len(keys); i < lim; ++i) {
          const p = asBoo(closure([keys[i], vals[i]])) ? 0 : 1;
          parted[p].keys.push(keys[i]);
          parted[p].vals.push(vals[i]);
        }
        return _vec(parted.map(_dic));
      } else {
        const src = asArray(args[1]);
        const parted: Val[][] = [[], []];
        for (let i = 0, lim = len(src); i < lim; ++i) {
          parted[asBoo(closure([src[i]])) ? 0 : 1].push(src[i]);
        }
        return _vec(parted.map(_vec));
      }
    }
    case "part-when":
    case "part-before":
    case "part-after": {
      const closure = getExe(ctx, args[0], errCtx);
      const src = asArray(args[1]);
      const isStr = args[1].t === "str";
      let wasTrue = false;
      const forStr = () => {
        const parted: string[] = ["", ""];
        return {
          append: (s: Val) => (parted[wasTrue ? 1 : 0] += str(s)),
          pack: () => _vec(parted.map(_str)),
        };
      };
      const forVec = () => {
        const parted: Val[][] = [[], []];
        return {
          append: (v: Val) => parted[wasTrue ? 1 : 0].push(v),
          pack: () => _vec(parted.map(_vec)),
        };
      };
      const { append, pack } = (isStr ? forStr : forVec)();
      for (let i = 0, lim = len(src); i < lim; ++i) {
        const p = asBoo(closure([src[i]]));
        const now = p && !wasTrue;
        if (now && op !== "part-after") {
          wasTrue = true;
          if (op === "part-when") {
            continue;
          }
        }
        append(src[i]);
        if (now && op === "part-after") {
          wasTrue = true;
        }
      }
      return pack();
    }
    case "part-at": {
      const i = max(0, num(args[0]));
      const coll = args[1];
      if (coll.t === "str") {
        const head = substr(coll.v, 0, i);
        const tail = substr(coll.v, i);
        return _vec([_str(head), _str(tail)]);
      }
      const head = slice(vec(coll), 0, i);
      const tail = slice(vec(coll), i);
      return _vec([_vec(head), _vec(tail)]);
    }
    case "partition": {
      const n = num(args[0]);
      const src = args[1];
      const parted: Val[] = [];
      if (src.t === "str") {
        for (let i = 0, lim = slen(src.v); i < lim; i += n) {
          parted.push(_str(substr(src.v, i, n)));
        }
      } else if (src.t === "vec") {
        for (let i = 0, lim = len(src.v); i < lim; i += n) {
          parted.push(_vec(slice(src.v, i, i + n)));
        }
      }
      return _vec(parted);
    }
    case "split-when":
    case "split-before":
    case "split-after":
    case "split-with": {
      const closure = getExe(ctx, args[0], errCtx);
      const src = asArray(args[1]);
      const head = src[0];
      if (!head) {
        return _vec();
      }
      let previous = closure([head]);
      const split: Val[][] = [op === "split-with" ? [head] : []];
      let wasSplitAfter = false;
      for (let i = op === "split-with" ? 1 : 0, lim = len(src); i < lim; ++i) {
        if (wasSplitAfter) {
          split.push([]);
        }
        const current = src[i];
        const next = closure([current]);
        const doSplit =
          op === "split-with" ? !isEqual(next, previous) : asBoo(next);
        const isSplitBefore = op === "split-before" || op === "split-with";
        if (doSplit && isSplitBefore) {
          split.push([]);
        }
        if (!(op === "split-when" && doSplit)) {
          split[split.length - 1].push(current);
        }
        wasSplitAfter = doSplit && !isSplitBefore;
        previous = next;
      }
      if (args[1].t === "str") {
        return _vec(split.map(s => _str(s.map(str).join(""))));
      }
      return _vec(split.map(_vec));
    }
    case "skip-each": {
      const n = max(num(args[0]), 0);
      const src = asArray(args[1]);
      const skipped: Val[] = [];
      for (let i = 0, lim = len(src); i < lim; i += n + 1) {
        skipped.push(src[i]);
      }
      return args[1].t === "str"
        ? _str(skipped.map(x => `${x.v}`).join(""))
        : _vec(skipped);
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
      return _dic({ keys: distinct, vals: counts.map(_num) });
    }
    case "distinct": {
      const arr = asArray(args[0]);
      const distinct: Val[] = [];
      arr.forEach(a => {
        if (!distinct.some(v => isEqual(a, v))) {
          distinct.push(a);
        }
      });
      return _vec(distinct);
    }
    case "rotate":
    case "interleave": {
      let result: Val[] = [];
      if (op === "rotate") {
        const by = num(args[0]);
        const coll = asArray(args[1]);
        const l = len(coll);
        const n = ((by % l) + l) % l;
        result = concat(slice(coll, n), slice(coll, 0, n));
      } else {
        const colls = args.map(asArray);
        const shortest = min(...colls.map(len));
        for (let i = 0; i < shortest; ++i) {
          for (let c = 0, max = len(colls); c < max; ++c) {
            result.push(colls[c][i]);
          }
        }
      }
      if (args[1].t === "vec") {
        return _vec(result);
      }
      return _str(result.map(val2str).join(""));
    }
    case "range": {
      const [a, b, s] = args.map(num);
      const edgeCase = s && s < 0 && a < b; //e.g. 1 4 -1
      const [x, y] =
        len(args) > 1 ? (edgeCase ? [b - 1, a - 1] : [a, b]) : [0, a];
      const step = sign((y - x) * (s || 1)) * (s || 1);
      const count = ceil(abs((y - x) / step));
      if (!count) {
        return _vec();
      }
      if (count > ctx.rangeBudget) {
        _throw([{ e: "Budget", m: "would exceed range budget", errCtx }]);
      }
      ctx.rangeBudget -= count;
      const nums = range(count).map(n => n * step + x);
      return _vec(nums.map(_num));
    }
    case "keys":
    case "vals":
      return _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
    case "split":
      return _vec(str(args[1]).split(str(args[0])).map(_str));
    case "join":
      return _str(asArray(args[1]).map(val2str).join(str(args[0])));
    case "pad-left":
    case "pad-right": {
      const [space, to, txt] = [str(args[0]), num(args[1]), val2str(args[2])];
      const deficit = to - slen(txt);
      const block = range(min(max(ceil(deficit), 0), 1_000))
        .map(n => space)
        .join("");
      const [left, right] = [
        op === "pad-left" ? block : "",
        op === "pad-right" ? block : "",
      ];
      return _str(left + txt + right);
    }
    case "replace":
    case "rreplace": {
      const rop = op === "replace" ? replace : rreplace;
      return _str(rop(str(args[2]), str(args[0]), str(args[1])));
    }
    case "starts?":
    case "ends?":
      return _boo(
        (op === "starts?" ? starts : ends)(str(args[1]), str(args[0])),
      );
    case "upper-case":
    case "lower-case":
    case "trim":
    case "trim-start":
    case "trim-end":
      return _str(
        (op === "upper-case"
          ? upperCase
          : op === "lower-case"
          ? lowerCase
          : op === "trim"
          ? trim
          : op === "trim-start"
          ? trimStart
          : trimEnd)(str(args[0])),
      );
    case "upper?":
    case "lower?": {
      const s = str(args[0]);
      const code = charCode(s);
      if (op === "upper?") {
        return _boo(code >= 65 && code < 91);
      }
      return _boo(code >= 97 && code < 123);
    }
    case "letter?":
    case "digit?":
    case "space?":
    case "punc?": {
      const s = str(args[0]);
      const f =
        op === "digit?"
          ? isDigit
          : op === "punc?"
          ? isPunc
          : op === "space?"
          ? isSpace
          : isLetter;
      return _boo(f(charCode(s)));
    }
    case "str*": {
      const text =
        args[0].t === "str"
          ? args[0].v
          : args[1].t === "str"
          ? args[1].v
          : null;
      const n =
        args[0].t === "num"
          ? args[0].v
          : args[1].t === "num"
          ? args[1].v
          : null;
      if (text === null || n === null) {
        const m = "arguments must be one string and one number";
        return _throw([{ e: "Type", m, errCtx }]);
      }
      return _str(
        range(min(max(ceil(n), 0), 1_000))
          .map(() => text)
          .join(""),
      );
    }
    case "char-code": {
      if (args[0].t === "str") {
        const n = len(args) > 1 ? num(args[1]) : 0;
        const s = str(args[0]);
        if (slen(s) <= n || n < 0) {
          return _nul();
        } else {
          return _num(charCode(strIdx(s, n)));
        }
      } else {
        return _str(codeChar(num(args[0])));
      }
    }
    case "to-json":
      return _str(ixToJson(args[0]));
    case "from-json":
      return jsonToIx(str(args[0]));
    case "time":
      return _num(getTimeMs());
    case "version":
      return _num(insituxVersion);
    case "tests": {
      const summary = doTests(invoke, !(len(args) && asBoo(args[0])));
      return _str(summary.join("\n"));
    }
    case "symbols": {
      let syms = symbols(ctx.env, false);
      return _vec(syms.map(_str));
    }
    case "eval": {
      delete ctx.env.funcs["entry"];
      const invokeId = `${errCtx.invokeId} eval`;
      try {
        const valOrNone = parseAndExe(ctx, str(args[0]), invokeId, []);
        return valOrNone ?? _nul();
      } catch (e) {
        if (isThrown(e)) {
          return _throw([
            { e: "Eval", m: "error within evaluated code", errCtx },
            ...e.errors,
          ]);
        }
        throw e;
      }
    }
    case "safe-eval": {
      delete ctx.env.funcs["entry"];
      const parsed = parse(str(args[0]), "safe-eval");

      if (len(parsed.errors)) {
        return _throw(parsed.errors);
      }

      //Ensure the only executed operations are vec/dict
      const { entry } = parsed.funcs;
      let dangerous = false;
      let prevIns: Ins | undefined = undefined;
      for (const ins of entry.ins) {
        if (ins.typ === "exe" || ins.typ === "exa") {
          if (!prevIns) {
            dangerous = true;
            break;
          }
          if (
            prevIns.typ !== "val" ||
            !(
              prevIns.value.t === "func" &&
              (prevIns.value.v === "vec" || prevIns.value.v === "dict")
            )
          ) {
            dangerous = true;
            break;
          }
        }
        prevIns = ins;
      }

      if (dangerous) {
        return _nul();
      }

      return exeFunc(ctx, parsed.funcs.entry, [], false);
    }
    case "deref": {
      const derefIns: Ins = { typ: "ref", value: str(args[0]), errCtx };
      const { stack } = exeFunc(ctx, { ins: [derefIns] }, [], true);
      return stack[0];
    }
    case "about": {
      const func = str(args[0]);
      const entry = ops[func];
      if (!entry) {
        return _nul();
      }
      const infos: Val[] = [];
      const info = (what: string, val: Val) =>
        infos.push(_key(`:${what}`), val);
      const toStrVec = (v: (string | string[])[]): Val =>
        _vec(v.map(typ => (isArray(typ) ? _vec(typ.map(_str)) : _str(typ))));
      info("name", _str(func));
      info("external?", _boo(!!entry.external));
      info("has-effects?", _boo(!!entry.hasEffects));
      if (entry.exactArity) {
        info("exact-arity", _num(entry.exactArity));
      } else {
        if (entry.minArity) {
          info("minimum-arity", _num(entry.minArity));
        }
        if (entry.maxArity) {
          info("maximum-arity", _num(entry.maxArity));
        }
      }
      if (entry.params || entry.numeric) {
        info("in-types", toStrVec(entry.params ? entry.params : ["num"]));
      }
      if (entry.returns || entry.numeric === true) {
        info("out-types", toStrVec(entry.returns ? entry.returns : ["num"]));
      }
      info("mocked?", _boo(!!ctx.env.mocks[func]));
      return toDict(infos);
    }
    case "val-origin": {
      const valOrigin = args[0].lineCol;
      if (!valOrigin) {
        return _key(":unavailable");
      }
      const [invokeId, line, col] = valOrigin?.split("\t");
      const dictVals = [
        _key(":invoke-id"),
        _str(invokeId),
        _key(":line"),
        _num(parseInt(line)),
        _key(":column"),
        _num(parseInt(col)),
      ];
      return toDict(dictVals);
    }
    case "reset":
      ctx.env.vars = {};
      ctx.env.funcs = {};
      ctx.env.mocks = {};
      return _nul();
    case "assert":
      for (let a = 0, alen = len(args); a < alen; ++a) {
        if (!asBoo(args[a])) {
          _throw([{ e: "Assert", m: `argument ${a + 1} was falsy`, errCtx }]);
        }
      }
      return args[len(args) - 1];
    case "mock": {
      const defs = args.filter((n, i) => !(i % 2));
      const vals = args.filter((n, i) => !!(i % 2));
      if (len(defs) !== len(vals)) {
        const m = "provide a value after each definition to mock";
        _throw([{ e: "Arity", m, errCtx }]);
      }
      const badDef = defs.find(d => d.t !== "str" && d.t !== "func");
      if (badDef) {
        const m = `can only mock string or function types, not ${
          typeNames[badDef.t]
        }`;
        _throw([{ e: "Type", m, errCtx }]);
      }
      for (let i = 0, lim = len(defs); i < lim; ++i) {
        const def = str(defs[i]);
        if (has(["mock", "unmock", "unmocked", "reset"], def)) {
          const m =
            "you can't mock the mock, unmock, unmocked, reset functions";
          _throw([{ e: "Mock", m, errCtx }]);
        }
        ctx.env.mocks[str(defs[i])] = vals[i];
      }
      return _nul();
    }
    case "unmock": {
      if (!len(args)) {
        ctx.env.mocks = {};
      }
      const badDef = args.find(d => d.t !== "str" && d.t !== "func");
      if (badDef) {
        const m = `definitions must be string or function types, not ${
          typeNames[badDef.t]
        }`;
        _throw([{ e: "Type", m, errCtx }]);
      }
      for (const def of args) {
        delete ctx.env.mocks[str(def)];
      }
      return _nul();
    }
    case "unmocked":
      return { t: "unm", v: str(args[0]) };
  }

  return _throw([{ e: "Unexpected", m: "operation doesn't exist", errCtx }]);
}

const monoArityError = (t: Val["t"], errCtx: ErrCtx) => [
  {
    e: "Arity",
    m: `${typeNames[t]} as operation requires one sole argument`,
    errCtx,
  },
];

function checks(op: string, args: Val[], errCtx: ErrCtx, checkArity: boolean) {
  //Optional arity check
  if (checkArity) {
    const violations = arityCheck(op, len(args), errCtx);
    if (violations) {
      return violations;
    }
  }
  //Argument type check
  const types = args.map(a => [a.t]);
  const violations = typeCheck(op, types, errCtx);
  return violations ? violations : false;
}

function getExe(
  ctx: Ctx,
  op: Val,
  errCtx: ErrCtx,
  checkArity = true,
): (params: Val[]) => Val {
  if (op.t === "str" || op.t === "func" || op.t === "unm") {
    const name = op.v;
    if (op.t !== "unm" && name in ctx.env.mocks) {
      return getExe(ctx, ctx.env.mocks[name], errCtx);
    }
    if (ops[name]) {
      if (ops[name].external) {
        return (params: Val[]) => {
          const violations = checks(name, params, errCtx, checkArity);
          if (violations) {
            _throw(violations);
          }
          const valOrErr =
            ctx.functions[name].handler(params, errCtx) || _nul();
          if ("err" in valOrErr) {
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
        const ret = exeOp(name, params, ctx, errCtx);
        if (ctx.valOriginTracking) {
          ret.lineCol = errCtx2lineCol(errCtx);
        }
        return ret;
      };
    }
    if (name in ctx.env.funcs && name !== "entry") {
      return (params: Val[]) =>
        exeFunc(ctx, ctx.env.funcs[name], params, false);
    }
    if (name in lets) {
      return getExe(ctx, lets[name], errCtx);
    }
    if (name in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[name], errCtx);
    }
    if (starts(name, "$")) {
      return (params: Val[]) => {
        if (!len(params)) {
          _throw(monoArityError(op.t, errCtx));
        }
        if (!ctx.set) {
          const m = `"set" feature not implemented on this platform`;
          return _throw([{ e: "External", m, errCtx }]);
        }
        const err = ctx.set(substr(name, 1), params[0]);
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
      if ("err" in valAndErr) {
        return _throw([{ e: "External", m: valAndErr.err, errCtx }]);
      }
      return valAndErr;
    };
  } else if (op.t === "clo") {
    return (params: Val[]) => exeFunc(ctx, op.v, params, false);
  } else if (op.t === "key") {
    return (params: Val[]) => {
      if (!len(params)) {
        _throw(monoArityError(op.t, errCtx));
      }
      if (params[0].t === "dict") {
        return dictGet(dic(params[0]), op);
      } else if (params[0].t === "vec") {
        const found = vec(params[0]).find(v => isEqual(v, op));
        return found ?? _nul();
      } else {
        return _throw(keyOpErr(errCtx, [params[0].t]));
      }
    };
  } else if (op.t === "num") {
    const n = floor(op.v);
    return (params: Val[]) => {
      if (!len(params)) {
        _throw(monoArityError(op.t, errCtx));
      }
      const a = params[0];
      if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
        return _throw(numOpErr(errCtx, [a.t]));
      }
      const arr = asArray(a),
        alen = len(arr);
      if ((n >= 0 && n >= alen) || (n < 0 && -n > alen)) {
        return _nul();
      } else if (n < 0) {
        return arr[alen + n];
      }
      return arr[n];
    };
  } else if (op.t === "vec") {
    const { v } = op;
    return (params: Val[]) => {
      if (!len(params)) {
        _throw(monoArityError(op.t, errCtx));
      }
      const found = v.find(val => isEqual(val, params[0]));
      return found ?? _nul();
    };
  } else if (op.t === "dict") {
    const dict = op.v;
    return (params: Val[]) => {
      if (len(params) === 1) {
        return dictGet(dict, params[0]);
      } else if (len(params) === 2) {
        return _dic(dictSet(dict, params[0], params[1]));
      }
      return _throw([
        { e: "Arity", m: "provide 1 or 2 arguments for dictionary", errCtx },
      ]);
    };
  } else if (op.t === "bool") {
    const cond = op.v;
    return (params: Val[]) => {
      if (!len(params) || len(params) > 2) {
        return _throw([
          { e: "Arity", m: "provide 1 or 2 arguments for boolean", errCtx },
        ]);
      }
      return cond ? params[0] : len(params) > 1 ? params[1] : _nul();
    };
  } else if (op.t === "wild") {
    return (params: Val[]) => {
      if (!len(params)) {
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
    let dict = newKey({ keys: [], vals: [] }, ":e", _str(e));
    dict = newKey(dict, ":m", _str(m));
    dict = newKey(dict, ":line", _num(errCtx.line));
    dict = newKey(dict, ":col", _num(errCtx.col));
    return _dic(dict);
  });
}

function destruct(args: Val[], shape: number[], rest?: true): Val {
  let arr: Val[] = args;
  for (let a = 0, b = len(shape) - 1; a < b; ++a) {
    const val = arr[shape[a]];
    if (!val) {
      return _nul();
    } else if (val.t === "vec") {
      arr = val.v;
    } else if (val.t === "str" && a + 1 === b && shape[a + 1] < slen(val.v)) {
      return _str(strIdx(val.v, shape[a + 1]));
    } else {
      return _nul();
    }
  }
  const pos = shape[len(shape) - 1];
  if (rest) {
    return _vec(slice(arr, pos));
  }
  if (pos >= len(arr)) {
    return _nul();
  }
  return arr[pos];
}

type ValsWithFlag = { stack: Val[]; flag?: "brk" | "cnt" | "ret" };

function exeFunc(ctx: Ctx, func: Func, args: Val[], closureOrFor: false): Val;
function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[],
  closureOrFor: true,
): ValsWithFlag;
function exeFunc(
  ctx: Ctx,
  func: Func,
  args: Val[],
  closureOrFor: boolean,
): Val | ValsWithFlag {
  --ctx.callBudget;
  const prevLets = lets;
  let myLets: { [key: string]: Val } = {};
  if (!closureOrFor) {
    lets = myLets;
  }
  let flag: undefined | "brk" | "cnt" | "ret";
  const stack: Val[] = [];
  for (let i = 0, lim = len(func.ins); i < lim; ++i) {
    const ins = func.ins[i];
    const { errCtx } = ins;

    const tooManyLoops = ctx.loopBudget < 1;
    if (tooManyLoops || ctx.callBudget < 1) {
      const m = `${tooManyLoops ? "looped" : "called"} too many times`;
      _throw([{ e: "Budget", m, errCtx }]);
    }

    if (ctx.coverageReport) {
      delete lineCols[errCtx2lineCol(ins.errCtx)];
    }

    switch (ins.typ) {
      case "val":
        if (ctx.valOriginTracking) {
          ins.value.lineCol = errCtx2lineCol(ins.errCtx);
        }
        stack.push(ins.value);
        break;
      case "var":
        ctx.env.vars[ins.value] = stack[len(stack) - 1];
        break;
      case "let":
        lets[ins.value] = stack[len(stack) - 1];
        break;
      case "dle":
      case "dva": {
        const val = stack.pop()!;
        let last: Val | undefined;
        ins.value.forEach(({ name, position, rest }) => {
          const destructured = destruct([val], position, rest);
          if (ins.typ === "dva") {
            last = ctx.env.vars[name] = destructured;
          } else {
            last = lets[name] = destructured;
          }
        });
        stack.push(last!);
        break;
      }
      case "npa":
      case "upa": {
        const paramIdx = ins.value;
        if (paramIdx === -1) {
          stack.push(_vec(args));
        } else if (len(args) <= paramIdx) {
          stack.push(_nul());
        } else {
          stack.push(args[paramIdx]);
        }
        break;
      }
      case "dpa":
        stack.push(destruct(args, ins.value, ins.rest));
        break;
      case "ref": {
        const name = ins.value;
        if (ops[name]) {
          stack.push(_fun(name));
        } else if (name in lets) {
          stack.push(lets[name]);
        } else if (name in ctx.env.vars) {
          stack.push(ctx.env.vars[name]);
        } else if (name in ctx.env.funcs) {
          stack.push(_fun(name));
        } else if (starts(name, "$")) {
          if (!ctx.get) {
            const m = `"get" feature not implemented on this platform`;
            return _throw([{ e: "External", m, errCtx }]);
          }
          const valAndErr = ctx.get(substr(name, 1));
          if ("err" in valAndErr) {
            return _throw([{ e: "External", m: valAndErr.err, errCtx }]);
          }
          stack.push(valAndErr);
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
        const params = splice(stack, len(stack) - nArgs, nArgs);
        try {
          stack.push(closure(params));
        } catch (e) {
          if (isThrown(e)) {
            //Find next catch statement
            const nextCat = slice(func.ins, i).findIndex(
              ins => ins.typ === "cat",
            );
            if (nextCat !== -1) {
              i += nextCat;
              lets["errors"] = _vec(errorsToDict(e.errors));
              break;
            }
          }
          throw e;
        }
        break;
      }
      case "or":
        if (asBoo(stack[len(stack) - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      case "mat": {
        const cond = stack[len(stack) - 2];
        if (!isEqual(cond, stack.pop()!)) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      }
      case "sat": {
        const cond = stack[len(stack) - 2];
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
          splice(stack, len(stack) - ins.value, ins.value);
        }
        break;
      case "ret":
        if (!ins.value) {
          stack.push(_nul());
        }
        i = lim;
        if (closureOrFor) {
          flag = "ret";
        }
        break;
      case "rec": {
        lets = myLets = {};
        i = -1;
        args = splice(stack, len(stack) - ins.value, ins.value);
        --ctx.recurBudget;
        if (!ctx.recurBudget) {
          _throw([{ e: "Budget", m: `recurred too many times`, errCtx }]);
        }
        break;
      }
      case "clo": {
        //Ensure any in-scope declarations are captured here
        const derefIns: Ins[] = slice(ins.value.derefs).map(ins => {
          const decl =
            ins.typ === "val" &&
            ins.value.t === "str" &&
            (lets[ins.value.v] ?? ctx.env.vars[ins.value.v]);
          return decl ? { typ: "val", value: decl, errCtx } : ins;
        });
        //Dereference closure captures
        const captures = exeFunc(ctx, { ins: derefIns }, args, true).stack;
        //Enclose the closure with dereferenced values
        const cins = slice(func.ins, i + 1, i + 1 + ins.value.length);
        stack.push({ t: "clo", v: makeEnclosure(ins.value, cins, captures) });
        i += ins.value.length;
        break;
      }
      case "for": {
        const { defAndVals, body } = forReader(ins, i + 1, func.ins);
        const ret: Val[] = [];
        const iterators = defAndVals.map(x => 0);
        const lengths = defAndVals.map(x => 0);
        const collections: Val[][] = defAndVals.map(x => []);
        const maxDepth = len(lengths);
        let collDepth = 0;
        let evalDepth = 0;
        let flag: ValsWithFlag["flag"];

        do {
          //Execute definition with collection value
          if (evalDepth < collDepth) {
            const value = collections[evalDepth][iterators[evalDepth]];
            const ins: Ins[] = [
              { typ: "val", value, errCtx },
              defAndVals[evalDepth].def,
            ];
            exeFunc(ctx, { ins }, args, true);
            ++evalDepth;
          }
          //Evaluate collection
          if (collDepth !== maxDepth) {
            const {
              stack: [coll],
            } = exeFunc(ctx, { ins: defAndVals[collDepth].val }, args, true);
            if (coll.t !== "vec" && coll.t !== "str" && coll.t !== "dict") {
              const badTypeName = typeNames[coll.t];
              const m = `can only iterate over vector, string, or dictionary, not ${badTypeName}`;
              return _throw([{ e: "Type", m, errCtx }]);
            }
            const collection = asArray(coll);
            collections[collDepth] = collection;
            const collLen = len(collection);
            if (!collLen) {
              if (++iterators[collDepth - 1] === lengths[collDepth - 1]) {
                if (!collDepth) {
                  break;
                } else {
                  --collDepth;
                  iterators[collDepth] = 0;
                }
              }
              --evalDepth;
            } else {
              lengths[collDepth] = collLen;
              ++collDepth;
            }
          }
          if (collDepth !== maxDepth || evalDepth !== maxDepth) {
            continue;
          }
          --ctx.loopBudget;
          if (!ctx.loopBudget) {
            _throw([{ e: "Budget", m: "looped too many times", errCtx }]);
          }
          //Execute body
          const bodyResult = exeFunc(ctx, { ins: body }, args, true);
          flag = bodyResult.flag;
          const value = bodyResult.stack[len(bodyResult.stack) - 1];
          if (flag === "brk") {
            break;
          }
          if (flag === "ret") {
            stack.push(value);
            i = lim;
            break;
          }
          if (flag !== "cnt") {
            ret.push(value);
          }
          --evalDepth;
          while (
            collDepth &&
            ++iterators[collDepth - 1] === lengths[collDepth - 1]
          ) {
            --collDepth;
            --evalDepth;
            iterators[collDepth] = 0;
          }
        } while (collDepth);

        if (flag !== "ret") {
          stack.push(_vec(ret));
        }

        //Skip instructions involved in this for
        i += ins.totalLen;
        break;
      }
      case "brk":
      case "cnt":
        flag = ins.typ;
        i = lim;
        break;
      default:
        assertUnreachable(ins);
    }
  }
  lets = prevLets;
  if (closureOrFor) {
    return { stack, flag };
  }
  return stack[len(stack) - 1];
}

function parseAndExe(
  ctx: Ctx,
  code: string,
  invokeId: string,
  params: Val[],
): Val | undefined {
  const parsed = parse(code, invokeId);
  if (len(parsed.errors)) {
    _throw(parsed.errors);
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  lineCols = parsed.lineCols.reduce((acc, lineCol) => {
    acc[lineCol] = 1;
    return acc;
  }, {} as { [key: string]: 1 });
  if (!("entry" in ctx.env.funcs)) {
    ctx.coverageReport?.(objKeys(lineCols), parsed.lineCols);
    return;
  }
  const result = exeFunc(ctx, ctx.env.funcs["entry"], params, false);
  ctx.coverageReport?.(objKeys(lineCols), parsed.lineCols);
  return result;
}

function ingestExternalOperations(functions: ExternalFunctions) {
  objKeys(functions).forEach(name => {
    if (ops[name] && !ops[name].external) {
      throw `Redefining internal operations (${name}) is disallowed.`;
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
  const oldLets = lets;
  try {
    value = closure();
  } catch (e) {
    if (!isThrown(e)) {
      throw e;
    }
    errors = e.errors;
  } finally {
    lets = oldLets;
  }
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  delete ctx.env.funcs["entry"];
  if (len(errors)) {
    return { kind: "errors", errors };
  }
  if (printResult && value) {
    ctx.print(val2str(value), true);
  }
  return value ? value : { kind: "empty" };
}

/**
 * Parses and executes the given code.
 * @remark Budgets are frozen then restored.
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
 * @remark Budgets are frozen then restored.
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
    () => exeFunc(ctx, ctx.env.funcs[funcName], params, false),
    printResult,
  );
}

/**
 * Executes a value.
 * @remark Budgets are frozen then restored.
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
): InvokeValResult {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  const ins: Ins[] = [
    ...params.map(value => <Ins>{ typ: "val", value, errCtx }),
    { typ: "val", value: val, errCtx },
    { typ: "exe", value: len(params), errCtx },
  ];
  try {
    return exeFunc(ctx, { ins }, params, false);
  } catch (e) {
    if (!isThrown(e)) {
      throw e;
    }
    return { kind: "errors", errors: e.errors };
  } finally {
    [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
    [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
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
    push(syms, syntaxes);
  }
  push(syms, ["args", "PI", "E", "err-ctx"]);
  syms = concat(syms, objKeys(ops));
  syms = concat(syms, objKeys(env.funcs));
  syms = concat(syms, objKeys(env.vars));
  const hidden = ["entry"];
  syms = syms.filter(o => !has(hidden, o));
  return sortBy(syms, (a, b) => (a > b ? 1 : -1));
}
