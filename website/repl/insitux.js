const exports = {};
const readline = {
    createInterface: () => {},
  },
  process = {},
  fs = { existsSync: () => {} },
  rl = {};
const imported = [];
async function loadJS(url) {
  let code = await (await fetch(url)).text();
  code = code.replaceAll(/Object\.defineProperty\(exports.+\s+/g, "");
  code = code.replaceAll(/const.+ = require.+\s+/g, "");
  code = code.replaceAll(/exports.+void 0;\s+/g, "");
  code = code.replaceAll(/exports\.(.+ = .+)/g, "var $1");
  code = code.replaceAll(/var (.+) = \1;\s+/g, "");
  code = code.replaceAll(/exports\./g, "");
  code = code.replaceAll(/parse_1\./g, "");
  code = code.replaceAll(/poly_fills_1\./g, "");
  code = code.replaceAll(/test_1\./g, "");
  code = code.replaceAll(/types_1\./g, "");
  code = code.replaceAll(/_1\./g, "");
  code = code.replaceAll(/[\w\W\s]+const invocations/g, "const invocations");
  const el = document.createElement("script");
  el.innerHTML = code;
  document.body.appendChild(el);
}

async function insituxInit() {
  await loadJS("../../out/index.js");
  await loadJS("../../out/parse.js");
  await loadJS("../../out/types.js");
  await loadJS("../../out/test.js");
  await loadJS("../../out/poly-fills.js");
  await loadJS("../../out/repl.js");
}

const insituxEnv = { funcs: {}, vars: {}, lets: [] };

async function insituxGet(key) {
  return { value: state.get(key) };
}

async function insituxSet(key, val) {
  state.set(key, val);
  return [];
}

async function insituxInvoke(code, exe) {
  return await invoker(
    {
      env: insituxEnv,
      exe,
      get: insituxGet,
      set: insituxSet,
      rangeBudget: 1000,
      loopBudget: 10000,
      callBudget: 1000,
      recurBudget: 10000,
    },
    code,
  );
}
