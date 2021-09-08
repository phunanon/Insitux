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

async function initInsitux() {
  await loadJS("../../out/index.js");
  await loadJS("../../out/parse.js");
  await loadJS("../../out/types.js");
  await loadJS("../../out/test.js");
  await loadJS("../../out/poly-fills.js");
  await loadJS("../../out/repl.js");
}

async function invokeInsitux(code, exe) {
  return await invoker(
    {
      env: { funcs: {}, vars: {}, lets: [] },
      exe,
      get: async key => ({ value: state.get(key) }),
      set: async (key, val) => {
        state.set(key, val);
        return [];
      },
      callBudget: 1000,
      rangeBudget: 1000,
      loopBudget: 10000,
    },
    code,
  );
}
