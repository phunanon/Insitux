#!/usr/bin/env node
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 277:
/***/ ((module) => {



module.exports = options => {
	options = Object.assign({
		onlyFirst: false
	}, options);

	const pattern = [
		'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
		'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
	].join('|');

	return new RegExp(pattern, options.onlyFirst ? undefined : 'g');
};


/***/ }),

/***/ 161:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var fs = __webpack_require__(147);
var stripAnsi = __webpack_require__(3);
var term = 13; // carriage return

/**
 * create -- sync function for reading user input from stdin
 * @param   {Object} config {
 *   sigint: {Boolean} exit on ^C
 *   autocomplete: {StringArray} function({String})
 *   history: {String} a history control object (see `prompt-sync-history`)
 * }
 * @returns {Function} prompt function
 */

 // for ANSI escape codes reference see https://en.wikipedia.org/wiki/ANSI_escape_code

function create(config) {

  config = config || {};
  var sigint = config.sigint;
  var eot = config.eot;
  var autocomplete = config.autocomplete =
    config.autocomplete || function(){return []};
  var history = config.history;
  prompt.history = history || {save: function(){}};
  prompt.hide = function (ask) { return prompt(ask, {echo: ''}) };

  return prompt;


  /**
   * prompt -- sync function for reading user input from stdin
   *  @param {String} ask opening question/statement to prompt for
   *  @param {String} value initial value for the prompt
   *  @param   {Object} opts {
   *   echo: set to a character to be echoed, default is '*'. Use '' for no echo
   *   value: {String} initial value for the prompt
   *   ask: {String} opening question/statement to prompt for, does not override ask param
   *   autocomplete: {StringArray} function({String})
   * }
   *
   * @returns {string} Returns the string input or (if sigint === false)
   *                   null if user terminates with a ^C
   */


  function prompt(ask, value, opts) {
    var insert = 0, savedinsert = 0, res, i, savedstr;
    opts = opts || {};

    if (Object(ask) === ask) {
      opts = ask;
      ask = opts.ask;
    } else if (Object(value) === value) {
      opts = value;
      value = opts.value;
    }
    ask = ask || '';
    var echo = opts.echo;
    var masked = 'echo' in opts;
    autocomplete = opts.autocomplete || autocomplete;

    var fd = (process.platform === 'win32') ?
      process.stdin.fd :
      fs.openSync('/dev/tty', 'rs');

    var wasRaw = process.stdin.isRaw;
    if (!wasRaw) { process.stdin.setRawMode && process.stdin.setRawMode(true); }

    var buf = Buffer.alloc(3);
    var str = '', character, read;

    savedstr = '';

    if (ask) {
      process.stdout.write(ask);
    }

    var cycle = 0;
    var prevComplete;

    while (true) {
      read = fs.readSync(fd, buf, 0, 3);
      if (read > 1) { // received a control sequence
        switch(buf.toString()) {
          case '\u001b[A':  //up arrow
            if (masked) break;
            if (!history) break;
            if (history.atStart()) break;

            if (history.atEnd()) {
              savedstr = str;
              savedinsert = insert;
            }
            str = history.prev();
            insert = str.length;
            process.stdout.write('\u001b[2K\u001b[0G' + ask + str);
            break;
          case '\u001b[B':  //down arrow
            if (masked) break;
            if (!history) break;
            if (history.pastEnd()) break;

            if (history.atPenultimate()) {
              str = savedstr;
              insert = savedinsert;
              history.next();
            } else {
              str = history.next();
              insert = str.length;
            }
            process.stdout.write('\u001b[2K\u001b[0G'+ ask + str + '\u001b['+(insert+ask.length+1)+'G');
            break;
          case '\u001b[D': //left arrow
            if (masked) break;
            var before = insert;
            insert = (--insert < 0) ? 0 : insert;
            if (before - insert)
              process.stdout.write('\u001b[1D');
            break;
          case '\u001b[C': //right arrow
            if (masked) break;
            insert = (++insert > str.length) ? str.length : insert;
            process.stdout.write('\u001b[' + (insert+ask.length+1) + 'G');
            break;
          default:
            if (buf.toString()) {
              str = str + buf.toString();
              str = str.replace(/\0/g, '');
              insert = str.length;
              promptPrint(masked, ask, echo, str, insert);
              process.stdout.write('\u001b[' + (insert+ask.length+1) + 'G');
              buf = Buffer.alloc(3);
            }
        }
        continue; // any other 3 character sequence is ignored
      }

      // if it is not a control character seq, assume only one character is read
      character = buf[read-1];

      // catch a ^C and return null
      if (character == 3){
        process.stdout.write('^C\n');
        fs.closeSync(fd);

        if (sigint) process.exit(130);

        process.stdin.setRawMode && process.stdin.setRawMode(wasRaw);

        return null;
      }

      // catch a ^D and exit
      if (character == 4) {
        if (str.length == 0 && eot) {
          process.stdout.write('exit\n');
          process.exit(0);
        }
      }

      // catch the terminating character
      if (character == term) {
        fs.closeSync(fd);
        if (!history) break;
        if (!masked && str.length) history.push(str);
        history.reset();
        break;
      }

      // catch a TAB and implement autocomplete
      if (character == 9) { // TAB
        res = autocomplete(str);

        if (str == res[0]) {
          res = autocomplete('');
        } else {
          prevComplete = res.length;
        }

        if (res.length == 0) {
          process.stdout.write('\t');
          continue;
        }

        var item = res[cycle++] || res[cycle = 0, cycle++];

        if (item) {
          process.stdout.write('\r\u001b[K' + ask + item);
          str = item;
          insert = item.length;
        }
      }

      if (character == 127 || (process.platform == 'win32' && character == 8)) { //backspace
        if (!insert) continue;
        str = str.slice(0, insert-1) + str.slice(insert);
        insert--;
        process.stdout.write('\u001b[2D');
      } else {
        if ((character < 32 ) || (character > 126))
            continue;
        str = str.slice(0, insert) + String.fromCharCode(character) + str.slice(insert);
        insert++;
      };

      promptPrint(masked, ask, echo, str, insert);

    }

    process.stdout.write('\n')

    process.stdin.setRawMode && process.stdin.setRawMode(wasRaw);

    return str || value || '';
  };


  function promptPrint(masked, ask, echo, str, insert) {
    if (masked) {
        process.stdout.write('\u001b[2K\u001b[0G' + ask + Array(str.length+1).join(echo));
    } else {
      process.stdout.write('\u001b[s');
      if (insert == str.length) {
          process.stdout.write('\u001b[2K\u001b[0G'+ ask + str);
      } else {
        if (ask) {
          process.stdout.write('\u001b[2K\u001b[0G'+ ask + str);
        } else {
          process.stdout.write('\u001b[2K\u001b[0G'+ str + '\u001b[' + (str.length - insert) + 'D');
        }
      }

      // Reposition the cursor to the right of the insertion point
      var askLength = stripAnsi(ask).length;
      process.stdout.write(`\u001b[${askLength+1+(echo==''? 0:insert)}G`);
    }
  }
};

module.exports = create;


/***/ }),

/***/ 3:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const ansiRegex = __webpack_require__(277);

const stripAnsi = string => typeof string === 'string' ? string.replace(ansiRegex(), '') : string;

module.exports = stripAnsi;
module.exports["default"] = stripAnsi;


