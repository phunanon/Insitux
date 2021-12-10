import * as Insitux from "./insitux.js";

const e = el => document.querySelector(el);
const loaderEnv = { funcs: {}, vars: {} };
const state = new Map();

function loaderGet(key) {
  return { value: state.get(key) };
}

function loaderSet(key, val) {
  return state.set(key, val) && undefined;
}

function loaderExe(name, args) {
  const nullVal = { kind: "val", value: { t: "null", v: undefined } };
  switch (name) {
    case "print-str":
    case "print":
      console.log(args[0].v);
      return nullVal;
    case "inner-html":
      e(args[0].v).innerHTML = args[1].v;
      return nullVal;
    default:
      if (args.length && args[0].t == "str" && args[0].v.startsWith("$")) {
        if (args.length === 1) {
          return loaderGet(`${args[0].v.substring(1)}.${name}`);
        } else {
          loaderSet(`${args[0].v.substring(1)}.${name}`, args[1]);
          return { kind: "val", value: args[1] };
        }
      }
      return { kind: "err", err: `operation ${name} does not exist` };
  }
}

const loadScript = async scriptEl => {
  const code = scriptEl.src
    ? await (await fetch(scriptEl.src)).text()
    : scriptEl.innerHTML;
  const errors = insitux(
    {
      env: loaderEnv,
      exe: loaderExe,
      get: loaderGet,
      set: loaderSet,
      functions: [],
      rangeBudget: 1e4,
      loopBudget: 1e4,
      callBudget: 1e4,
      recurBudget: 1e4,
    },
    code,
  );
  if (errors.length > 0) {
    console.log(`Insitux:
${errors.map(err => err.text).join("")}`);
  }
}

window.onload = async () => {
  const scripts = document.querySelectorAll(`script[type="text/insitux"]`);
  for (let s = 0; s < scripts.length; ++s) {
    await loadScript(scripts[s]);
  }
};
