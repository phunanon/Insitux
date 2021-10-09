/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 147:
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ 521:
/***/ ((module) => {

module.exports = require("readline");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// NAMESPACE OBJECT: ./src/poly-fills.ts
var poly_fills_namespaceObject = {};
__webpack_require__.r(poly_fills_namespaceObject);
__webpack_require__.d(poly_fills_namespaceObject, {
  "abs": () => (abs),
  "ceil": () => (ceil),
  "concat": () => (concat),
  "cos": () => (cos),
  "ends": () => (ends),
  "flat": () => (flat),
  "floor": () => (floor),
  "getTimeMs": () => (getTimeMs),
  "has": () => (has),
  "isArray": () => (isArray),
  "isNum": () => (isNum),
  "len": () => (len),
  "log10": () => (log10),
  "log2": () => (log2),
  "logn": () => (logn),
  "lowerCase": () => (lowerCase),
  "max": () => (max),
  "min": () => (min),
  "objKeys": () => (objKeys),
  "padEnd": () => (padEnd),
  "pi": () => (pi),
  "push": () => (push),
  "randInt": () => (randInt),
  "randNum": () => (randNum),
  "range": () => (range),
  "reverse": () => (reverse),
  "round": () => (round),
  "sign": () => (sign),
  "sin": () => (sin),
  "slen": () => (slen),
  "slice": () => (slice),
  "sortBy": () => (sortBy),
  "splice": () => (splice),
  "sqrt": () => (sqrt),
  "starts": () => (starts),
  "strIdx": () => (strIdx),
  "sub": () => (sub),
  "subIdx": () => (subIdx),
  "substr": () => (substr),
  "tan": () => (tan),
  "toNum": () => (toNum),
  "trim": () => (trim),
  "trimEnd": () => (trimEnd),
  "trimStart": () => (trimStart),
  "upperCase": () => (upperCase)
});

;// CONCATENATED MODULE: ./src/poly-fills.ts
const toNum = (x) => Number(x);
const slice = (arr, start, end) => arr.slice(start, end);
const splice = (arr, start, numDel) => arr.splice(start, numDel);
const len = (arr) => arr.length;
const slen = (str) => str.length;
const isNum = (x) => !Number.isNaN(Number(x));
const isArray = (x) => Array.isArray(x);
const substr = (str, start, length) => str.substring(start, start + (length ?? str.length));
const strIdx = (str, idx) => str[idx];
const sub = (x, s) => x.includes(s);
const subIdx = (x, s) => x.indexOf(s);
const has = (x, y) => x.includes(y);
const starts = (str, x) => str.startsWith(x);
const ends = (str, x) => str.endsWith(x);
const flat = (arr) => arr.flat();
const concat = (a, b) => a.concat(b);
const push = (arr, add) => arr.push(...add);
const sortBy = (arr, by) => arr.sort(by);
const reverse = (arr) => arr.reverse();
const lowerCase = (str) => str.toLowerCase();
const upperCase = (str) => str.toUpperCase();
const trim = (str) => str.trim();
const trimStart = (str) => str.trimStart();
const trimEnd = (str) => str.trimEnd();
const padEnd = (str, by) => str.padEnd(by);
const randNum = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(randNum(a, b));
const range = (len2) => [...Array(len2).keys()];
const objKeys = (x) => Object.keys(x);
const getTimeMs = () => new Date().getTime();
const abs = Math.abs;
const min = Math.min;
const max = Math.max;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const sqrt = Math.sqrt;
const round = Math.round;
const floor = Math.floor;
const ceil = Math.ceil;
const sign = Math.sign;
const pi = Math.PI;
const logn = Math.log;
const log2 = Math.log2;
const log10 = Math.log10;

;// CONCATENATED MODULE: ./src/types.ts
const ops = {
  print: { returns: ["null"] },
  "print-str": { returns: ["null"] },
  "!": { exactArity: 1, returns: ["bool"] },
  "=": { minArity: 2 },
  "!=": { minArity: 2 },
  "+": { minArity: 2, numeric: true },
  "-": { minArity: 1, numeric: true },
  "*": { minArity: 2, numeric: true },
  "/": { minArity: 2, numeric: true },
  "//": { minArity: 2, numeric: true },
  "**": { minArity: 1, numeric: true },
  "<": { minArity: 2, numeric: true },
  ">": { minArity: 2, numeric: true },
  "<=": { minArity: 2, numeric: true },
  ">=": { minArity: 2, numeric: true },
  "fast=": { exactArity: 2 },
  "fast!=": { exactArity: 2 },
  "fast+": { exactArity: 2, numeric: true },
  "fast-": { exactArity: 2, numeric: true },
  "fast*": { exactArity: 2, numeric: true },
  "fast/": { exactArity: 2, numeric: true },
  "fast//": { exactArity: 2, numeric: true },
  "fast<": { exactArity: 2, numeric: true },
  "fast>": { exactArity: 2, numeric: true },
  "fast<=": { exactArity: 2, numeric: true },
  "fast>=": { exactArity: 2, numeric: true },
  inc: { exactArity: 1, numeric: true },
  dec: { exactArity: 1, numeric: true },
  min: { minArity: 2, numeric: true },
  max: { minArity: 2, numeric: true },
  abs: { exactArity: 1, numeric: true },
  pi: { exactArity: 0, numeric: true },
  sqrt: { exactArity: 1, numeric: true },
  round: { exactArity: 1, numeric: true },
  floor: { exactArity: 1, numeric: true },
  ceil: { exactArity: 1, numeric: true },
  logn: { exactArity: 1, numeric: true },
  log2: { exactArity: 1, numeric: true },
  log10: { exactArity: 1, numeric: true },
  and: { minArity: 1 },
  or: { minArity: 1 },
  "odd?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "even?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "pos?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "neg?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "zero?": { exactArity: 1, numeric: "in only", returns: ["bool"] },
  "null?": { exactArity: 1, returns: ["bool"] },
  "num?": { exactArity: 1, returns: ["bool"] },
  "bool?": { exactArity: 1, returns: ["bool"] },
  "str?": { exactArity: 1, returns: ["bool"] },
  "vec?": { exactArity: 1, returns: ["bool"] },
  "dict?": { exactArity: 1, returns: ["bool"] },
  "key?": { exactArity: 1, returns: ["bool"] },
  "func?": { exactArity: 1, returns: ["bool"] },
  rem: { minArity: 2, numeric: true },
  sin: { exactArity: 1, numeric: true },
  cos: { exactArity: 1, numeric: true },
  tan: { exactArity: 1, numeric: true },
  vec: { returns: ["vec"] },
  dict: { returns: ["dict"] },
  len: { exactArity: 1, types: [["str", "vec", "dict"]], returns: ["num"] },
  "to-num": {
    exactArity: 1,
    types: [["str", "num"]],
    returns: ["num", "null"]
  },
  "to-key": { exactArity: 1, types: [["str", "num"]], returns: ["key"] },
  "has?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  idx: { minArity: 2, maxArity: 3, types: [["str", "vec"]], returns: ["num"] },
  map: { minArity: 2, returns: ["vec"] },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3 },
  filter: { minArity: 2, returns: ["vec"] },
  remove: { minArity: 2, returns: ["vec"] },
  find: { minArity: 2 },
  count: { minArity: 2, returns: ["num"] },
  str: { returns: ["str"] },
  rand: { maxArity: 2, numeric: true, returns: ["num"] },
  "rand-int": { maxArity: 2, numeric: true, returns: ["num"] },
  while: {},
  "..": { minArity: 2 },
  "...": { minArity: 2 },
  into: {
    exactArity: 2,
    types: [
      ["vec", "dict"],
      ["vec", "dict"]
    ],
    returns: ["vec", "dict"]
  },
  push: {
    minArity: 2,
    maxArity: 3,
    types: [["vec", "dict"]],
    returns: ["vec", "dict"]
  },
  sect: {
    minArity: 1,
    maxArity: 3,
    types: [["vec", "str"], "num", "num"],
    returns: ["vec", "str"]
  },
  reverse: { exactArity: 1, types: [["vec", "str"]], returns: ["vec", "str"] },
  sort: { minArity: 1, maxArity: 2, types: ["vec"], returns: ["vec"] },
  keys: { exactArity: 1, types: ["dict"] },
  vals: { exactArity: 1, types: ["dict"] },
  do: { minArity: 1 },
  val: { minArity: 1 },
  range: { minArity: 1, maxArity: 3, numeric: true },
  "empty?": {
    exactArity: 1,
    types: [["str", "vec", "dict"]],
    returns: ["bool"]
  },
  split: { minArity: 1, maxArity: 2, types: ["str", "str"], returns: ["vec"] },
  join: { minArity: 1, maxArity: 2, types: ["vec", "str"], returns: ["str"] },
  "starts-with?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  "ends-with?": { exactArity: 2, types: ["str", "str"], returns: ["bool"] },
  "lower-case": { exactArity: 1, types: ["str"], returns: ["str"] },
  "upper-case": { exactArity: 1, types: ["str"], returns: ["str"] },
  trim: { exactArity: 1, types: ["str"], returns: ["str"] },
  "trim-start": { exactArity: 1, types: ["str"], returns: ["str"] },
  "trim-end": { exactArity: 1, types: ["str"], returns: ["str"] },
  "str*": { exactArity: 2, types: ["str", "num"], returns: ["str"] },
  time: { exactArity: 0, returns: ["num"] },
  version: { exactArity: 0, returns: ["num"] },
  tests: { minArity: 0, maxArity: 1, types: ["bool"], returns: ["str"] },
  symbols: { exactArity: 0, returns: ["vec"] },
  eval: { exactArity: 1, types: ["str"] },
  reset: { exactArity: 0 }
};
const typeNames = {
  null: "null",
  str: "string",
  num: "number",
  bool: "boolean",
  key: "keyword",
  ref: "reference",
  vec: "vector",
  dict: "dictionary",
  func: "function",
  clo: "closure"
};
const assertUnreachable = (_x) => 0;
const typeErr = (m, errCtx) => ({
  e: "Type",
  m,
  errCtx
});
function numOpErr(errCtx, types) {
  const names = types.map((t) => typeNames[t]).join(", ");
  return [
    typeErr(`number as operation argument must be string, vector, or dictionary, not ${names}`, errCtx)
  ];
}
function keyOpErr(errCtx, types) {
  const names = types.map((t) => typeNames[t]).join(", ");
  return [
    typeErr(`keyword as operation argument must be dictionary or vector, not ${names}`, errCtx)
  ];
}

;// CONCATENATED MODULE: ./src/parse.ts

const { concat: parse_concat, has: parse_has, flat: parse_flat, push: parse_push, slice: parse_slice, splice: parse_splice } = poly_fills_namespaceObject;
const { slen: parse_slen, starts: parse_starts, sub: parse_sub, substr: parse_substr, strIdx: parse_strIdx } = poly_fills_namespaceObject;
const { isNum: parse_isNum, len: parse_len, toNum: parse_toNum, isArray: parse_isArray } = poly_fills_namespaceObject;



const nullVal = { t: "null", v: void 0 };
function tokenise(code, invocationId, makeCollsOps = true, emitComments = false) {
  const tokens = [];
  const digits = "0123456789";
  let inString = false, isEscaped = false, inStringAt = [0, 0], inSymbol = false, inNumber = false, inComment = false, line = 1, col = 0;
  for (let i = 0, l = parse_slen(code); i < l; ++i) {
    const c = parse_strIdx(code, i), nextCh = i + 1 !== l ? parse_strIdx(code, i + 1) : "";
    ++col;
    if (inComment) {
      if (c === "\n") {
        inComment = false;
        ++line;
        col = 0;
      } else if (emitComments) {
        tokens[parse_len(tokens) - 1].text += c;
      }
      continue;
    }
    if (isEscaped) {
      isEscaped = false;
      if (inString) {
        tokens[parse_len(tokens) - 1].text += { n: "\n", t: "	", '"': '"' }[c] || `\\${c}`;
      }
      continue;
    }
    if (c === "\\") {
      isEscaped = true;
      continue;
    }
    if (c === '"') {
      if (inString = !inString) {
        inStringAt = [line, col];
        tokens.push({
          typ: "str",
          text: "",
          errCtx: { invocationId, line, col }
        });
      }
      inNumber = inSymbol = false;
      continue;
    }
    const isWhite = parse_sub(" 	\n\r,", c);
    if (!inString && isWhite) {
      inNumber = inSymbol = false;
      if (c === "\n") {
        ++line;
        col = 0;
      }
      continue;
    }
    if (!inString && c === ";") {
      inComment = true;
      if (emitComments) {
        tokens.push({
          typ: "rem",
          text: "",
          errCtx: { invocationId, line, col }
        });
      }
      continue;
    }
    const errCtx = { invocationId, line, col };
    const isDigit = (ch) => parse_sub(digits, ch);
    const isParen = parse_sub("()[]{}", c);
    if (inNumber && !isDigit(c)) {
      inNumber = c === "." && !parse_sub(tokens[parse_len(tokens) - 1].text, ".");
      if (!inNumber && !isParen && !isWhite) {
        inSymbol = true;
        tokens[parse_len(tokens) - 1].typ = "sym";
      }
    }
    if (inSymbol && isParen) {
      inSymbol = false;
    }
    if (!inString && !inSymbol && !inNumber) {
      if (isParen) {
        const parens = {
          "[": "(",
          "{": "(",
          "(": "(",
          ")": ")",
          "}": ")",
          "]": ")"
        };
        const text = parens[c];
        tokens.push({ typ: text, text: makeCollsOps ? text : c, errCtx });
        if (makeCollsOps) {
          if (c === "[") {
            tokens.push({ typ: "sym", text: "vec", errCtx });
          } else if (c === "{") {
            tokens.push({ typ: "sym", text: "dict", errCtx });
          }
        }
        continue;
      }
      inNumber = isDigit(c) || c === "." && isDigit(nextCh) || c === "-" && (isDigit(nextCh) || nextCh === ".");
      inSymbol = !inNumber;
      let typ = inSymbol ? "sym" : "num";
      tokens.push({ typ, text: "", errCtx });
    }
    tokens[parse_len(tokens) - 1].text += c;
  }
  return { tokens, stringError: inString ? inStringAt : void 0 };
}
function segment(tokens) {
  const segments = [[]];
  let depth = 0;
  tokens.forEach((token) => {
    segments[parse_len(segments) - 1].push(token);
    depth += parse_toNum(token.typ === "(") - parse_toNum(token.typ === ")");
    if (depth === 0) {
      segments.push([]);
    }
  });
  return segments;
}
function funcise(segments) {
  const isFunc = (segment2) => parse_len(segment2) > 1 && segment2[1].typ === "sym" && segment2[1].text === "function";
  const funcs = segments.filter((t) => isFunc(t));
  const entries = parse_flat(segments.filter((t) => !isFunc(t)));
  const described = funcs.map((tokens) => ({
    name: tokens[2].text,
    tokens: parse_slice(tokens, 3),
    errCtx: tokens[2].errCtx
  }));
  return parse_len(entries) ? parse_concat(described, [
    {
      name: "entry",
      tokens: entries,
      errCtx: entries[0].errCtx
    }
  ]) : described;
}
function parseAllArgs(tokens, params) {
  const body = [];
  while (true) {
    const exp = parseArg(tokens, params);
    if (!parse_len(exp)) {
      break;
    }
    parse_push(body, exp);
  }
  return body;
}
function arityCheck(op, nArg, errCtx) {
  const { exactArity, maxArity, minArity } = ops[op];
  const aErr = (msg, amount) => [
    {
      e: "Arity",
      m: `${op} needs ${msg} argument${amount !== 1 ? "s" : ""}, not ${nArg}`,
      errCtx
    }
  ];
  if (exactArity !== void 0) {
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
function typeCheck(op, args, errCtx, optimistic = false) {
  const { types, numeric: onlyNum } = ops[op];
  const nArg = parse_len(args);
  if (onlyNum) {
    const nonNumArgIdx = args.findIndex((a) => parse_len(a) && (optimistic ? !a.find((t) => t === "num") : a[0] !== "num"));
    if (nonNumArgIdx === -1) {
      return;
    }
    const names = args[nonNumArgIdx].map((t) => typeNames[t]).join(", ");
    return [
      typeErr(`${op} takes numeric arguments only, not ${names}`, errCtx)
    ];
  }
  if (!types) {
    return;
  }
  const typeViolations = types.map((need, i) => {
    if (i >= nArg || !args[i]) {
      return false;
    }
    const argTypes = args[i];
    if (parse_isArray(need)) {
      if (optimistic ? !parse_len(argTypes) || argTypes.some((t) => parse_has(need, t)) : parse_len(argTypes) === 1 && parse_has(need, argTypes[0])) {
        return false;
      }
      const names = argTypes.map((t) => typeNames[t]);
      const needs = need.map((t) => typeNames[t]).join(", ");
      return `argument ${i + 1} must be either: ${needs}, not ${names}`;
    } else {
      if (optimistic ? !parse_len(argTypes) || parse_has(argTypes, need) : parse_len(argTypes) === 1 && need === argTypes[0]) {
        return false;
      }
      const names = argTypes.map((t) => typeNames[t]);
      return `argument ${i + 1} must be ${typeNames[need]}, not ${names}`;
    }
  }).filter((r) => !!r);
  return parse_len(typeViolations) ? typeViolations.map((v) => typeErr(v, errCtx)) : void 0;
}
function parseForm(tokens, params, checkArity = true) {
  const head = tokens.shift();
  if (!head) {
    return [];
  }
  const { typ, text, errCtx } = head;
  let op = text;
  const err = (value) => [{ typ: "err", value, errCtx }];
  if (op === "catch") {
    if (tokens[0].typ !== "(") {
      return err("argument 1 must be expression");
    }
    const body2 = parseArg(tokens, params);
    const when = parseAllArgs(tokens, params);
    if (!parse_len(body2) || !parse_len(when)) {
      return err("must provide at least 2 arguments");
    }
    return [...body2, { typ: "cat", value: parse_len(when), errCtx }, ...when];
  } else if (op === "var" || op === "let") {
    const ins = [];
    while (true) {
      const defIns = parseArg(tokens, params);
      if (parse_len(ins) && !parse_len(defIns)) {
        return ins;
      }
      const val = parseArg(tokens, params);
      if (!parse_len(ins) && (!parse_len(defIns) || !parse_len(val))) {
        return err(`must provide at least one declaration name and value`);
      } else if (!parse_len(val)) {
        return err(`must provide a value after each declaration name`);
      }
      const def = defIns[0];
      if (def.typ !== "ref") {
        return err("declaration name must be symbol");
      }
      parse_push(ins, val);
      ins.push({ typ: op, value: def.value, errCtx });
    }
  } else if (op === "if" || op === "when") {
    const cond = parseArg(tokens, params);
    if (!parse_len(cond)) {
      return err("must provide condition");
    }
    const ins = cond;
    if (op === "if") {
      const ifT = parseArg(tokens, params);
      if (!parse_len(ifT)) {
        return err("must provide a branch");
      }
      ins.push({ typ: "if", value: parse_len(ifT) + 1, errCtx });
      parse_push(ins, ifT);
      const ifF = parseArg(tokens, params);
      if (parse_len(ifF)) {
        ins.push({ typ: "jmp", value: parse_len(ifF), errCtx });
        parse_push(ins, ifF);
        if (parse_len(parseArg(tokens, params))) {
          return err("too many branches");
        }
      } else {
        ins.push({ typ: "jmp", value: 1, errCtx });
        ins.push({ typ: "val", value: nullVal, errCtx });
      }
    } else {
      const body2 = parseAllArgs(tokens, params);
      ins.push({ typ: "if", value: parse_len(body2) + 1, errCtx });
      parse_push(ins, body2);
      ins.push({ typ: "jmp", value: 1, errCtx });
      ins.push({ typ: "val", value: nullVal, errCtx });
    }
    return ins;
  } else if (op === "and" || op === "or" || op === "while" || op === "recur") {
    const args = [];
    let insCount = 0;
    while (true) {
      const arg = parseArg(tokens, params);
      if (!parse_len(arg)) {
        break;
      }
      args.push(arg);
      insCount += parse_len(arg);
    }
    if (op === "recur") {
      return [...parse_flat(args), { typ: "rec", value: parse_len(args), errCtx }];
    }
    if (parse_len(args) < 2) {
      return err("requires at least two arguments");
    }
    const ins = [];
    if (op === "while") {
      ins.push({ typ: "val", value: nullVal, errCtx });
      insCount += 2;
      const head2 = args.shift();
      parse_push(ins, head2);
      ins.push({ typ: "if", value: insCount - parse_len(head2), errCtx });
      ins.push({ typ: "pop", value: parse_len(args), errCtx });
      args.forEach((as) => parse_push(ins, as));
      ins.push({ typ: "loo", value: -(insCount + 1), errCtx });
      return ins;
    }
    insCount += parse_len(args);
    insCount += parse_toNum(op === "and");
    const typ2 = op === "and" ? "if" : "or";
    for (let a = 0; a < parse_len(args); ++a) {
      parse_push(ins, args[a]);
      insCount -= parse_len(args[a]);
      ins.push({ typ: typ2, value: insCount, errCtx });
      --insCount;
    }
    if (op === "and") {
      parse_push(ins, [
        { typ: "val", value: { t: "bool", v: true }, errCtx },
        { typ: "jmp", value: 1, errCtx },
        { typ: "val", value: { t: "bool", v: false }, errCtx }
      ]);
    } else {
      ins.push({ typ: "val", value: { t: "bool", v: false }, errCtx });
    }
    return ins;
  }
  const headIns = [];
  let nArgs = 0;
  if (typ === "(" || parse_has(params, text) || parse_sub("%#@", parse_strIdx(text, 0))) {
    tokens.unshift(head);
    const ins = parseArg(tokens, params);
    parse_push(headIns, ins);
  }
  const body = [];
  while (parse_len(tokens)) {
    const parsed = parseArg(tokens, params);
    if (!parse_len(parsed)) {
      break;
    }
    ++nArgs;
    parse_push(body, parsed);
  }
  if (op === "return") {
    return [...body, { typ: "ret", value: !!parse_len(body), errCtx }];
  }
  if (ops[op] && checkArity) {
    const errors = arityCheck(op, nArgs, errCtx);
    parse_push(headIns, errors?.map((e) => err(e.m)[0]) ?? []);
    if (!errors) {
      if (nArgs === 2 && ops[`fast${op}`]) {
        op = `fast${op}`;
      }
    }
  }
  if (parse_len(headIns)) {
    headIns.push({ typ: "exe", value: nArgs, errCtx });
  } else {
    const value = typ === "num" ? { t: "num", v: parse_toNum(op) } : parse_starts(op, ":") ? { t: "key", v: op } : ops[op] ? { t: "func", v: op } : op === "true" || op === "false" ? { t: "bool", v: op === "true" } : { t: "str", v: op };
    headIns.push({ typ: "val", value, errCtx });
    headIns.push({ typ: "exe", value: nArgs, errCtx });
  }
  return [...body, ...headIns];
}
function parseArg(tokens, params, checkArity = true) {
  if (!parse_len(tokens)) {
    return [];
  }
  const { typ, text, errCtx } = tokens.shift();
  if (typ === "sym" && parse_sub("#@", text) && parse_len(tokens) && tokens[0].typ === "(") {
    const texts = tokens.map((t) => t.text);
    const body = parseArg(tokens, params, text !== "@");
    const err = body.find((t) => t.typ === "err");
    if (err) {
      return [err];
    }
    const value = [
      parse_slice(texts, 0, parse_len(texts) - parse_len(tokens)).join(" "),
      body
    ];
    return [{ typ: text === "#" ? "clo" : "par", value, errCtx }];
  }
  switch (typ) {
    case "str":
      return [{ typ: "val", value: { t: "str", v: text }, errCtx }];
    case "num":
      return [{ typ: "val", value: { t: "num", v: parse_toNum(text) }, errCtx }];
    case "sym":
      if (text === "true" || text === "false") {
        return [
          { typ: "val", value: { t: "bool", v: text === "true" }, errCtx }
        ];
      } else if (text === "null") {
        return [{ typ: "val", value: nullVal, errCtx }];
      } else if (parse_starts(text, ":")) {
        return [{ typ: "val", value: { t: "key", v: text }, errCtx }];
      } else if (parse_starts(text, "%") && parse_isNum(parse_substr(text, 1))) {
        const value = parse_toNum(parse_substr(text, 1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, errCtx }];
      } else if (parse_has(params, text)) {
        return [{ typ: "npa", value: params.indexOf(text), errCtx }];
      } else if (text === "args") {
        return [{ typ: "upa", value: -1, errCtx }];
      } else if (ops[text]) {
        return [{ typ: "val", value: { t: "func", v: text }, errCtx }];
      }
      return [{ typ: "ref", value: text, errCtx }];
    case "(":
      return parseForm(tokens, params, checkArity);
    case ")":
    case "rem":
      return [];
    default:
      return assertUnreachable(typ);
  }
}
function partitionWhen(array, predicate) {
  const a = [], b = [];
  for (let i = 0, isB = false; i < parse_len(array); ++i) {
    isB || (isB = predicate(array[i]));
    (isB ? b : a).push(array[i]);
  }
  return [a, b];
}
function syntaxise({ name, tokens }, errCtx) {
  const err = (m, eCtx = errCtx) => ["err", { e: "Parse", m, errCtx: eCtx }];
  const [params, body] = partitionWhen(tokens, (t) => t.typ !== "sym" || parse_sub("%#@", t.text));
  if (name === "(") {
    return err("nameless function");
  }
  if (!parse_len(params) && !parse_len(body)) {
    return err("empty function body");
  }
  if (parse_len(body) && body[0].typ === ")") {
    if (parse_len(params)) {
      body.unshift(params.pop());
    } else {
      return err("empty function body");
    }
  }
  if (parse_len(params) && !parse_len(body)) {
    body.push(params.pop());
  }
  const ins = [];
  while (parse_len(body)) {
    parse_push(ins, parseArg(body, params.map((p) => p.text)));
  }
  const parseError = ins.find((i) => i.typ === "err");
  if (parseError) {
    return err(parseError.value, parseError.errCtx);
  }
  return ["func", { name, ins }];
}
function findParenImbalance(tokens, numL, numR) {
  const untimely = numR >= numL;
  const [l, r] = [untimely ? "(" : ")", untimely ? ")" : "("];
  const direction = untimely ? 1 : -1;
  for (let lim = parse_len(tokens), t = untimely ? 0 : lim - 1, depth = 0; untimely ? t < lim : t >= 0; t += direction) {
    const {
      typ,
      errCtx: { line, col }
    } = tokens[t];
    depth += parse_toNum(typ === l) - parse_toNum(typ === r);
    if (depth < 0) {
      return [line, col];
    }
  }
  return [0, 0];
}
function tokenErrorDetect(stringError, tokens) {
  const invocationId = parse_len(tokens) ? tokens[0].errCtx.invocationId : "";
  const errors = [];
  const err = (m, errCtx) => errors.push({ e: "Parse", m, errCtx });
  const countTyp = (t) => parse_len(tokens.filter(({ typ }) => typ === t));
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { invocationId, line, col });
    }
  }
  if (stringError) {
    const [line, col] = stringError;
    err("unmatched double quotation marks", { invocationId, line, col });
  }
  let emptyHead;
  for (let t = 0, lastWasL = false; t < parse_len(tokens); ++t) {
    if (lastWasL && tokens[t].typ === ")") {
      emptyHead = tokens[t];
      break;
    }
    lastWasL = tokens[t].typ === "(";
  }
  if (emptyHead) {
    err("empty expression forbidden", emptyHead.errCtx);
  }
  return errors;
}
function insErrorDetect(fins) {
  const stack = [];
  for (let i = 0, lim = parse_len(fins); i < lim; ++i) {
    const ins = fins[i];
    switch (ins.typ) {
      case "val":
        stack.push({ types: [ins.value.t], val: ins.value });
        break;
      case "exe": {
        const head = stack.pop();
        const args = parse_splice(stack, parse_len(stack) - ins.value, ins.value);
        const badMatch = (okTypes) => args.findIndex(({ types }) => types && !okTypes.find((t) => parse_has(types, t)));
        const headIs = (t) => head.val ? head.val.t === t : head.types && parse_len(head.types) === 1 && head.types[0] === t;
        if (head.val && head.val.t === "func") {
          const errors = typeCheck(head.val.v, args.map((a) => a.types ?? []), ins.errCtx, true);
          if (errors) {
            return errors;
          }
          const { returns, numeric: onlyNum } = ops[head.val.v];
          stack.push(onlyNum && onlyNum !== "in only" ? { types: ["num"] } : { types: returns });
        } else if (headIs("num")) {
          const badArg = badMatch(["str", "dict", "vec"]);
          if (badArg !== -1) {
            return numOpErr(ins.errCtx, args[badArg].types);
          }
          stack.push({});
        } else if (headIs("key")) {
          const badArg = badMatch(["dict", "vec"]);
          if (badArg !== -1) {
            return keyOpErr(ins.errCtx, args[badArg].types);
          }
          stack.push({});
        }
        break;
      }
      case "cat":
      case "or":
      case "var":
      case "let":
      case "loo":
        break;
      case "clo":
      case "par": {
        const errors = insErrorDetect(ins.value[1]);
        if (errors) {
          return errors;
        }
      }
      case "ref":
      case "npa":
      case "upa":
        stack.push({});
        break;
      case "if":
        stack.pop();
        stack.push({});
      case "jmp":
        i += ins.value - (ins.typ === "if" ? 1 : 0);
        break;
      case "pop":
      case "rec":
        parse_splice(stack, parse_len(stack) - ins.value, ins.value);
        break;
      case "ret":
        if (ins.value) {
          stack.pop();
        }
        break;
      default:
        assertUnreachable(ins);
    }
  }
  return [];
}
function parse(code, invocationId) {
  const { tokens, stringError } = tokenise(code, invocationId);
  const tokenErrors = tokenErrorDetect(stringError, tokens);
  if (parse_len(tokenErrors)) {
    return { errors: tokenErrors, funcs: {} };
  }
  const segments = segment(tokens);
  const labelled = funcise(segments);
  const funcsAndErrors = labelled.map((named) => syntaxise(named, {
    invocationId,
    line: named.errCtx.line,
    col: named.errCtx.col
  }));
  const okFuncs = [], errors = [];
  funcsAndErrors.forEach((fae) => {
    if (fae[0] === "err") {
      errors.push(fae[1]);
    } else {
      okFuncs.push(fae[1]);
    }
  });
  parse_push(errors, parse_flat(okFuncs.map((f) => insErrorDetect(f.ins))));
  const funcs = {};
  okFuncs.forEach((func) => funcs[func.name] = func);
  return { errors, funcs };
}