/***/ }),

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
  "charCode": () => (charCode),
  "codeChar": () => (codeChar),
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
const charCode = (str) => str.charCodeAt(0);
const codeChar = (num) => String.fromCharCode(num);
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
  "**": { minArity: 1, maxArity: 2, numeric: true },
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
  sqrt: { exactArity: 1, numeric: true },
  round: { minArity: 1, maxArity: 2, numeric: true },
  floor: { exactArity: 1, numeric: true },
  ceil: { exactArity: 1, numeric: true },
  logn: { exactArity: 1, numeric: true },
  log2: { exactArity: 1, numeric: true },
  log10: { exactArity: 1, numeric: true },
  and: { minArity: 1 },
  or: { minArity: 1 },
  xor: { exactArity: 2 },
  "&": { exactArity: 2, numeric: true },
  "|": { exactArity: 2, numeric: true },
  "^": { exactArity: 2, numeric: true },
  "~": { exactArity: 1, numeric: true },
  "<<": { exactArity: 2, numeric: true },
  ">>": { exactArity: 2, numeric: true },
  ">>>": { exactArity: 2, numeric: true },
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
  "wild?": { exactArity: 1, returns: ["bool"] },
  rem: { minArity: 2, numeric: true },
  sin: { exactArity: 1, numeric: true },
  cos: { exactArity: 1, numeric: true },
  tan: { exactArity: 1, numeric: true },
  vec: { returns: ["vec"] },
  dict: { returns: ["dict"] },
  len: { exactArity: 1, params: [["str", "vec", "dict"]], returns: ["num"] },
  "to-num": {
    exactArity: 1,
    params: [["str", "num"]],
    returns: ["num", "null"]
  },
  "to-key": { exactArity: 1, params: [["str", "num"]], returns: ["key"] },
  "has?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  idx: { minArity: 2, maxArity: 3, params: [["str", "vec"]], returns: ["num"] },
  map: { minArity: 2, returns: ["vec"] },
  for: { minArity: 2, returns: ["vec"] },
  reduce: { minArity: 2, maxArity: 3 },
  filter: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["vec"]
  },
  remove: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["vec"]
  },
  find: { minArity: 2, params: [[], ["vec", "dict", "str"]] },
  count: {
    minArity: 2,
    params: [[], ["vec", "dict", "str"]],
    returns: ["num"]
  },
  repeat: { minArity: 2, params: [[], "num"] },
  "->": { minArity: 2 },
  str: { returns: ["str"] },
  rand: { maxArity: 2, numeric: true, returns: ["num"] },
  "rand-int": { maxArity: 2, numeric: true, returns: ["num"] },
  ".": { minArity: 1 },
  "..": { minArity: 2 },
  "...": { minArity: 2 },
  into: {
    exactArity: 2,
    params: [
      ["vec", "dict"],
      ["vec", "dict"]
    ],
    returns: ["vec", "dict"]
  },
  push: {
    minArity: 2,
    maxArity: 3,
    params: [["vec", "dict"]],
    returns: ["vec", "dict"]
  },
  sect: {
    minArity: 1,
    maxArity: 3,
    params: [["vec", "str"], "num", "num"],
    returns: ["vec", "str"]
  },
  reverse: { exactArity: 1, params: [["vec", "str"]], returns: ["vec", "str"] },
  sort: {
    minArity: 1,
    maxArity: 2,
    params: [["vec", "dict", "str"]],
    returns: ["vec"]
  },
  keys: { exactArity: 1, params: ["dict"] },
  vals: { exactArity: 1, params: ["dict"] },
  do: { minArity: 1 },
  val: { minArity: 1 },
  range: { minArity: 1, maxArity: 3, numeric: "in only", returns: ["vec"] },
  "empty?": {
    exactArity: 1,
    params: [["str", "vec", "dict"]],
    returns: ["bool"]
  },
  split: { minArity: 1, maxArity: 2, params: ["str", "str"], returns: ["vec"] },
  join: {
    exactArity: 2,
    params: ["str", ["vec", "dict", "str"]],
    returns: ["str"]
  },
  "starts-with?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "ends-with?": { exactArity: 2, params: ["str", "str"], returns: ["bool"] },
  "lower-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  "upper-case": { exactArity: 1, params: ["str"], returns: ["str"] },
  trim: { exactArity: 1, params: ["str"], returns: ["str"] },
  "trim-start": { exactArity: 1, params: ["str"], returns: ["str"] },
  "trim-end": { exactArity: 1, params: ["str"], returns: ["str"] },
  "str*": { exactArity: 2, params: ["str", "num"], returns: ["str"] },
  "char-code": {
    minArity: 1,
    maxArity: 2,
    params: [["str", "num"], "num"],
    returns: ["str", "num", "null"]
  },
  time: { exactArity: 0, returns: ["num"] },
  version: { exactArity: 0, returns: ["num"] },
  tests: { minArity: 0, maxArity: 1, params: ["bool"], returns: ["str"] },
  symbols: { exactArity: 0, returns: ["vec"] },
  eval: { exactArity: 1, params: ["str"] },
  reset: { exactArity: 0 },
  recur: {}
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
  clo: "closure",
  wild: "wildcard"
};
const assertUnreachable = (_x) => 0;

;// CONCATENATED MODULE: ./src/checks.ts


const asBoo = (val) => val.t === "bool" ? val.v : val.t !== "null";
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
  const { params: types, numeric: onlyNum } = ops[op];
  const nArg = len(args);
  if (onlyNum) {
    const nonNumArgIdx = args.findIndex((a) => !!len(a) && (optimistic ? !a.find((t) => t === "num") : a[0] !== "num"));
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
    if (isArray(need)) {
      if (!len(need) || (optimistic ? !len(argTypes) || argTypes.some((t) => has(need, t)) : len(argTypes) === 1 && has(need, argTypes[0]))) {
        return false;
      }
      const names = argTypes.map((t) => typeNames[t]);
      const needs = need.map((t) => typeNames[t]).join(", ");
      return `argument ${i + 1} must be either: ${needs}, not ${names}`;
    } else {
      if (optimistic ? !len(argTypes) || has(argTypes, need) : len(argTypes) === 1 && need === argTypes[0]) {
        return false;
      }
      const names = argTypes.map((t) => typeNames[t]);
      return `argument ${i + 1} must be ${typeNames[need]}, not ${names}`;
    }
  }).filter((r) => !!r);
  return len(typeViolations) ? typeViolations.map((v) => typeErr(v, errCtx)) : void 0;
}
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
const { isNum: parse_isNum, len: parse_len, toNum: parse_toNum } = poly_fills_namespaceObject;


