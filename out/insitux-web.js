import * as Insitux from "./insitux.js";

const e = el => document.querySelector(el);
const loaderEnv = { funcs: {}, vars: {}, lets: [] };
const state = new Map();

async function loaderGet(key) {
  return { value: state.get(key) };
}

async function loaderSet(key, val) {
  return state.set(key, val) && undefined;
}

async function loaderExe(name, args) {
  const nullVal = { t: "null", v: undefined };
  switch (name) {
    case "print-str":
    case "print":
      console.log(args[0].v);
      break;
    case "inner-html":
      e(args[0].v).innerHTML = args[1].v;
      break;
    default:
      if (args.length && args[0].t == "str" && args[0].v.startsWith("$")) {
        if (args.length === 1) {
          return await loaderGet(`${args[0].v.substring(1)}.${name}`);
        } else {
          loaderSet(`${args[0].v.substring(1)}.${name}`, args[1]);
          return { value: args[1] };
        }
      }
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal };
}

const insituxLoader = () => {
  const code = document.querySelector(`script[type="text/insitux"]`).innerHTML;
  insitux(
    {
      env: loaderEnv,
      exe: loaderExe,
      get: loaderGet,
      set: loaderSet,
      rangeBudget: 1000,
      loopBudget: 10000,
      callBudget: 1000,
      recurBudget: 10000,
    },
    code,
  );
};

window.onload = insituxLoader;