;// CONCATENATED MODULE: ./src/test.ts

async function get(state, key) {
  if (!state.dict.has(key)) {
    return { value: { t: "null", v: void 0 }, err: `"${key} not found.` };
  }
  return { value: state.dict.get(key), err: void 0 };
}
async function set(state, key, val) {
  state.dict.set(key, val);
  return void 0;
}
async function exe(state, name, args) {
  const nullVal = { t: "null", v: void 0 };
  switch (name) {
    case "print-str":
      state.output += args[0].v;
      break;
    case "print":
    case "test.function":
      state.output += args[0].v + "\n";
      break;
    default:
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal, err: void 0 };
}
const tests = [
  { name: "Hello, world!", code: `"Hello, world!"`, out: `Hello, world!` },
  {
    name: "Say Hello, world!",
    code: `(print "Hello, world!")`,
    out: `Hello, world!
null`
  },
  { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
  { name: "Negate 1 = -1", code: `(- 1)`, out: `-1` },
  { name: "(1+1)+1+(1+1) = 5", code: `(+ (+ 1 1) 1 (+ 1 1))`, out: `5` },
  { name: "Conditional head", code: `((if true + -) 12 9 1)`, out: `22` },
  {
    name: "Whens",
    code: `[(when 123 (print "hi") 234) (when false (print "bye"))]`,
    out: `hi
[234 null]`
  },
  { name: "Cond number head", code: `((if false 1 2) [:a :b :c])`, out: `:c` },
  {
    name: "and & short-circuit",
    code: `[(and true (if true null 1) true) (and 1 2 3)]`,
    out: `[false true]`
  },
  {
    name: "or & short-circuit",
    code: `[(or true (print "hello") 1) (or false (print-str "-> ") 1)]`,
    out: `-> [true 1]`
  },
  { name: "String retrieve", code: `(2 "Hello")`, out: `l` },
  { name: "Vector retrieve", code: `(2 [:a :b :c :d])`, out: `:c` },
  {
    name: "Key as operation",
    code: `[(:age {:name "Patrick" :age 24}) (:abc [:a :abc :c])]`,
    out: `[24 :abc]`
  },
  {
    name: "Dictionary as op 1",
    code: `({"name" "Patrick" "age" 24} "age")`,
    out: `24`
  },
  {
    name: "Dictionary as op 2",
    code: `({"name" "Patrick"} "age" 24)`,
    out: `{"name" "Patrick", "age" 24}`
  },
  {
    name: "Equalities",
    code: `[(= 1 2 1)
            (!= 1 2 1)
            (= "Hello" "hello")
            (!= "world" "world")
            (= [0 [1]] [0 [1]])]`,
    out: `[false 1 false false [0 [1]]]`
  },
  { name: "Define and retrieve", code: `(var a 1) a`, out: `1` },
  { name: "Define and add", code: `(var a 1) (inc a)`, out: `2` },
  { name: "Define op and call", code: `(var f +) (f 2 2)`, out: `4` },
  { name: "Define vec and call", code: `(var f [1]) (f 1)`, out: `1` },
  {
    name: "Define num and call",
    code: `(var f 1) (f [:a :b :c])`,
    out: `:b`
  },
  { name: "Print simple vector", code: `[1 2 3]`, out: `[1 2 3]` },
  { name: "Boolean select", code: `[(true 1 2) (false 1)]`, out: `[1 null]` },
  {
    name: "Sum vector of numbers",
    code: `[(reduce + [1 2 3]) (reduce + [1 2 3] 3)]`,
    out: `[6 9]`
  },
  {
    name: "Sum vectors of numbers",
    code: `(map + [1 2 3] [1 2 3 4])`,
    out: `[2 4 6]`
  },
  {
    name: "Filter by integer",
    code: `(filter 2 [[1] [:a :b :c] "hello" "hi"])`,
    out: `[[:a :b :c] "hello"]`
  },
  {
    name: "Comments, short decimal",
    code: `;((print "Hello")
           .456`,
    out: `0.456`
  },
  {
    name: "Dictionary into vector",
    code: `(into [1 2] {3 4 5 6})`,
    out: `[1 2 [3 4] [5 6]]`
  },
  {
    name: "Vector into dictionary",
    code: `(into {[0] 1 [2] 3} [[0] 2])`,
    out: `{[0] 2, [2] 3}`
  },
  {
    name: "While loop",
    code: `(var n 5)
           (while (< 0 n)
             (print-str n)
             (var n (dec n)))`,
    out: `543210`
  },
  {
    name: "Catch error",
    code: `(catch
             (:e (catch (do (let a :a) (+ 1 a)) (0 errors)))
             (print "hi"))`,
    out: `Type`
  },
  { name: "Define with no call", code: `(function func (print "Nothing."))` },
  {
    name: "Call greet func",
    code: `(function greeting (print "Hello!")) (greeting)`,
    out: `Hello!
null`
  },
  {
    name: "Call const value func",
    code: `(function const 123) (const)`,
    out: `123`
  },
  {
    name: "Call identity funcs",
    code: `(function id1 %)
           (function id2 x x)
           [(id1 123) (id2 456)]`,
    out: `[123 456]`
  },
  {
    name: "Call greet with name",
    code: `(function greeting name (print "Hello, " name "!"))
           (greeting "Patrick")`,
    out: `Hello, Patrick!
null`
  },
  {
    name: "Call with too few args",
    code: `(function func a b c [a b c]) (func 1 2)`,
    out: `[1 2 null]`
  },
  {
    name: "Define func and call",
    code: `(function func a b (+ a b)) (var f func) (f 2 2)`,
    out: `4`
  },
  {
    name: "Anonymous parameters",
    code: `(function avg<n? (< (/ (.. + %) (len %)) %1))
           (avg<n? [0 10 20 30 40] 5)`,
    out: `false`
  },
  {
    name: "Call parameter",
    code: `(function f x (x "hello")) (f print)`,
    out: `hello
null`
  },
  { name: "Let and retrieve", code: `(function f (let a 1) a) (f)`, out: `1` },
  {
    name: "Let num op and call",
    code: `(function f (let n 0) (n [1])) (f)`,
    out: `1`
  },
  {
    name: "Explicit return",
    code: `(function f (return 123) (print 456)) (f)`,
    out: `123`
  },
  {
    name: "Closure 1",
    code: `(let x 10)
           (let closure #(+ x x))
           (let x 11)
           (closure)`,
    out: `20`
  },
  {
    name: "Closure 2",
    code: `(filter #(or (.. = args) (even? %)) (range 10) 5)`,
    out: `[0 2 4 5 6 8]`
  },
  {
    name: "Closure 3",
    code: `(function f #(+ x x))
           (var x 10) (let c20 (f))
           (var x 20) (let c40 (f))
           [(c20) (c40)]`,
    out: `[20 40]`
  },
  {
    name: "Func returns closure",
    code: `(function f x #(x 2 2))
           (let closure (f +))
           (closure)`,
    out: `4`
  },
  {
    name: "Dictionary closure",
    code: `(function f x #{x 2})
           (let closure (f :a))
           (closure)`,
    out: `{:a 2}`
  },
  {
    name: "Vector closure",
    code: `(function f x #[1 x %])
           (let closure (f 2))
           (closure 3)`,
    out: `[1 2 3]`
  },
  {
    name: "Closure as head",
    code: `(#[% %1 %2] 1 2 3)`,
    out: `[1 2 3]`
  },
  {
    name: "Partial closure 1",
    code: `(@[] 1 2 3)`,
    out: `[1 2 3]`
  },
  {
    name: "String instead of number",
    code: `(function sum (.. + args))
           (print (sum 2 2))
           (sum 2 "hi")`,
    out: `4`,
    err: ["Type"]
  },
  { name: "Reference non-existing", code: `x`, err: ["Reference"] },
  {
    name: "Expired let retrieve",
    code: `(function f (let a 1) a) (f) a`,
    err: ["Reference"]
  },
  { name: "Call non-existing", code: `(x)`, err: ["External"] },
  { name: "Call budget", code: `(function f (f)) (f)`, err: ["Budget"] },
  {
    name: "Loop budget",
    code: `(var n 10000)
           (while (< 0 n)
             (var n (dec n)))`,
    err: ["Budget"]
  },
  { name: "Range budget", code: `(range 10000)`, err: ["Budget"] },
  {
    name: "Fibonacci 13",
    code: `(function fib n
             (if (< n 2) n
               (+ (fib (dec n))
                  (fib (- n 2)))))
           (fib 13)`,
    out: `233`
  },
  {
    name: "dedupe (recur)",
    code: `(function dedupe list -out
             (let out (or -out []))
             (let next (if (out (0 list)) [] [(0 list)]))
             (if (empty? list) out
                 (recur (sect list) (into out next))))
           (dedupe [1 1 2 3 3 3])`,
    out: `[1 2 3]`
  },
  {
    name: "set get",
    code: `[($globals.time_offset 5.5) $globals.time_offset]`,
    out: `[5.5 5.5]`
  },
  { name: "exe", code: `(test.function 123)`, out: `123
null` },
  { name: "Empty parens", code: `()`, err: ["Parse"] },
  { name: "Imbalanced parens 1", code: `(print ("hello!")`, err: ["Parse"] },
  { name: "Imbalanced parens 2", code: `print "hello!")`, err: ["Parse"] },
  {
    name: "Imbalanced quotes 1",
    code: `(print "Hello)`,
    err: ["Parse", "Parse"]
  },
  { name: "Imbalanced quotes 2", code: `print "Hello")`, err: ["Parse"] },
  { name: "Function as op", code: `(function)`, err: ["Parse"] },
  { name: "Function without name", code: `(function (+))`, err: ["Parse"] },
  { name: "Function without body", code: `(function func)`, err: ["Parse"] },
  { name: "Variable not symbol", code: `(var 1 2)`, err: ["Parse"] },
  { name: "Parser type error 1", code: `(function f (+ 1 :a))`, err: ["Type"] },
  {
    name: "Parser type error 2",
    code: `(function f (+ 1 (into {} {})))`,
    err: ["Type"]
  }
];
async function doTests(invoke, terse = true) {
  const results = [];
  for (let t = 0; t < len(tests); ++t) {
    const { name, code, err, out } = tests[t];
    const state = {
      dict: new Map(),
      output: ""
    };
    const env = { funcs: {}, vars: {} };
    const startTime = getTimeMs();
    const errors = await invoke({
      get: (key) => get(state, key),
      set: (key, val) => set(state, key, val),
      exe: (name2, args) => exe(state, name2, args),
      env,
      loopBudget: 1e4,
      rangeBudget: 1e3,
      callBudget: 1e3,
      recurBudget: 1e4
    }, code, "testing", true);
    const okErr = (err || []).join() === errors.map(({ e }) => e).join();
    const okOut = !out || trim(state.output) === out;
    const elapsedMs = getTimeMs() - startTime;
    const [tNum, tName, tElapsed, tOutput, tErrors] = [
      padEnd(`${t + 1}`, 3),
      padEnd(name, 24),
      padEnd(`${elapsedMs}ms`, 6),
      okOut || out + "	=/=	" + trim(state.output),
      okErr || errors.map(({ e, m, errCtx: { line, col } }) => `${e} ${line}:${col}: ${m}`)
    ];
    results.push({
      okErr,
      okOut,
      elapsedMs,
      display: `${tNum} ${tName} ${tElapsed} ${tOutput} ${tErrors}`
    });
  }
  const totalMs = results.reduce((sum, { elapsedMs }) => sum + elapsedMs, 0);
  const numPassed = len(results.filter(({ okOut, okErr }) => okOut && okErr));
  return concat(results.filter((r) => !terse || !r.okOut || !r.okErr).map((r) => r.display), [`---- ${numPassed}/${len(results)} tests passed in ${totalMs}ms.`]);
}

;// CONCATENATED MODULE: ./src/index.ts
const insituxVersion = 20211009;


const { abs: src_abs, cos: src_cos, sin: src_sin, tan: src_tan, pi: src_pi, sign: src_sign, sqrt: src_sqrt, floor: src_floor, ceil: src_ceil, round: src_round, max: src_max, min: src_min } = poly_fills_namespaceObject;
const { logn: src_logn, log2: src_log2, log10: src_log10 } = poly_fills_namespaceObject;
const { concat: src_concat, has: src_has, flat: src_flat, push: src_push, reverse: src_reverse, slice: src_slice, splice: src_splice, sortBy: src_sortBy } = poly_fills_namespaceObject;
const { ends: src_ends, slen: src_slen, starts: src_starts, sub: src_sub, subIdx: src_subIdx, substr: src_substr, upperCase: src_upperCase, lowerCase: src_lowerCase } = poly_fills_namespaceObject;
const { trim: src_trim, trimStart: src_trimStart, trimEnd: src_trimEnd } = poly_fills_namespaceObject;
const { getTimeMs: src_getTimeMs, randInt: src_randInt, randNum: src_randNum } = poly_fills_namespaceObject;
const { isNum: src_isNum, len: src_len, objKeys: src_objKeys, range: src_range, toNum: src_toNum } = poly_fills_namespaceObject;




const val2str = (val) => {
  const quoted = (v) => v.t === "str" ? `"${v.v}"` : val2str(v);
  if (val.t === "clo") {
    return `#${val.v.name}`;
  } else if (val.t === "vec") {
    return `[${val.v.map(quoted).join(" ")}]`;
  } else if (val.t === "dict") {
    const { keys, vals } = val.v;
    const [ks, vs] = [keys.map(quoted), vals.map(quoted)];
    const entries = ks.map((k, i) => `${k} ${vs[i]}`);
    return `{${entries.join(", ")}}`;
  } else if (val.t === "null") {
    return "null";
  }
  return `${val.v}`;
};
let stack = [];
let lets = [];
const _boo = (v) => stack.push({ t: "bool", v });
const _num = (v) => stack.push({ t: "num", v });
const _str = (v = "") => stack.push({ t: "str", v });
const _vec = (v = []) => stack.push({ t: "vec", v });
const _dic = (v) => stack.push({ t: "dict", v });
const _nul = () => stack.push({ t: "null", v: void 0 });
const _fun = (v) => stack.push({ t: "func", v });
const num = ({ v }) => v;
const str = ({ v }) => v;
const vec = ({ v }) => v;
const dic = ({ v }) => v;
const asBoo = (val) => val.t === "bool" ? val.v : val.t !== "null";
const asArray = (val) => val.t === "vec" ? src_slice(val.v) : val.t === "str" ? [...val.v].map((s) => ({ t: "str", v: s })) : val.t === "dict" ? val.v.keys.map((k, i) => ({
  t: "vec",
  v: [k, val.v.vals[i]]
})) : [];
const stringify = (vals) => vals.reduce((cat, v) => cat + val2str(v), "");
const toDict = (args) => {
  if (src_len(args) % 2 === 1) {
    args.pop();
  }
  const keys = args.filter((_, i) => i % 2 === 0);
  const vals = args.filter((_, i) => i % 2 === 1);
  const ddKeys = [], ddVals = [];
  keys.forEach((key, i) => {
    const existingIdx = ddKeys.findIndex((k) => isEqual(k, key));
    if (existingIdx === -1) {
      ddKeys.push(key);
      ddVals.push(vals[i]);
    } else {
      ddVals[existingIdx] = vals[i];
    }
  });
  return {
    t: "dict",
    v: { keys: ddKeys, vals: ddVals }
  };
};
const isVecEqual = (a, b) => src_len(a) === src_len(b) && !a.some((x, i) => !isEqual(x, b[i]));
const isEqual = (a, b) => {
  if (a.t !== b.t) {
    return false;
  }
  switch (a.t) {
    case "null":
      return true;
    case "bool":
      return a.v === b.v;
    case "num":
      return a.v === b.v;
    case "vec":
      return isVecEqual(a.v, vec(b));
    case "dict": {
      const bd = dic(b);
      return src_len(a.v.keys) === src_len(bd.keys) && isVecEqual(a.v.keys, bd.keys);
    }
    case "str":
    case "ref":
    case "key":
    case "func":
      return str(a) === str(b);
    case "clo":
      return a.v.name === b.v.name;
  }
  return assertUnreachable(a);
};
const dictGet = ({ keys, vals }, key) => {
  const idx = keys.findIndex((k) => isEqual(k, key));
  return idx === -1 ? { t: "null", v: void 0 } : vals[idx];
};
const dictSet = ({ keys, vals }, key, val) => {
  const [nKeys, nVals] = [src_slice(keys), src_slice(vals)];
  const idx = keys.findIndex((k) => isEqual(k, key));
  if (idx !== -1) {
    nVals[idx] = val;
  } else {
    nKeys.push(key);
    nVals.push(val);
  }
  return { keys: nKeys, vals: nVals };
};
const dictDrop = ({ keys, vals }, key) => {
  const [nKeys, nVals] = [src_slice(keys), src_slice(vals)];
  const idx = keys.findIndex((k) => isEqual(k, key));
  if (idx !== -1) {
    src_splice(nKeys, idx, 1);
    src_splice(nVals, idx, 1);
  }
  return { t: "dict", v: { keys: nKeys, vals: nVals } };
};
async function exeOp(op, args, ctx, errCtx, checkArity) {
  const tErr = (msg) => [typeErr(msg, errCtx)];
  if (checkArity) {
    const violations = arityCheck(op, src_len(args), errCtx);
    if (violations) {
      return violations;
    }
  }
  {
    const violations = typeCheck(op, args.map((a) => [a.t]), errCtx);
    if (violations) {
      return violations;
    }
  }
  switch (op) {
    case "str":
      stack.push({
        t: "str",
        v: stringify(args)
      });
      return;
    case "print":
    case "print-str":
      {
        ctx.exe(op, [{ t: "str", v: stringify(args) }]);
        _nul();
      }
      return;
    case "vec":
      _vec(args);
      return;
    case "dict": {
      stack.push(toDict(args));
      return;
    }
    case "len":
      _num(args[0].t === "str" ? src_slen(args[0].v) : args[0].t === "vec" ? src_len(args[0].v) : src_len(dic(args[0]).keys));
      return;
    case "to-num":
      if (src_isNum(args[0].v)) {
        _num(src_toNum(args[0].v));
      } else {
        _nul();
      }
      return;
    case "to-key":
      stack.push({ t: "key", v: `:${val2str(args[0])}` });
      return;
    case "!":
      _boo(!asBoo(args[0]));
      return;
    case "=":
    case "!=":
      for (let i = 1, lim = src_len(args); i < lim; ++i) {
        if (isEqual(args[i - 1], args[i]) !== (op === "=")) {
          _boo(false);
          return;
        }
      }
      stack.push(args[0]);
      return;
    case "-":
      _num(src_len(args) === 1 ? -num(args[0]) : args.map(num).reduce((sum, n) => sum - n));
      return;
    case "**":
      _num(num(args[0]) ** (src_len(args) === 1 ? 2 : num(args[1])));
      return;
    case "+":
      _num(args.map(num).reduce((sum, n) => sum + n));
      return;
    case "*":
      _num(args.map(num).reduce((sum, n) => sum * n));
      return;
    case "/":
      _num(args.map(num).reduce((sum, n) => sum / n));
      return;
    case "//":
      _num(args.map(num).reduce((sum, n) => src_floor(sum / n)));
      return;
    case "fast=":
    case "fast!=":
      if (isEqual(args[0], args[1]) !== (op === "fast=")) {
        _boo(false);
        return;
      }
      stack.push(args[0]);
      return;
    case "fast-":
      _num(args[0].v - args[1].v);
      return;
    case "fast+":
      _num(args[0].v + args[1].v);
      return;
    case "fast*":
      _num(args[0].v * args[1].v);
      return;
    case "fast/":
      _num(args[0].v / args[1].v);
      return;
    case "fast//":
      _num(src_floor(args[0].v / args[1].v));
      return;
    case "fast<":
      _boo(args[0].v < args[1].v);
      return;
    case "fast>":
      _boo(args[0].v > args[1].v);
      return;
    case "fast<=":
      _boo(args[0].v <= args[1].v);
      return;
    case "fast>=":
      _boo(args[0].v >= args[1].v);
      return;
    case "rem":
      _num(args.map(num).reduce((sum, n) => sum % n));
      return;
    case "min":
      _num(args.map(num).reduce((sum, n) => src_min(sum, n)));
      return;
    case "max":
      _num(args.map(num).reduce((sum, n) => src_max(sum, n)));
      return;
    case "<":
    case ">":
    case "<=":
    case ">=":
      for (let i = 1, lim = src_len(args); i < lim; ++i) {
        const [a, b] = [args[i - 1].v, args[i].v];
        if (op === "<" && a >= b || op === ">" && a <= b || op === "<=" && a > b || op === ">=" && a < b) {
          _boo(false);
          return;
        }
      }
      _boo(true);
      return;
    case "inc":
      _num(args[0].v + 1);
      return;
    case "dec":
      _num(args[0].v - 1);
      return;
    case "abs":
      _num(src_abs(args[0].v));
      return;
    case "pi":
      _num(src_pi);
      return;
    case "sin":
    case "cos":
    case "tan":
    case "sqrt":
    case "round":
    case "floor":
    case "ceil":
    case "logn":
    case "log2":
    case "log10":
      _num({ sin: src_sin, cos: src_cos, tan: src_tan, sqrt: src_sqrt, round: src_round, floor: src_floor, ceil: src_ceil, logn: src_logn, log2: src_log2, log10: src_log10 }[op](num(args[0])));
      return;
    case "and":
      _boo(args.every(asBoo));
      return;
    case "or":
      _boo(args.some(asBoo));
      return;
    case "odd?":
    case "even?":
      _boo(num(args[0]) % 2 === (op === "odd?" ? 1 : 0));
      return;
    case "pos?":
    case "neg?":
    case "zero?": {
      const n = num(args[0]);
      _boo(op === "pos?" ? n > 0 : op === "neg?" ? n < 0 : !n);
      return;
    }
    case "null?":
    case "num?":
    case "bool?":
    case "str?":
    case "dict?":
    case "vec?":
    case "key?":
    case "func?":
      _boo(op === "null?" && args[0].t === "null" || op === "num?" && args[0].t === "num" || op === "bool?" && args[0].t === "bool" || op === "str?" && args[0].t === "str" || op === "dict?" && args[0].t === "dict" || op === "vec?" && args[0].t === "vec" || op === "key?" && args[0].t === "key" || op === "func?" && (args[0].t === "func" || args[0].t === "clo"));
      return;
    case "has?":
      _boo(src_sub(str(args[0]), str(args[1])));
      return;
    case "idx": {
      let i = -1;
      if (args[0].t === "str") {
        if (args[1].t !== "str") {
          return tErr("strings can only contain strings");
        }
        if (src_len(args) < 3) {
          i = src_subIdx(args[0].v, args[1].v);
        } else {
          const arr = args[0].v.split("");
          arr[num(args[2])] = args[1].v;
          _str(arr.join(""));
          return;
        }
      } else if (args[0].t === "vec") {
        if (src_len(args) < 3) {
          i = args[0].v.findIndex((a) => isEqual(a, args[1]));
        } else {
          const v = src_slice(args[0].v);
          v[num(args[2])] = args[1];
          _vec(v);
          return;
        }
      }
      if (i === -1) {
        _nul();
      } else {
        _num(i);
      }
      return;
    }
    case "map":
    case "for":
    case "reduce":
    case "filter":
    case "remove":
    case "find":
    case "count":
      {
        const closure = getExe(ctx, args.shift(), errCtx);
        const okT = (t) => t === "vec" || t === "str" || t === "dict";
        const badArg = op === "map" || op === "for" ? args.findIndex(({ t }) => !okT(t)) : okT(args[0].t) ? -1 : 0;
        if (badArg !== -1) {
          const badType = typeNames[args[badArg].t];
          return tErr(`argument 2 must be either: string, vector, dictionary, not ${badType}`);
        }
        if (op === "for") {
          const arrays = args.map(asArray);
          const lims = arrays.map(src_len);
          const divisors = lims.map((_, i) => src_slice(lims, 0, i + 1).reduce((sum, l) => sum * l));
          divisors.unshift(1);
          const lim = divisors.pop();
          if (lim > ctx.loopBudget) {
            return [{ e: "Budget", m: "would exceed loop budget", errCtx }];
          }
          const array2 = [];
          for (let t = 0; t < lim; ++t) {
            const argIdxs = divisors.map((d, i) => src_floor(t / d % lims[i]));
            const errors = await closure(arrays.map((a, i) => a[argIdxs[i]]));
            if (errors) {
              return errors;
            }
            array2.push(stack.pop());
          }
          _vec(array2);
          return;
        }
        if (op === "map") {
          const arrays = args.map(asArray);
          const shortest = src_min(...arrays.map(src_len));
          const array2 = [];
          for (let i = 0; i < shortest; ++i) {
            const errors = await closure(arrays.map((a) => a[i]));
            if (errors) {
              return errors;
            }
            array2.push(stack.pop());
          }
          _vec(array2);
          return;
        }
        const array = asArray(args.shift());
        if (op !== "reduce") {
          const isRemove = op === "remove", isFind = op === "find", isCount = op === "count";
          const filtered = [];
          let count = 0;
          for (let i = 0, lim = src_len(array); i < lim; ++i) {
            const errors = await closure([array[i], ...args]);
            if (errors) {
              return errors;
            }
            const b = asBoo(stack.pop());
            if (isCount) {
              count += b ? 1 : 0;
              continue;
            }
            if (isFind && b) {
              stack.push(array[i]);
              return;
            }
            if (!isFind && b !== isRemove) {
              filtered.push(array[i]);
            }
          }
          switch (op) {
            case "count":
              _num(count);
              return;
            case "find":
              _nul();
              return;
            default:
              _vec(filtered);
              return;
          }
        }
        if (!src_len(array)) {
          if (src_len(args)) {
            stack.push(args[0]);
          } else {
            _vec();
          }
          return;
        }
        if (src_len(array) < 2 && !src_len(args)) {
          src_push(stack, array);
          return;
        }
        let reduction = (src_len(args) ? args : array).shift();
        for (let i = 0, lim = src_len(array); i < lim; ++i) {
          const errors = await closure([reduction, array[i]]);
          if (errors) {
            return errors;
          }
          reduction = stack.pop();
        }
        stack.push(reduction);
      }
      return;
    case "rand-int":
    case "rand":
      {
        const nArgs = src_len(args);
        const [a, b] = [
          nArgs < 2 ? 0 : num(args[0]),
          nArgs === 0 ? 1 + src_toNum(op === "rand-int") : nArgs === 1 ? num(args[0]) : num(args[1])
        ];
        _num(op === "rand-int" ? src_randInt(a, b) : src_randNum(a, b));
      }
      return;
    case "do":
    case "val":
      stack.push(op === "do" ? args.pop() : args.shift());
      return;
    case "..":
    case "...": {
      const closure = getExe(ctx, args.shift(), errCtx);
      let flatArgs = args;
      if (op === "..") {
        flatArgs = src_flat(args.map((a) => a.t === "vec" ? a.v : [a]));
      } else {
        const a = flatArgs.pop();
        src_push(flatArgs, src_flat([a.t === "vec" ? a.v : [a]]));
      }
      return await closure(flatArgs);
    }
    case "into": {
      if (args[0].t === "vec") {
        _vec(src_concat(args[0].v, asArray(args[1])));
      } else {
        if (args[1].t === "vec") {
          stack.push(toDict(src_concat(src_flat(asArray(args[0]).map(vec)), args[1].v)));
        } else {
          const { keys, vals } = dic(args[0]);
          const d1 = dic(args[1]);
          _dic({ keys: src_concat(keys, d1.keys), vals: src_concat(vals, d1.vals) });
        }
      }
      return;
    }
    case "push": {
      if (args[0].t === "vec") {
        const v = args[0].v;
        if (src_len(args) < 3) {
          _vec(src_concat(v, [args[1]]));
        } else {
          const n = num(args[2]);
          _vec(src_concat(src_concat(src_slice(v, 0, n), [args[1]]), src_slice(v, n)));
        }
      } else {
        if (src_len(args) < 3) {
          stack.push(dictDrop(dic(args[0]), args[1]));
        } else {
          _dic(dictSet(dic(args[0]), args[1], args[2]));
        }
      }
      return;
    }
    case "sect": {
      const v = args[0];
      const isVec = v.t === "vec";
      const vlen = isVec ? src_len(v.v) : src_slen(str(v));
      let a = 0, b = vlen;
      switch (src_len(args)) {
        case 1:
          a = 1;
          break;
        case 2: {
          const del = num(args[1]);
          if (del < 0) {
            b += del;
          } else {
            a += del;
          }
          break;
        }
        case 3: {
          const skip = num(args[1]);
          const take = num(args[2]);
          a = skip < 0 ? vlen + skip + (take < 0 ? take : 0) : a + skip;
          b = (take < 0 ? b : a) + take;
          break;
        }
      }
      a = src_max(a, 0);
      b = src_min(b, vlen);
      if (a > b) {
        (isVec ? _vec : _str)();
        return;
      }
      if (isVec) {
        _vec(src_slice(v.v, a, b));
      } else {
        _str(src_substr(str(args[0]), a, b - a));
      }
      return;
    }
    case "reverse":
      if (args[0].t === "str") {
        _str(stringify(src_reverse(asArray(args[0]))));
      } else {
        _vec(src_reverse(asArray(args[0])));
      }
      return;
    case "sort": {
      if (!src_len(vec(args[0]))) {
        _vec();
        return;
      }
      const src = asArray(args[0]);
      const mapped = [];
      if (src_len(args) === 1) {
        src_push(mapped, src.map((v) => [v, v]));
      } else {
        const closure = getExe(ctx, args.pop(), errCtx);
        for (let i = 0, lim = src_len(src); i < lim; ++i) {
          const errors = await closure([src[i]]);
          if (errors) {
            return errors;
          }
          mapped.push([src[i], stack.pop()]);
        }
      }
      const okT = mapped[0][1].t;
      if (mapped.some(([_, { t }]) => t !== okT || !src_has(["num", "str"], t))) {
        return tErr("can only sort by all number or all string");
      }
      if (mapped[0][1].t === "num") {
        src_sortBy(mapped, ([x, a], [y, b]) => num(a) > num(b) ? 1 : -1);
      } else {
        src_sortBy(mapped, ([x, a], [y, b]) => str(a) > str(b) ? 1 : -1);
      }
      _vec(mapped.map(([v]) => v));
      return;
    }
    case "range": {
      const [a, b, s] = args.map(num);
      const edgeCase = s && s < 0 && a < b;
      const [x, y] = src_len(args) > 1 ? edgeCase ? [b - 1, a - 1] : [a, b] : [0, a];
      const step = src_sign((y - x) * (s || 1)) * (s || 1);
      const count = src_ceil(src_abs((y - x) / step));
      if (!count) {
        _vec([]);
        return;
      }
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "range budget depleted", errCtx }];
      }
      ctx.rangeBudget -= count;
      const nums = src_range(count).map((n) => n * step + x);
      _vec(nums.map((v) => ({ t: "num", v })));
      return;
    }
    case "empty?":
      _boo(!src_len(asArray(args[0])));
      return;
    case "keys":
    case "vals":
      _vec(dic(args[0])[op === "keys" ? "keys" : "vals"]);
      return;
    case "split":
      _vec(str(args[0]).split(src_len(args) > 1 ? str(args[1]) : " ").map((v) => ({ t: "str", v })));
      return;
    case "join":
      _str(vec(args[0]).map(val2str).join(src_len(args) > 1 ? str(args[1]) : " "));
      return;
    case "starts-with?":
    case "ends-with?":
      _boo((op === "starts-with?" ? src_starts : src_ends)(str(args[0]), str(args[1])));
      return;
    case "upper-case":
    case "lower-case":
    case "trim":
    case "trim-start":
    case "trim-end":
      _str((op === "upper-case" ? src_upperCase : op === "lower-case" ? src_lowerCase : op === "trim" ? src_trim : op === "trim-start" ? src_trimStart : src_trimEnd)(str(args[0])));
      return;
    case "str*": {
      const text = str(args[0]);
      _str(src_range(src_max(num(args[1]), 0)).map((n) => text).join(""));
      return;
    }
    case "time":
      _num(src_getTimeMs());
      return;
    case "version":
      _num(insituxVersion);
      return;
    case "tests":
      _str((await doTests(invoke, !(src_len(args) && asBoo(args[0])))).join("\n"));
      return;
    case "symbols":
      _vec(symbols(ctx, false).map((v) => ({ t: "str", v })));
      return;
    case "eval": {
      delete ctx.env.funcs["entry"];
      const sLen = src_len(stack);
      const errors = await parseAndExe(ctx, str(args[0]), errCtx.invocationId);
      if (errors) {
        errors.forEach((e) => {
          e.errCtx.invocationId = "evaluated";
        });
        return [
          { e: "Eval", m: "error within evaluated code", errCtx },
          ...errors
        ];
      }
      if (sLen === src_len(stack)) {
        _nul();
      }
      return;
    }
    case "reset":
      ctx.env.vars = {};
      ctx.env.funcs = {};
      lets = [];
      _nul();
      return;
  }
  return [{ e: "Unexpected", m: "operation doesn't exist", errCtx }];
}
function getExe(ctx, op, errCtx, checkArity = true) {
  const monoArityError = [{ e: "Arity", m: `one argument required`, errCtx }];
  if (op.t === "str" || op.t === "func") {
    const name = op.v;
    if (ops[name]) {
      return (params) => exeOp(name, params, ctx, errCtx, checkArity);
    }
    if (name in ctx.env.funcs) {
      return (params) => exeFunc(ctx, ctx.env.funcs[name], params);
    }
    if (name in ctx.env.vars) {
      return getExe(ctx, ctx.env.vars[name], errCtx);
    }
    if (name in lets[src_len(lets) - 1]) {
      return getExe(ctx, lets[src_len(lets) - 1][name], errCtx);
    }
    if (src_starts(name, "$")) {
      return async (params) => {
        if (!src_len(params)) {
          return monoArityError;
        }
        const err = await ctx.set(src_substr(name, 1), params[0]);
        stack.push(params[0]);
        return err ? [{ e: "External", m: err, errCtx }] : void 0;
      };
    }
    return async (params) => {
      const { err, value } = await ctx.exe(name, params);
      if (!err) {
        stack.push(value);
      }
      return err ? [{ e: "External", m: err, errCtx }] : void 0;
    };
  } else if (op.t === "clo") {
    return (params) => exeFunc(ctx, op.v, params);
  } else if (op.t === "key") {
    return async (params) => {
      if (!src_len(params)) {
        return monoArityError;
      }
      if (params[0].t === "dict") {
        stack.push(dictGet(dic(params[0]), op));
      } else if (params[0].t === "vec") {
        const found = vec(params[0]).find((v) => isEqual(v, op));
        stack.push(found ?? { t: "null", v: void 0 });
      } else {
        return keyOpErr(errCtx, [params[0].t]);
      }
      return;
    };
  } else if (op.t === "num") {
    const n = src_floor(op.v);
    return async (params) => {
      if (!src_len(params)) {
        return monoArityError;
      }
      const a = params[0];
      if (a.t !== "str" && a.t !== "vec" && a.t !== "dict") {
        return numOpErr(errCtx, [a.t]);
      }
      const arr = asArray(a);
      if (src_abs(n) >= src_len(arr)) {
        _nul();
      } else if (n < 0) {
        stack.push(arr[src_len(arr) + n]);
      } else {
        stack.push(arr[n]);
      }
      return;
    };
  } else if (op.t === "vec") {
    const { v } = op;
    return async (params) => {
      if (!src_len(params)) {
        return monoArityError;
      }
      const found = v.find((val) => isEqual(val, params[0]));
      if (found) {
        stack.push(found);
      } else {
        _nul();
      }
      return;
    };
  } else if (op.t === "dict") {
    const dict = op.v;
    return async (params) => {
      if (src_len(params) === 1) {
        stack.push(dictGet(dict, params[0]));
      } else if (src_len(params) === 2) {
        _dic(dictSet(dict, params[0], params[1]));
      } else {
        return [
          {
            e: "Arity",
            m: "dictionary as operation takes one or two arguments only",
            errCtx
          }
        ];
      }
      return;
    };
  } else if (op.t === "bool") {
    const cond = op.v;
    return async (params) => {
      if (!src_len(params) || src_len(params) > 2) {
        return [
          {
            e: "Arity",
            m: "boolean as operation takes one or two arguments only",
            errCtx
          }
        ];
      }
      stack.push(cond ? params[0] : src_len(params) > 1 ? params[1] : { t: "null", v: void 0 });
      return;
    };
  }
  return async (_) => [
    { e: "Operation", m: `${val2str(op)} is an invalid operation`, errCtx }
  ];
}
function errorsToDict(errors) {
  const newKey = (d, k, v) => dictSet(d, { t: "key", v: k }, v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", { t: "str", v: e });
    dict = newKey(dict, ":m", { t: "str", v: m });
    dict = newKey(dict, ":line", { t: "num", v: errCtx.line });
    dict = newKey(dict, ":col", { t: "num", v: errCtx.col });
    return { t: "dict", v: dict };
  });
}
async function exeFunc(ctx, func, args, inClosure = false) {
  --ctx.callBudget;
  if (!inClosure) {
    lets.push({});
  }
  const stackLen = src_len(stack);
  for (let i = 0, lim = src_len(func.ins); i < lim; ++i) {
    const ins = func.ins[i];
    const { errCtx } = func.ins[i];
    const tooManyLoops = ctx.loopBudget < 1;
    if (tooManyLoops || ctx.callBudget < 1) {
      return [
        {
          e: "Budget",
          m: `${tooManyLoops ? "looped" : "called"} too many times`,
          errCtx
        }
      ];
    }
    switch (ins.typ) {
      case "val":
        stack.push(ins.value);
        break;
      case "var":
        ctx.env.vars[ins.value] = stack[src_len(stack) - 1];
        break;
      case "let":
        lets[src_len(lets) - 1][ins.value] = stack[src_len(stack) - 1];
        break;
      case "npa":
      case "upa":
        {
          const paramIdx = ins.value;
          if (paramIdx === -1) {
            _vec(args);
          } else if (src_len(args) <= paramIdx) {
            _nul();
          } else {
            stack.push(args[paramIdx]);
          }
        }
        break;
      case "ref":
        {
          const name = ins.value;
          if (ops[name]) {
            _fun(name);
          } else if (src_starts(name, "$")) {
            const { value, err } = await ctx.get(src_substr(name, 1));
            if (err) {
              return [{ e: "External", m: err, errCtx }];
            }
            stack.push(value);
          } else if (name in ctx.env.vars) {
            stack.push(ctx.env.vars[name]);
          } else if (name in lets[src_len(lets) - 1]) {
            stack.push(lets[src_len(lets) - 1][name]);
          } else if (name in ctx.env.funcs) {
            _fun(name);
          } else {
            return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
          }
        }
        break;
      case "exe":
        {
          const closure = getExe(ctx, stack.pop(), errCtx, false);
          const nArgs = ins.value;
          const params = src_splice(stack, src_len(stack) - nArgs, nArgs);
          const errors = await closure(params);
          if (errors) {
            const nextCat = src_slice(func.ins, i).findIndex((ins2) => ins2.typ === "cat");
            if (nextCat !== -1) {
              i += nextCat;
              lets[src_len(lets) - 1]["errors"] = {
                t: "vec",
                v: errorsToDict(errors)
              };
              break;
            }
            return errors;
          }
        }
        break;
      case "or":
        if (asBoo(stack[src_len(stack) - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      case "if":
        if (!asBoo(stack.pop())) {
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
        src_splice(stack, src_len(stack) - ins.value, ins.value);
        break;
      case "ret":
        if (ins.value) {
          src_splice(stack, 0, src_len(stack) - 1);
        } else {
          _nul();
        }
        i = lim;
        break;
      case "rec":
        {
          lets[src_len(lets) - 1] = {};
          i = -1;
          const nArgs = ins.value;
          args = src_splice(stack, src_len(stack) - nArgs, nArgs);
          --ctx.recurBudget;
          if (!ctx.recurBudget) {
            return [{ e: "Budget", m: `recurred too many times`, errCtx }];
          }
        }
        continue;
      case "clo":
      case "par":
        {
          let [name, cins] = ins.value;
          const isCapture = ({ typ, value }) => typ === "ref" && !cins.find((i2) => i2.typ === "let" && i2.value === value) || typ === "npa";
          const derefFunc = {
            name: "",
            ins: cins.filter(isCapture)
          };
          const errors = await exeFunc(ctx, derefFunc, args, true);
          if (errors) {
            return errors;
          }
          const numIns = src_len(derefFunc.ins);
          const captures = src_splice(stack, src_len(stack) - numIns, numIns);
          cins = cins.map((ins2) => isCapture(ins2) ? { typ: "val", value: captures.shift(), errCtx } : ins2);
          if (ins.typ === "par") {
            const { value: exeNumArgs, errCtx: errCtx2 } = cins.pop();
            cins.unshift(cins.pop());
            cins.push({ typ: "upa", value: -1, errCtx: errCtx2 });
            cins.push({
              typ: "val",
              value: { t: "str", v: "..." },
              errCtx: errCtx2
            });
            cins.push({ typ: "exe", value: exeNumArgs + 2, errCtx: errCtx2 });
          }
          stack.push({ t: "clo", v: { name, ins: cins } });
        }
        break;
      default:
        assertUnreachable(ins);
    }
  }
  if (!inClosure) {
    lets.pop();
    src_splice(stack, stackLen, src_len(stack) - (stackLen + 1));
  }
  return;
}
async function parseAndExe(ctx, code, invocationId) {
  const parsed = parse(code, invocationId);
  if (src_len(parsed.errors)) {
    return parsed.errors;
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return;
  }
  return await exeFunc(ctx, ctx.env.funcs["entry"], []);
}
async function invoke(ctx, code, invocationId, printResult = false) {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  const errors = await parseAndExe(ctx, code, invocationId);
  ctx.callBudget = callBudget;
  ctx.recurBudget = recurBudget;
  ctx.loopBudget = loopBudget;
  ctx.rangeBudget = rangeBudget;
  delete ctx.env.funcs["entry"];
  if (!errors && printResult && src_len(stack)) {
    await ctx.exe("print", [{ t: "str", v: val2str(stack[src_len(stack) - 1]) }]);
  }
  stack = [];
  lets = [];
  return errors ?? [];
}
function symbols(ctx, alsoSyntax = true) {
  let syms = alsoSyntax ? ["function"] : [];
  syms = src_concat(syms, src_objKeys(ops));
  syms = src_concat(syms, src_objKeys(ctx.env.funcs));
  syms = src_concat(syms, src_objKeys(ctx.env.vars));
  const hidden = ["entry"];
  return syms.filter((o) => !src_has(hidden, o));
}

;// CONCATENATED MODULE: ./src/invoker.ts


const invocations = new Map();
const parensRx = /[\[\]\(\) ,]/;
async function invoker(ctx, code) {
  const uuid = getTimeMs().toString();
  invocations.set(uuid, code);
  const errors = await invoke(ctx, code, uuid, true);
  let out = [];
  errors.forEach(({ e, m, errCtx: { line, col, invocationId } }) => {
    const invocation = invocations.get(invocationId);
    if (!invocation) {
      out.push({
        type: "message",
        text: `${e} Error: line ${line} col ${col}: ${m}
`
      });
      return;
    }
    const lineText = invocation.split("\n")[line - 1];
    const sym = substr(lineText, col - 1).split(parensRx)[0];
    const half1 = trimStart(substr(lineText, 0, col - 1));
    out.push({ type: "message", text: padEnd(`${line}`, 4) + half1 });
    if (!sym) {
      const half2 = substr(lineText, col);
      out.push({ type: "error", text: lineText[col - 1] });
      out.push({ type: "message", text: `${half2}
` });
    } else {
      const half2 = substr(lineText, col - 1 + slen(sym));
      out.push({ type: "error", text: sym });
      out.push({ type: "message", text: `${half2}
` });
    }
    out.push({ type: "message", text: `${e} Error: ${m}.
` });
  });
  return out;
}

;// CONCATENATED MODULE: ./src/repl.ts
const readline = __webpack_require__(521);
const fs = __webpack_require__(147);



const env = new Map();
async function repl_get(key) {
  return env.has(key) ? { value: env.get(key), err: void 0 } : {
    value: { v: void 0, t: "null" },
    err: `key ${key} not found`
  };
}
async function repl_set(key, val) {
  env.set(key, val);
  return void 0;
}
const ctx = {
  env: { funcs: {}, vars: {} },
  get: repl_get,
  set: repl_set,
  exe: repl_exe,
  loopBudget: 1e6,
  rangeBudget: 1e4,
  callBudget: 1e8,
  recurBudget: 1e4
};
async function repl_exe(name, args) {
  const nullVal = { v: void 0, t: "null" };
  switch (name) {
    case "print":
    case "print-str":
      process.stdout.write(`[32m${args[0].v}[0m`);
      if (name === "print") {
        process.stdout.write("\n");
      }
      break;
    case "read": {
      const path = args[0].v;
      if (!fs.existsSync(path)) {
        return { value: nullVal };
      }
      return {
        value: { t: "str", v: fs.readFileSync(path).toString() }
      };
    }
    default:
      if (args.length) {
        const a = args[0];
        if (a.t === "str" && a.v.startsWith("$")) {
          if (args.length === 1) {
            return await repl_get(`${a.v.substring(1)}.${name}`);
          } else {
            await repl_set(`${a.v.substring(1)}.${name}`, args[1]);
            return { value: args[1] };
          }
        }
      }
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal };
}
function completer(line) {
  const input = line.split(parensRx).pop();
  const completions = symbols(ctx);
  if (!input) {
    return [completions, ""];
  }
  const hits = completions.filter((c) => c.startsWith(input));
  return [hits.length ? hits : completions, input];
}
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
  completer,
  history: fs.existsSync(".repl-history") ? fs.readFileSync(".repl-history").toString().split("\n").reverse() : []
});
let lines = [];
function isFinished(code) {
  const { tokens } = tokenise(code, "");
  const numL = tokens.filter((t) => t.typ === "(").length;
  const numR = tokens.filter((t) => t.typ === ")").length;
  return numL <= numR;
}
rl.on("line", async (line) => {
  lines.push(line);
  const input = lines.join("\n");
  if (isFinished(input)) {
    if (lines.length === 1) {
      fs.appendFileSync(".repl-history", `
${input}`);
    }
    lines = [];
    if (input === "quit") {
      rl.close();
      return;
    }
    if (input.trim()) {
      printErrorOutput(await invoker(ctx, input));
    }
    rl.setPrompt("> ");
  } else {
    rl.setPrompt(". ");
  }
  rl.prompt();
});
rl.on("close", () => {
  console.log();
});
console.log(`Insitux ${insituxVersion} REPL.`);
rl.prompt();
function printErrorOutput(lines2) {
  const colours = { error: 31, message: 35 };
  lines2.forEach(({ type, text }) => {
    process.stdout.write(`[${colours[type]}m${text}[0m`);
  });
}

})();

/******/ })()
;
//# sourceMappingURL=repl.js.map