const nullVal = { t: "null", v: void 0 };
const falseVal = { t: "bool", v: false };
const depthChange = ({ typ }) => parse_toNum(typ === "(") - parse_toNum(typ === ")");
function tokenise(code, sourceId, makeCollsOps = true, emitComments = false) {
  const tokens = [];
  const digits = "0123456789";
  let inString = false, isEscaped = false, inStringAt = [0, 0], inSymbol = false, inNumber = false, inHex = false, inComment = false, line = 1, col = 0;
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
        tokens[parse_len(tokens) - 1].text += { n: "\n", t: "	", r: "\r", '"': '"' }[c] || `\\${c}`;
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
          errCtx: { sourceId, line, col }
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
          errCtx: { sourceId, line, col }
        });
      }
      continue;
    }
    const errCtx = { sourceId, line, col };
    const isDigit = (ch) => parse_sub(digits, ch);
    const isParen = parse_sub("()[]{}", c);
    if (inNumber && !isDigit(c)) {
      const hexStart = c === "x" && tokens[parse_len(tokens) - 1].text === "0";
      inHex = inHex || hexStart;
      inNumber = c === "b" && tokens[parse_len(tokens) - 1].text === "0" || c === "." && !parse_sub(tokens[parse_len(tokens) - 1].text, ".") || inHex && (hexStart || parse_sub("ABCDEFabcdef", c));
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
      inHex = false;
      inSymbol = !inNumber;
      const typ = inSymbol ? "sym" : "num";
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
    depth += depthChange(token);
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
function parseAll(tokens, params) {
  const args = [];
  while (true) {
    const arg = parseArg(tokens, params);
    if (!parse_len(arg)) {
      break;
    }
    args.push(arg);
  }
  return args;
}
function parseForm(tokens, params, inPartial = true) {
  const head = tokens.shift();
  if (!head) {
    return [];
  }
  const { typ, text, errCtx } = head;
  let op = text;
  const err = (value, eCtx = errCtx) => [
    { typ: "err", value, errCtx: eCtx }
  ];
  if (op === "catch") {
    if (tokens[0].typ !== "(") {
      return err("argument 1 must be expression");
    }
    const body2 = parseArg(tokens, params);
    const when = parse_flat(parseAll(tokens, params));
    if (!parse_len(body2) || !parse_len(when)) {
      return err("must provide at least 2 arguments");
    }
    return [...body2, { typ: "cat", value: parse_len(when), errCtx }, ...when];
  } else if (op === "var" || op === "let") {
    const ins = [];
    while (true) {
      const parsedDestructuring = parseParams(tokens, true);
      if (parse_len(parsedDestructuring.errors)) {
        return parsedDestructuring.errors;
      }
      let def = void 0;
      if (parse_len(parsedDestructuring.params)) {
        def = {
          typ: op === "var" ? "dva" : "dle",
          value: parsedDestructuring.params,
          errCtx
        };
      }
      if (!def) {
        [def] = parseArg(tokens, params);
      }
      if (parse_len(ins) && !def) {
        return ins;
      }
      const val = parseArg(tokens, params);
      if (!parse_len(ins) && (!def || !parse_len(val))) {
        return err(`must provide at least one declaration name and value`);
      } else if (!parse_len(val)) {
        return err(`must provide a value after each declaration name`);
      }
      if (def.typ !== "ref" && def.typ !== "dva" && def.typ !== "dle") {
        return [
          {
            typ: "err",
            value: `${op} declaration name must be a symbol`,
            errCtx: def.errCtx
          }
        ];
      }
      parse_push(ins, val);
      if (def.typ === "ref") {
        ins.push({ typ: op, value: def.value, errCtx });
      } else if (def.typ === "dva" || def.typ === "dle") {
        ins.push({ typ: def.typ, value: def.value, errCtx });
      }
    }
  } else if (op === "var!" || op === "let!") {
    const ins = [];
    const defIns = parseArg(tokens, params);
    if (!parse_len(defIns)) {
      return err(`must provide declaration name`);
    }
    const def = defIns[0];
    if (def.typ !== "ref") {
      return err("declaration name must be symbol");
    }
    const func = parseArg(tokens, params);
    if (!parse_len(func)) {
      return err("must provide an operation");
    }
    const args = parseAll(tokens, params);
    ins.push({ typ: "ref", value: def.value, errCtx });
    parse_push(ins, parse_flat(args));
    parse_push(ins, func);
    ins.push({ typ: "exe", value: parse_len(args) + 1, errCtx });
    ins.push({ typ: op === "var!" ? "var" : "let", value: def.value, errCtx });
    return ins;
  } else if (op === "if" || op === "if!" || op === "when") {
    const cond = parseArg(tokens, params);
    if (!parse_len(cond)) {
      return err("must provide condition");
    }
    const ins = cond;
    if (op === "if!") {
      ins.push({ typ: "val", value: { t: "func", v: "!" }, errCtx });
      ins.push({ typ: "exe", value: 1, errCtx });
    }
    if (op === "if" || op === "if!") {
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
        const extraneousBranch = parseArg(tokens, params);
        if (parse_len(extraneousBranch)) {
          return err("too many branches; delete this branch", extraneousBranch[0].errCtx);
        }
      } else {
        ins.push({ typ: "jmp", value: 1, errCtx });
        ins.push({ typ: "val", value: nullVal, errCtx });
      }
    } else {
      const body2 = parse_flat(parseAll(tokens, params));
      ins.push({ typ: "if", value: parse_len(body2) + 1, errCtx });
      parse_push(ins, body2);
      ins.push({ typ: "jmp", value: 1, errCtx });
      ins.push({ typ: "val", value: nullVal, errCtx });
    }
    return ins;
  } else if (op === "and" || op === "or" || op === "while") {
    const args = parseAll(tokens, params);
    let insCount = args.reduce((acc, a) => acc + parse_len(a), 0);
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
        { typ: "val", value: falseVal, errCtx }
      ]);
    } else {
      ins.push({ typ: "val", value: falseVal, errCtx });
    }
    return ins;
  } else if (op === "match") {
    const cond = parseArg(tokens, params);
    if (!parse_len(cond)) {
      return err("must provide condition");
    }
    const args = parseAll(tokens, params);
    const otherwise = parse_len(args) % 2 ? args.pop() : [];
    if (!parse_len(args)) {
      return err("must provide at least one case");
    }
    let insCount = args.reduce((acc, a) => acc + parse_len(a) + 1, parse_len(otherwise) ? parse_len(otherwise) - 2 : 0) + 2;
    const ins = cond;
    while (parse_len(args) > 1) {
      const a = args.shift();
      const when = args.shift();
      parse_push(ins, a);
      ins.push({ typ: "mat", value: parse_len(when) + 1, errCtx });
      parse_push(ins, when);
      insCount -= parse_len(a) + parse_len(when) + 2;
      ins.push({ typ: "jmp", value: insCount, errCtx });
    }
    if (parse_len(otherwise)) {
      parse_push(ins, otherwise);
    } else {
      ins.push({ typ: "pop", value: 1, errCtx });
      ins.push({ typ: "val", value: falseVal, errCtx });
    }
    return ins;
  }
  const headIns = [];
  if (typ === "(" || parse_has(params.map(({ name }) => name), text) || parse_sub("%#@", parse_strIdx(text, 0))) {
    tokens.unshift(head);
    const ins = parseArg(tokens, params);
    if (inPartial) {
      headIns.push({ typ: "exp", value: parse_len(ins), errCtx });
    }
    parse_push(headIns, ins);
  }
  const parsedArgs = parseAll(tokens, params);
  const [body, nArgs] = [parse_flat(parsedArgs), parse_len(parsedArgs)];
  if (op === "return") {
    return [...body, { typ: "ret", value: !!parse_len(body), errCtx }];
  }
  if (ops[op] && !inPartial) {
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
function parseArg(tokens, params, inPartial = false) {
  if (!parse_len(tokens)) {
    return [];
  }
  const { typ, text, errCtx } = tokens.shift();
  const isClosure = typ === "sym" && parse_sub("#@", text) && parse_len(tokens) && tokens[0].typ === "(";
  const isParamClosure = typ === "(" && parse_len(tokens) && tokens[0].text === "fn";
  if (isClosure || isParamClosure) {
    const texts = tokens.map((t) => t.text);
    const fnIns = isParamClosure ? tokens.shift() : void 0;
    const ins = [];
    if (isParamClosure) {
      const parsedParams = parseParams(tokens);
      params = parsedParams.params;
      parse_push(ins, parsedParams.errors);
      if (tokens[0].typ === ")") {
        return [
          { typ: "err", value: `fn requires a body`, errCtx: fnIns.errCtx }
        ];
      }
      tokens.unshift({ typ: "sym", text: "do", errCtx });
      tokens.unshift({ typ: "(", text: "(", errCtx });
    }
    parse_push(ins, parseArg(tokens, params, text === "@"));
    const errors = ins.filter((t) => t.typ === "err");
    if (parse_len(errors)) {
      return errors;
    }
    if (isParamClosure) {
      ins.forEach((i) => {
        if (i.typ === "npa") {
          i.typ = "upa";
        }
      });
    }
    const value = [
      (isParamClosure ? "(" : text) + parse_slice(texts, 0, parse_len(texts) - parse_len(tokens)).join(" "),
      ins
    ];
    return [{ typ: text === "@" ? "par" : "clo", value, errCtx }];
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
      } else if (text === "_") {
        return [{ typ: "val", value: { t: "wild", v: void 0 }, errCtx }];
      } else if (parse_starts(text, ":")) {
        return [{ typ: "val", value: { t: "key", v: text }, errCtx }];
      } else if (parse_starts(text, "%") && parse_isNum(parse_substr(text, 1))) {
        const value = parse_toNum(parse_substr(text, 1));
        if (value < 0) {
          return [{ typ: "val", value: nullVal, errCtx }];
        }
        return [{ typ: "upa", value, errCtx }];
      } else if (parse_has(params.map(({ name }) => name), text)) {
        const param = params.find(({ name }) => name === text);
        if (parse_len(param.position) === 1) {
          return [{ typ: "npa", value: param.position[0], errCtx }];
        }
        return [{ typ: "dpa", value: param.position, errCtx }];
      } else if (text === "args") {
        return [{ typ: "upa", value: -1, errCtx }];
      } else if (text === "PI" || text === "E") {
        const v = text === "PI" ? 3.141592653589793 : 2.718281828459045;
        return [{ typ: "val", value: { t: "num", v }, errCtx }];
      } else if (ops[text]) {
        return [{ typ: "val", value: { t: "func", v: text }, errCtx }];
      }
      return [{ typ: "ref", value: text, errCtx }];
    case "(":
      return parseForm(tokens, params, inPartial);
    case ")":
    case "rem":
      return [];
    default:
      return assertUnreachable(typ);
  }
}
function parseParams(tokens, forVar = false) {
  if (!parse_len(tokens) || tokens[0].typ === ")") {
    return { params: [], errors: [] };
  }
  let depth = 0;
  const destructs = [];
  let destruct = [];
  let hitNonParam = 0;
  while (parse_len(tokens)) {
    if (!depth) {
      destructs.push([]);
      destruct = destructs[parse_len(destructs) - 1];
    }
    depth += depthChange(tokens[0]);
    if (depth < 0) {
      break;
    }
    destruct.push(tokens.shift());
    if (destruct[0].typ === "sym" && parse_sub("#@%", destruct[0].text)) {
      tokens.unshift(destruct[0]);
      destructs.pop();
      hitNonParam = 1;
      break;
    }
    if (parse_len(destruct) > 1 && (destruct[1].typ !== "sym" || destruct[1].text !== "vec")) {
      hitNonParam = 2;
      break;
    }
    if (forVar && !depth) {
      if (parse_len(destruct) === 1) {
        tokens.unshift(destruct[0]);
        return { params: [], errors: [] };
      }
      break;
    }
  }
  if (hitNonParam === 2 && depth > 0) {
    tokens.unshift(destruct[1]);
    tokens.unshift(destruct[0]);
    destructs.pop();
  } else {
    if (depth < 0) {
      destructs.pop();
      destructs.pop().reverse().forEach((t) => tokens.unshift(t));
    } else if (!hitNonParam && !forVar) {
      const last = destructs.pop();
      if (parse_len(last) === 1 && last[0].typ === ")") {
        parse_push(tokens, destructs.pop());
      }
      parse_push(tokens, last);
    }
  }
  const params = [];
  const errors = [];
  const position = [0];
  destructs.forEach((destruct2) => {
    destruct2.forEach(({ typ, text, errCtx }) => {
      if (typ === "sym") {
        if (text === "vec") {
          return;
        }
        params.push({ name: text, position: parse_slice(position) });
        ++position[parse_len(position) - 1];
        return;
      }
      if (typ === "(") {
        position.push(0);
      } else if (typ === ")") {
        position.pop();
        ++position[parse_len(position) - 1];
      } else {
        errors.push({
          typ: "err",
          value: `disallowed in destructuring`,
          errCtx
        });
      }
    });
  });
  return { params, errors };
}
function syntaxise({ name, tokens }, errCtx) {
  const err = (m, eCtx = errCtx) => ["err", { e: "Parse", m, errCtx: eCtx }];
  if (name === "(" || name === ")") {
    return err("nameless function");
  }
  if (tokens[0].typ === ")") {
    return err("empty function body");
  }
  const { params, errors: ins } = parseParams(tokens);
  while (parse_len(tokens)) {
    parse_push(ins, parseArg(tokens, params));
  }
  for (let i = 0, lim = parse_len(ins); i < lim; i++) {
    const x = ins[i];
    if (x.typ === "err") {
      return err(x.value, x.errCtx);
    }
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
  const sourceId = parse_len(tokens) ? tokens[0].errCtx.sourceId : "";
  const errors = [];
  const err = (m, errCtx) => errors.push({ e: "Parse", m, errCtx });
  if (stringError) {
    const [line, col] = stringError;
    err("unmatched double quotation marks", { sourceId, line, col });
    return errors;
  }
  const countTyp = (t) => parse_len(tokens.filter(({ typ }) => typ === t));
  const [numL, numR] = [countTyp("("), countTyp(")")];
  {
    const [line, col] = findParenImbalance(tokens, numL, numR);
    if (line + col) {
      err("unmatched parenthesis", { sourceId, line, col });
    }
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
          if (head.val.v === "recur") {
            parse_splice(stack, parse_len(stack) - ins.value, ins.value);
            break;
          }
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
        } else if (headIs("str") || headIs("bool")) {
          stack.push({});
        } else if (!head.types && !head.val) {
          stack.push({});
        }
        break;
      }
      case "or":
        stack.pop();
        stack.push({});
        i += ins.value;
        break;
      case "exp":
      case "cat":
      case "var":
      case "let":
      case "dva":
      case "dle":
      case "loo":
      case "jmp":
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
      case "dpa":
        stack.push({});
        break;
      case "if": {
        stack.pop();
        stack.push({});
        const ifIns = parse_slice(fins, i + 1, ins.value + 1);
        const errors = insErrorDetect(ifIns);
        if (errors) {
          return errors;
        }
        i += ins.value - 1;
        break;
      }
      case "mat": {
        stack.pop();
        stack.pop();
        i += ins.value;
        i += fins[i].value;
        stack.push({});
        break;
      }
      case "pop":
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
}
function parse(code, sourceId) {
  const { tokens, stringError } = tokenise(code, sourceId);
  const tokenErrors = tokenErrorDetect(stringError, tokens);
  if (parse_len(tokenErrors)) {
    return { errors: tokenErrors, funcs: {} };
  }
  const segments = segment(tokens);
  const labelled = funcise(segments);
  const funcsAndErrors = labelled.map((named) => syntaxise(named, {
    sourceId,
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
  parse_push(errors, parse_flat(okFuncs.map((f) => insErrorDetect(f.ins) ?? [])));
  const funcs = {};
  okFuncs.forEach((func) => funcs[func.name] = func);
  return { errors, funcs };
}

;// CONCATENATED MODULE: ./src/test.ts

function get(state, key) {
  if (!state.dict.has(key)) {
    return { kind: "err", err: `"${key} not found.` };
  }
  return { kind: "val", value: state.dict.get(key) };
}
function set(state, key, val) {
  state.dict.set(key, val);
  return void 0;
}
function exe(state, name, args) {
  const nullVal = { t: "null", v: void 0 };
  switch (name) {
    case "test.function":
      state.output += args[0].v + "\n";
      break;
    default:
      return { kind: "err", err: `operation ${name} does not exist` };
  }
  return { kind: "val", value: nullVal };
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
  {
    name: "match and wildcard",
    code: `(match [1 2]
             [0 0] (print "hello")
             [0 2] (print "bye")
             [1 _] "hey")`,
    out: `hey`
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
  { name: "Apply op to var", code: `(var a 10) (var! a + 10)`, out: `20` },
  {
    name: "Apply op to let",
    code: `(let a 10) (let! a (if true + -) (+ 2 3) 5)`,
    out: `20`
  },
  { name: "Print simple vector", code: `[1 2 3]`, out: `[1 2 3]` },
  { name: "Boolean select", code: `[(true 1 2) (false 1)]`, out: `[1 null]` },
  {
    name: "Sum vector of numbers",
    code: `[(reduce + [1 2 3]) (reduce + 3 [1 2 3])]`,
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
    name: "Partial closure 2",
    code: `(@((do +) 2) 2)`,
    out: `4`
  },
  {
    name: "Parameterised closure 1",
    code: `((fn a b (+ a b)) 2 2)`,
    out: `4`
  },
  {
    name: "Parameterised closure 2",
    code: `((fn a b (print-str a b) (+ a b)) 2 2)`,
    out: `224`
  },
  {
    name: "Parameterised closure 3",
    code: `(((fn (fn 1))))`,
    out: `1`
  },
  {
    name: "Destructure var",
    code: `(var [x [y]] [1 [2]]) [y x]`,
    out: `[2 1]`
  },
  {
    name: "Destructure string",
    code: `(let [a b c] "hello") [a b c]`,
    out: `["h" "e" "l"]`
  },
  {
    name: "Destructure function",
    code: `(function f a [[b c] d] e [e d c b a]) (f 0 [[1 2] 3] 4)`,
    out: `[4 3 2 1 0]`
  },
  {
    name: "Destructuring closure",
    code: `(let f (fn a [b [c]] d [d c b a])) (f 0 [1 [2]] 3)`,
    out: `[3 2 1 0]`
  },
  {
    name: "Destructuring fn decoy",
    code: `(let f (fn a [a [a]])) (f 0)`,
    out: `[0 [0]]`
  },
  { name: "Threading", code: "(-> 1 inc @(+ 10))", out: `12` },
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
    name: "frequencies",
    code: `(function frequencies list
             (reduce #(push % %1 (inc (or (% %1) 0))) {} list))
           (frequencies "12121212")`,
    out: `{"1" 4, "2" 4}`
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
    name: "Imbalanced quotes",
    code: `(print "Hello)`,
    err: ["Parse"]
  },
  { name: "Function as op", code: `(function)`, err: ["Parse"] },
  { name: "Function without name", code: `(function (+))`, err: ["Parse"] },
  { name: "Function without body", code: `(function func)`, err: ["Parse"] },
  { name: "Variable not symbol", code: `(var 1 2)`, err: ["Parse"] },
  { name: "Parser type error 1", code: `(function f (+ 1 :a))`, err: ["Type"] },
  {
    name: "Parser type error 2",
    code: `(function f (+ 1 (into {} {})))`,
    err: ["Type"]
  },
  {
    name: "Parser type error 3",
    code: `(function f (if true (into 2 {}) (+ 2 2)))`,
    err: ["Type"]
  }
];
function doTests(invoke, terse = true) {
  const results = [];
  for (let t = 0; t < len(tests); ++t) {
    const { name, code, err, out } = tests[t];
    const state = {
      dict: new Map(),
      output: ""
    };
    const env = { funcs: {}, vars: {} };
    const startTime = getTimeMs();
    const valOrErrs = invoke({
      get: (key) => get(state, key),
      set: (key, val) => set(state, key, val),
      print(str, withNewLine) {
        state.output += str + (withNewLine ? "\n" : "");
      },
      exe: (name2, args) => exe(state, name2, args),
      functions: [],
      env,
      loopBudget: 1e4,
      rangeBudget: 1e3,
      callBudget: 1e3,
      recurBudget: 1e4
    }, code, code, true);
    const errors = valOrErrs.kind === "errors" ? valOrErrs.errors : [];
    const okErr = (err || []).join() === errors.map(({ e }) => e).join();
    const okOut = !out || trim(state.output) === out;
    const elapsedMs = getTimeMs() - startTime;
    const [tNum, tName, tElapsed, tOutput, tErrors] = [
      padEnd(`${t + 1}`, 3),
      padEnd(name, 24),
      padEnd(`${elapsedMs}ms`, 6),
      okOut || out + "	!=	" + trim(state.output),
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

;// CONCATENATED MODULE: ./src/val.ts


const num = ({ v }) => v;
const str = ({ v }) => v;
const vec = ({ v }) => v;
const dic = ({ v }) => v;
const isVecEqual = (a, b) => len(a) === len(b) && !a.some((x, i) => !isEqual(x, b[i]));
const isEqual = (a, b) => {
  if (a.t === "wild" || b.t === "wild") {
    return true;
  }
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
      return len(a.v.keys) === len(bd.keys) && isVecEqual(a.v.keys, bd.keys);
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
const stringify = (vals) => vals.reduce((cat, v) => cat + val2str(v), "");
const val2str = (val) => {
  const quoted = (v) => v.t === "str" ? `"${v.v}"` : val2str(v);
  if (val.t === "clo") {
    return val.v.name;
  } else if (val.t === "vec") {
    return `[${val.v.map(quoted).join(" ")}]`;
  } else if (val.t === "dict") {
    const { keys, vals } = val.v;
    const [ks, vs] = [keys.map(quoted), vals.map(quoted)];
    const entries = ks.map((k, i) => `${k} ${vs[i]}`);
    return `{${entries.join(", ")}}`;
  } else if (val.t === "null") {
    return "null";
  } else if (val.t === "wild") {
    return "_";
  }
  return `${val.v}`;
};
const asArray = (val) => val.t === "vec" ? slice(val.v) : val.t === "str" ? [...val.v].map((s) => ({ t: "str", v: s })) : val.t === "dict" ? val.v.keys.map((k, i) => ({
  t: "vec",
  v: [k, val.v.vals[i]]
})) : [];
const toDict = (args) => {
  if (len(args) % 2 === 1) {
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
const dictGet = ({ keys, vals }, key) => {
  const idx = keys.findIndex((k) => isEqual(k, key));
  return idx === -1 ? { t: "null", v: void 0 } : vals[idx];
};
const dictSet = ({ keys, vals }, key, val) => {
  const [nKeys, nVals] = [slice(keys), slice(vals)];
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
  const [nKeys, nVals] = [slice(keys), slice(vals)];
  const idx = keys.findIndex((k) => isEqual(k, key));
  if (idx !== -1) {
    splice(nKeys, idx, 1);
    splice(nVals, idx, 1);
  }
  return { t: "dict", v: { keys: nKeys, vals: nVals } };
};
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

;// CONCATENATED MODULE: ./src/index.ts
const insituxVersion = 20211208;




const { abs: src_abs, cos: src_cos, sin: src_sin, tan: src_tan, sign: src_sign, sqrt: src_sqrt, floor: src_floor, ceil: src_ceil, round: src_round, max: src_max, min: src_min } = poly_fills_namespaceObject;
const { logn: src_logn, log2: src_log2, log10: src_log10 } = poly_fills_namespaceObject;
const { concat: src_concat, has: src_has, flat: src_flat, push: src_push, reverse: src_reverse, slice: src_slice, splice: src_splice, sortBy: src_sortBy } = poly_fills_namespaceObject;
const { ends: src_ends, slen: src_slen, starts: src_starts, sub: src_sub, subIdx: src_subIdx, substr: src_substr, upperCase: src_upperCase, lowerCase: src_lowerCase } = poly_fills_namespaceObject;
const { trim: src_trim, trimStart: src_trimStart, trimEnd: src_trimEnd, charCode: src_charCode, codeChar: src_codeChar, strIdx: src_strIdx } = poly_fills_namespaceObject;
const { getTimeMs: src_getTimeMs, randInt: src_randInt, randNum: src_randNum } = poly_fills_namespaceObject;
const { isNum: src_isNum, len: src_len, objKeys: src_objKeys, range: src_range, toNum: src_toNum } = poly_fills_namespaceObject;





const externalOps = {};
let stack = [];
let lets = [];
let recurArgs;
const _boo = (v) => stack.push({ t: "bool", v });
const _num = (v) => stack.push({ t: "num", v });
const _str = (v = "") => stack.push({ t: "str", v });
const _vec = (v = []) => stack.push({ t: "vec", v });
const _dic = (v) => stack.push({ t: "dict", v });
const _nul = () => stack.push({ t: "null", v: void 0 });
const _fun = (v) => stack.push({ t: "func", v });
function exeOp(op, args, ctx, errCtx, checkArity) {
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
      ctx.print(stringify(args), op === "print");
      _nul();
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
        const [a2, b2] = [args[i - 1].v, args[i].v];
        if (op === "<" && a2 >= b2 || op === ">" && a2 <= b2 || op === "<=" && a2 > b2 || op === ">=" && a2 < b2) {
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
    case "round":
      if (src_len(args) === 2) {
        const x = 10 ** args[1].v;
        _num(src_round(args[0].v * x) / x);
      } else {
        _num(src_round(args[0].v));
      }
      return;
    case "sin":
    case "cos":
    case "tan":
    case "sqrt":
    case "floor":
    case "ceil":
    case "logn":
    case "log2":
    case "log10":
      _num({ sin: src_sin, cos: src_cos, tan: src_tan, sqrt: src_sqrt, floor: src_floor, ceil: src_ceil, logn: src_logn, log2: src_log2, log10: src_log10 }[op](num(args[0])));
      return;
    case "and":
      _boo(args.every(asBoo));
      return;
    case "or":
      _boo(args.some(asBoo));
      return;
    case "xor":
      if (asBoo(args[0]) !== asBoo(args[1])) {
        stack.push(asBoo(args[0]) ? args[0] : args[1]);
      } else {
        _boo(false);
      }
      return;
    case "&":
    case "|":
    case "^":
    case "<<":
    case ">>":
    case ">>>":
      const [a, b] = [num(args[0]), num(args[1])];
      _num(op === "&" ? a & b : op === "|" ? a | b : op === "^" ? a ^ b : op === "<<" ? a << b : op === ">>" ? a >> b : a >>> b);
      return;
    case "~":
      _num(~num(args[0]));
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
    case "wild?":
      _boo(op === "null?" && args[0].t === "null" || op === "num?" && args[0].t === "num" || op === "bool?" && args[0].t === "bool" || op === "str?" && args[0].t === "str" || op === "dict?" && args[0].t === "dict" || op === "vec?" && args[0].t === "vec" || op === "key?" && args[0].t === "key" || op === "func?" && (args[0].t === "func" || args[0].t === "clo") || op === "wild?" && args[0].t === "wild");
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
          i = args[0].v.findIndex((a2) => isEqual(a2, args[1]));
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
    case "count": {
      const closure = getExe(ctx, args.shift(), errCtx);
      if (op === "map" || op === "for") {
        const badArg = args.findIndex(({ t }) => t !== "vec" && t !== "str" && t !== "dict");
        if (badArg !== -1) {
          const badType = typeNames[args[badArg].t];
          return tErr(`argument ${badArg + 2} must be either: string, vector, dictionary, not ${badType}`);
        }
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
          const errors = closure(arrays.map((a2, i) => a2[argIdxs[i]]));
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
          const errors = closure(arrays.map((a2) => a2[i]));
          if (errors) {
            return errors;
          }
          array2.push(stack.pop());
        }
        _vec(array2);
        return;
      }
      if (op !== "reduce") {
        const array2 = asArray(args.shift());
        const isRemove = op === "remove", isFind = op === "find", isCount = op === "count";
        const filtered = [];
        let count = 0;
        for (let i = 0, lim = src_len(array2); i < lim; ++i) {
          const errors = closure([array2[i], ...args]);
          if (errors) {
            return errors;
          }
          const b2 = asBoo(stack.pop());
          if (isCount) {
            count += b2 ? 1 : 0;
          } else if (isFind) {
            if (b2) {
              stack.push(array2[i]);
              return;
            }
          } else if (b2 !== isRemove) {
            filtered.push(array2[i]);
          }
        }
        switch (op) {
          case "count":
            _num(count);
            return;
          case "find":
            _nul();
            return;
        }
        _vec(filtered);
        return;
      }
      const arrayVal = args.pop();
      if (!src_has(["vec", "dict", "str"], arrayVal.t)) {
        return tErr(`must reduce either: string, vector, dictionary, not ${typeNames[arrayVal.t]}`);
      }
      const array = asArray(arrayVal);
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
        const errors = closure([reduction, array[i]]);
        if (errors) {
          return errors;
        }
        reduction = stack.pop();
      }
      stack.push(reduction);
      return;
    }
    case "repeat": {
      const toRepeat = args.shift();
      const result = [];
      const count = num(args[0]);
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "would exceed range budget", errCtx }];
      }
      ctx.rangeBudget -= count;
      if (toRepeat.t === "func" || toRepeat.t === "clo") {
        const closure = getExe(ctx, toRepeat, errCtx);
        for (let i = 0; i < count; ++i) {
          const errors = closure([{ t: "num", v: i }]);
          if (errors) {
            return errors;
          }
          result.push(stack.pop());
        }
      } else {
        for (let i = 0; i < count; ++i) {
          result.push(toRepeat);
        }
      }
      _vec(result);
      return;
    }
    case "->": {
      stack.push(args.shift());
      for (let i = 0, end = src_len(args); i < end; ++i) {
        const errors = getExe(ctx, args[i], errCtx)([stack.pop()]);
        if (errors) {
          return errors;
        }
      }
      return;
    }
    case "rand-int":
    case "rand":
      {
        const nArgs = src_len(args);
        const [a2, b2] = [
          nArgs < 2 ? 0 : num(args[0]),
          nArgs === 0 ? 1 + src_toNum(op === "rand-int") : nArgs === 1 ? num(args[0]) : num(args[1])
        ];
        _num(op === "rand-int" ? src_randInt(a2, b2) : src_randNum(a2, b2));
      }
      return;
    case "do":
    case "val":
      stack.push(op === "do" ? args.pop() : args.shift());
      return;
    case ".":
    case "..":
    case "...": {
      const closure = getExe(ctx, args.shift(), errCtx);
      if (op === ".") {
        return closure(args);
      }
      let flatArgs = args;
      if (op === "..") {
        flatArgs = src_flat(args.map((a2) => a2.t === "vec" ? a2.v : [a2]));
      } else {
        const a2 = flatArgs.pop();
        src_push(flatArgs, src_flat([a2.t === "vec" ? a2.v : [a2]]));
      }
      return closure(flatArgs);
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
      const vlen = v.t === "vec" ? src_len(v.v) : src_slen(str(v));
      let a2 = 0, b2 = vlen;
      switch (src_len(args)) {
        case 1:
          a2 = 1;
          break;
        case 2: {
          const del = num(args[1]);
          if (del < 0) {
            b2 += del;
          } else {
            a2 += del;
          }
          break;
        }
        case 3: {
          const skip = num(args[1]);
          const take = num(args[2]);
          a2 = skip < 0 ? vlen + skip + (take < 0 ? take : 0) : a2 + skip;
          b2 = (take < 0 ? b2 : a2) + take;
          break;
        }
      }
      a2 = src_max(a2, 0);
      b2 = src_min(b2, vlen);
      if (a2 > b2) {
        (v.t === "vec" ? _vec : _str)();
        return;
      }
      if (v.t === "vec") {
        _vec(src_slice(v.v, a2, b2));
      } else {
        _str(src_substr(str(args[0]), a2, b2 - a2));
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
      const src = asArray(args[0]);
      if (!src_len(src)) {
        _vec();
        return;
      }
      const mapped = [];
      if (src_len(args) === 1) {
        src_push(mapped, src.map((v) => [v, v]));
      } else {
        const closure = getExe(ctx, args.pop(), errCtx);
        for (let i = 0, lim = src_len(src); i < lim; ++i) {
          const errors = closure([src[i]]);
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
        src_sortBy(mapped, ([x, a2], [y, b2]) => num(a2) > num(b2) ? 1 : -1);
      } else {
        src_sortBy(mapped, ([x, a2], [y, b2]) => str(a2) > str(b2) ? 1 : -1);
      }
      _vec(mapped.map(([v]) => v));
      return;
    }
    case "range": {
      const [a2, b2, s] = args.map(num);
      const edgeCase = s && s < 0 && a2 < b2;
      const [x, y] = src_len(args) > 1 ? edgeCase ? [b2 - 1, a2 - 1] : [a2, b2] : [0, a2];
      const step = src_sign((y - x) * (s || 1)) * (s || 1);
      const count = src_ceil(src_abs((y - x) / step));
      if (!count) {
        _vec([]);
        return;
      }
      if (count > ctx.rangeBudget) {
        return [{ e: "Budget", m: "would exceed range budget", errCtx }];
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
      _vec(str(args[src_len(args) - 1]).split(src_len(args) - 1 ? str(args[0]) : " ").map((v) => ({ t: "str", v })));
      return;
    case "join":
      _str(asArray(args[1]).map(val2str).join(str(args[0])));
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
      _str(src_range(src_max(src_ceil(num(args[1])), 0)).map((n) => text).join(""));
      return;
    }
    case "char-code": {
      if (args[0].t === "str") {
        const n = src_len(args) > 1 ? num(args[1]) : 0;
        const s = str(args[0]);
        if (src_slen(s) <= n || n < 0) {
          _nul();
        } else {
          _num(src_charCode(src_strIdx(s, n)));
        }
      } else {
        _str(src_codeChar(num(args[0])));
      }
      return;
    }
    case "time":
      _num(src_getTimeMs());
      return;
    case "version":
      _num(insituxVersion);
      return;
    case "tests":
      _str(doTests(invoke, !(src_len(args) && asBoo(args[0]))).join("\n"));
      return;
    case "symbols":
      _vec(symbols(ctx, false).map((v) => ({ t: "str", v })));
      return;
    case "eval": {
      delete ctx.env.funcs["entry"];
      const sLen = src_len(stack);
      const sourceId = `${errCtx.sourceId} eval`;
      const errors = parseAndExe(ctx, str(args[0]), sourceId);
      if (errors) {
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
    case "recur":
      recurArgs = args;
      return;
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
  const monoArityError = [
    {
      e: "Arity",
      m: `${typeNames[op.t]} as op requires one sole argument`,
      errCtx
    }
  ];
  if (op.t === "str" || op.t === "func") {
    const name = op.v;
    if (ops[name]) {
      if (ops[name].external) {
        return (params) => {
          const valOrErr = externalOps[name](params);
          if (valOrErr.kind === "err") {
            return [{ e: "External", m: valOrErr.err, errCtx }];
          }
          stack.push(valOrErr.value);
        };
      }
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
      return (params) => {
        if (!src_len(params)) {
          return monoArityError;
        }
        const err = ctx.set(src_substr(name, 1), params[0]);
        stack.push(params[0]);
        return err ? [{ e: "External", m: err, errCtx }] : void 0;
      };
    }
    return (params) => {
      const valAndErr = ctx.exe(name, params);
      if (valAndErr.kind === "val") {
        stack.push(valAndErr.value);
        return;
      }
      return [{ e: "External", m: valAndErr.err, errCtx }];
    };
  } else if (op.t === "clo") {
    return (params) => exeFunc(ctx, op.v, params);
  } else if (op.t === "key") {
    return (params) => {
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
    return (params) => {
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
    return (params) => {
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
    return (params) => {
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
    return (params) => {
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
  return (_) => [
    { e: "Operation", m: `${val2str(op)} is an invalid operation`, errCtx }
  ];
}
function src_errorsToDict(errors) {
  const newKey = (d, k, v) => dictSet(d, { t: "key", v: k }, v);
  return errors.map(({ e, m, errCtx }) => {
    let dict = newKey({ keys: [], vals: [] }, ":e", { t: "str", v: e });
    dict = newKey(dict, ":m", { t: "str", v: m });
    dict = newKey(dict, ":line", { t: "num", v: errCtx.line });
    dict = newKey(dict, ":col", { t: "num", v: errCtx.col });
    return { t: "dict", v: dict };
  });
}
function destruct(args, shape) {
  let arr = args;
  for (let a = 0, b = src_len(shape) - 1; a < b; ++a) {
    const val = arr[shape[a]];
    if (val.t === "vec") {
      arr = val.v;
    } else if (val.t === "str" && a + 1 === b && shape[a + 1] < src_slen(val.v)) {
      return { t: "str", v: src_strIdx(val.v, shape[a + 1]) };
    } else {
      return { t: "null", v: void 0 };
    }
  }
  const pos = shape[src_len(shape) - 1];
  return pos >= src_len(arr) ? { t: "null", v: void 0 } : arr[pos];
}
function exeFunc(ctx, func, args, inClosure = false) {
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
      case "dle":
      case "dva": {
        const paramsShape = ins.value;
        const val = stack.pop();
        let last;
        paramsShape.forEach(({ name, position }) => {
          if (ins.typ === "dva") {
            last = ctx.env.vars[name] = destruct([val], position);
          } else {
            last = lets[src_len(lets) - 1][name] = destruct([val], position);
          }
        });
        stack.push(last);
        break;
      }
      case "npa":
      case "upa": {
        const paramIdx = ins.value;
        if (paramIdx === -1) {
          _vec(args);
        } else if (src_len(args) <= paramIdx) {
          _nul();
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
          _fun(name);
        } else if (src_starts(name, "$")) {
          const valAndErr = ctx.get(src_substr(name, 1));
          if (valAndErr.kind === "err") {
            return [{ e: "External", m: valAndErr.err, errCtx }];
          }
          stack.push(valAndErr.value);
        } else if (name in ctx.env.vars) {
          stack.push(ctx.env.vars[name]);
        } else if (name in lets[src_len(lets) - 1]) {
          stack.push(lets[src_len(lets) - 1][name]);
        } else if (name in ctx.env.funcs) {
          _fun(name);
        } else {
          return [{ e: "Reference", m: `"${name}" did not exist`, errCtx }];
        }
        break;
      }
      case "exe": {
        const closure = getExe(ctx, stack.pop(), errCtx, false);
        const nArgs = ins.value;
        const params = src_splice(stack, src_len(stack) - nArgs, nArgs);
        const errors = closure(params);
        if (errors) {
          const nextCat = src_slice(func.ins, i).findIndex((ins2) => ins2.typ === "cat");
          if (nextCat !== -1) {
            i += nextCat;
            lets[src_len(lets) - 1]["errors"] = {
              t: "vec",
              v: src_errorsToDict(errors)
            };
            break;
          }
          return errors;
        }
        if (recurArgs) {
          lets[src_len(lets) - 1] = {};
          i = -1;
          const nArgs2 = ins.value;
          args = recurArgs;
          recurArgs = void 0;
          --ctx.recurBudget;
          if (!ctx.recurBudget) {
            return [{ e: "Budget", m: `recurred too many times`, errCtx }];
          }
          break;
        }
        break;
      }
      case "or":
        if (asBoo(stack[src_len(stack) - 1])) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      case "mat": {
        const a = stack[src_len(stack) - 2];
        if (!isEqual(a, stack.pop())) {
          i += ins.value;
        } else {
          stack.pop();
        }
        break;
      }
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
          src_splice(stack, stackLen, src_len(stack) - stackLen - 1);
        } else {
          _nul();
        }
        i = lim;
        break;
      case "clo":
      case "par": {
        const name = ins.value[0];
        let cins = ins.value[1];
        const isCapture = ({ typ, value }, i2) => typ === "ref" && !cins.find((i3) => i3.typ === "let" && i3.value === value) || typ === "npa" || typ === "val" && i2 + 1 !== src_len(cins) && cins[i2 + 1].typ === "exe";
        const derefFunc = {
          name: "",
          ins: cins.map((ins2, i2) => {
            if (i2 + 1 === src_len(cins)) {
              return ins2;
            }
            const possibleLet = ins2.typ === "val" && ins2.value.t === "str" && cins[i2 + 1].typ === "exe" && lets[src_len(lets) - 1][ins2.value.v];
            return possibleLet ? { typ: "val", value: possibleLet } : ins2;
          }).filter(isCapture)
        };
        const errors = exeFunc(ctx, derefFunc, args, true);
        if (errors) {
          return errors;
        }
        const numIns = src_len(derefFunc.ins);
        const captures = src_splice(stack, src_len(stack) - numIns, numIns);
        cins = cins.map((ins2, i2) => isCapture(ins2, i2) ? { typ: "val", value: captures.shift(), errCtx } : ins2);
        if (ins.typ === "par") {
          const { value: exeNumArgs, errCtx: errCtx2 } = cins.pop();
          if (src_len(cins) > 0 && cins[src_len(cins) - 1].typ === "exe") {
            const headStartIdx = cins.findIndex((i2) => i2.typ === "exp");
            const head = src_splice(cins, headStartIdx, src_len(cins) - headStartIdx);
            src_push(head, cins);
            cins = head;
          } else {
            cins.unshift(cins.pop());
          }
          cins.push({ typ: "upa", value: -1, errCtx: errCtx2 });
          cins.push({
            typ: "val",
            value: { t: "str", v: "..." },
            errCtx: errCtx2
          });
          cins.push({ typ: "exe", value: exeNumArgs + 2, errCtx: errCtx2 });
        }
        stack.push({ t: "clo", v: { name, ins: cins } });
        break;
      }
      case "exp":
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
function parseAndExe(ctx, code, sourceId) {
  const parsed = parse(code, sourceId);
  if (src_len(parsed.errors)) {
    return parsed.errors;
  }
  ctx.env.funcs = { ...ctx.env.funcs, ...parsed.funcs };
  if (!("entry" in ctx.env.funcs)) {
    return;
  }
  return exeFunc(ctx, ctx.env.funcs["entry"], []);
}
function ingestExternalOperations(functions) {
  functions.forEach(({ name, definition, handler }) => {
    if (ops[name] && !externalOps[name]) {
      throw "Redefining internal operations is disallowed.";
    }
    ops[name] = { ...definition, external: true };
    externalOps[name] = handler;
  });
}
function removeExternalOperations(functions) {
  functions.forEach(({ name }) => {
    delete ops[name];
    delete externalOps[name];
  });
}
function invoke(ctx, code, sourceId, printResult = false) {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  ingestExternalOperations(ctx.functions);
  const errors = parseAndExe(ctx, code, sourceId);
  removeExternalOperations(ctx.functions);
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  delete ctx.env.funcs["entry"];
  const value = stack.pop();
  [stack, lets] = [[], []];
  if (printResult && !errors && value) {
    ctx.print(val2str(value), true);
  }
  return errors ? { kind: "errors", errors } : value ? { kind: "val", value } : { kind: "empty" };
}
function invokeFunction(ctx, funcName, params) {
  const { callBudget, loopBudget, recurBudget, rangeBudget } = ctx;
  if (!(funcName in ctx.env.funcs)) {
    return;
  }
  ingestExternalOperations(ctx.functions);
  const errors = exeFunc(ctx, ctx.env.funcs[funcName], params);
  removeExternalOperations(ctx.functions);
  [ctx.callBudget, ctx.recurBudget] = [callBudget, recurBudget];
  [ctx.loopBudget, ctx.rangeBudget] = [loopBudget, rangeBudget];
  const value = stack.pop();
  [stack, lets] = [[], []];
  return errors ? { kind: "errors", errors } : value ? { kind: "val", value } : { kind: "empty" };
}
function symbols(ctx, alsoSyntax = true) {
  let syms = alsoSyntax ? ["function", "let", "var", "if", "if!", "while"] : [];
  src_push(syms, ["args", "PI", "E"]);
  syms = src_concat(syms, src_objKeys(ops));
  syms = src_concat(syms, src_objKeys(ctx.env.funcs));
  syms = src_concat(syms, src_objKeys(ctx.env.vars));
  const hidden = ["entry"];
  syms = syms.filter((o) => !src_has(hidden, o));
  return src_sortBy(syms, (a, b) => a > b ? 1 : -1);
}

;// CONCATENATED MODULE: ./src/invoker.ts


const invocations = new Map();
const parensRx = /[\[\]\(\) ,]/;
function invoker(ctx, code) {
  const uuid = getTimeMs().toString();
  invocations.set(uuid, code);
  const valOrErrs = invoke(ctx, code, uuid, true);
  if (valOrErrs.kind !== "errors") {
    return [];
  }
  let out = [];
  valOrErrs.errors.forEach(({ e, m, errCtx: { line, col, sourceId } }) => {
    const invocation = invocations.get(sourceId);
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



const repl_prompt = __webpack_require__(161);
const repl_nullVal = { kind: "val", value: { t: "null", v: void 0 } };
function read(path, asLines) {
  if (!fs.existsSync(path)) {
    return repl_nullVal;
  }
  const content = fs.readFileSync(path).toString();
  const str = (v) => ({ t: "str", v });
  return {
    kind: "val",
    value: asLines ? { t: "vec", v: content.split(/\r?\n/).map(str) } : str(content)
  };
}
function writeOrAppend(path, content, isAppend = false) {
  (isAppend ? fs.appendFileSync : fs.writeFileSync)(path, content);
  return repl_nullVal;
}
const writingOpDef = {
  exactArity: 2,
  params: ["str", "str"],
  returns: ["str"]
};
const functions = [
  {
    name: "read",
    definition: { exactArity: 1, params: ["str"], returns: ["str"] },
    handler: (params) => read(params[0].v, false)
  },
  {
    name: "read-lines",
    definition: { exactArity: 1, params: ["str"], returns: ["vec"] },
    handler: (params) => read(params[0].v, true)
  },
  {
    name: "write",
    definition: writingOpDef,
    handler: (params) => writeOrAppend(params[0].v, params[1].v)
  },
  {
    name: "append",
    definition: writingOpDef,
    handler: (params) => writeOrAppend(params[0].v, params[1].v, true)
  },
  {
    name: "prompt",
    definition: {
      exactArity: 1,
      params: ["str"],
      returns: ["str"]
    },
    handler: (params) => ({
      kind: "val",
      value: {
        t: "str",
        v: repl_prompt()(params[0].v)
      }
    })
  }
];
const env = new Map();
function repl_get(key) {
  return env.has(key) ? { kind: "val", value: env.get(key) } : {
    kind: "err",
    err: `key ${key} not found`
  };
}
function repl_set(key, val) {
  env.set(key, val);
  return void 0;
}
const ctx = {
  env: { funcs: {}, vars: {} },
  get: repl_get,
  set: repl_set,
  functions,
  print(str, withNewLine) {
    process.stdout.write(`[32m${str}[0m${withNewLine ? "\n" : ""}`);
  },
  exe: repl_exe,
  loopBudget: 1e7,
  rangeBudget: 1e6,
  callBudget: 1e8,
  recurBudget: 1e4
};
function repl_exe(name, args) {
  if (args.length) {
    const a = args[0];
    if (a.t === "str" && a.v.startsWith("$")) {
      if (args.length === 1) {
        return repl_get(`${a.v.substring(1)}.${name}`);
      } else {
        repl_set(`${a.v.substring(1)}.${name}`, args[1]);
        return { kind: "val", value: args[1] };
      }
    }
  }
  return { kind: "err", err: `operation ${name} does not exist` };
}
if (process.argv.length > 2) {
  const [x, y, path] = process.argv;
  if (fs.existsSync(path)) {
    const code = fs.readFileSync(path).toString();
    printErrorOutput(invoker(ctx, code));
  }
} else {
  printErrorOutput(invoker(ctx, `(str "Insitux " (version) " REPL")`));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\u276F ",
    completer,
    history: fs.existsSync(".repl-history") ? fs.readFileSync(".repl-history").toString().split("\n").reverse() : []
  });
  rl.on("line", (line) => {
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
        printErrorOutput(invoker(ctx, input));
      }
      rl.setPrompt("\u276F ");
    } else {
      rl.setPrompt(". ");
    }
    rl.prompt();
  });
  rl.on("close", () => {
    console.log();
  });
  rl.prompt();
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
let lines = [];
function isFinished(code) {
  const { tokens } = tokenise(code, "");
  const numL = tokens.filter((t) => t.typ === "(").length;
  const numR = tokens.filter((t) => t.typ === ")").length;
  return numL <= numR;
}
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