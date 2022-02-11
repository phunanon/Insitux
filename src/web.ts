import { functionInvoker, InvokeOutput, invoker } from "./invoker";
import { Ctx, defaultCtx, ExternalFunction, Val, ValOrErr } from "./types";
import { num, str, val2str } from "./val";

const e = (el: string) => document.querySelector(el);
let state = new Map<string, Val>();

const get = (key: string): ValOrErr =>
  state.has(key) ? { kind: "val", value: state.get(key)! } : nullValOrErr;
const set = (key: string, val: Val) => {
  state.set(key, val);
  localStorage.setItem("insitux-state", JSON.stringify([...state.entries()]));
  return undefined;
};

function exe(name: string, args: Val[]): ValOrErr {
  if (args.length && args[0].t == "str" && args[0].v.startsWith("$")) {
    if (args.length === 1) {
      return get(`${args[0].v.substring(1)}.${name}`);
    } else {
      set(`${args[0].v.substring(1)}.${name}`, args[1]);
      return { kind: "val", value: args[1] };
    }
  }
  return { kind: "err", err: `operation ${name} does not exist` };
}

function fetchOp(url: string, method: string, callback: string) {
  setTimeout(async () => {
    const v = await (await fetch(url, { method })).text();
    alertErrors(functionInvoker(ctx, callback, [{ t: "str", v }]));
  });
}

const nullVal: Val = { t: "null", v: undefined };
const nullValOrErr: ValOrErr = { kind: "val", value: nullVal };
const v2e = (val: Val) => (val.t === "str" ? e(val.v) : <HTMLElement>val.v);
const functions: ExternalFunction[] = [
  {
    name: "js",
    definition: { minArity: 1, params: ["str"] },
    handler: params => {
      try {
        const evaluated = eval(str(params[0]));
        const v =
          typeof evaluated === "function"
            ? evaluated(params.slice(1).map(a => a.v))
            : evaluated;
        let value: Val = { t: "ext", v };
        if (typeof v === "string") value = { t: "str", v };
        return { kind: "val", value };
      } catch (e) {
        return { kind: "err", err: `${e}` };
      }
    },
  },
  {
    name: "html",
    definition: { exactArity: 2, params: [["str", "ext"]], returns: ["str"] },
    handler: ([el, html]) => {
      const element = v2e(el);
      if (element) {
        element.innerHTML = val2str(html);
      }
      return nullValOrErr;
    },
  },
  {
    name: "new-el",
    definition: {
      minArity: 2,
      maxArity: 3,
      params: ["str", "str", "dict"],
      returns: ["ext"],
    },
    handler: ([tag, body, props]) => {
      if (str(tag) === "text") {
      }
      const el = document.createElement(str(tag));
      el.innerHTML = str(body);
      return { kind: "val", value: { t: "ext", v: el } };
    },
  },
  {
    name: "new-text-el",
    definition: { exactArity: 1, params: ["str"], returns: ["ext"] },
    handler: ([text]) => {
      const el = document.createTextNode(str(text));
      return { kind: "val", value: { t: "ext", v: el } };
    },
  },
  {
    name: "child-at",
    definition: {
      exactArity: 2,
      params: [["str", "ext"], "num"],
      returns: ["ext", "null"],
    },
    handler: ([parent, index]) => {
      const el = v2e(parent)?.childNodes[num(index)];
      return { kind: "val", value: el ? { t: "ext", v: el } : nullVal };
    },
  },
  {
    name: "append-child",
    definition: {
      exactArity: 2,
      params: [["str", "ext"], "ext"],
      returns: ["null"],
    },
    handler: ([parent, child]) => {
      const parentEl = v2e(parent);
      parentEl?.appendChild(<HTMLElement>child.v);
      return nullValOrErr;
    },
  },
  {
    name: "remove-child",
    definition: {
      exactArity: 2,
      params: [["str", "ext"], "num"],
      returns: ["null"],
    },
    handler: ([parent, index]) => {
      if (parent.t === "str") {
        const parentEl = v2e(parent);
        parentEl?.removeChild(parentEl.childNodes[num(index)]);
      }
      return nullValOrErr;
    },
  },
  {
    name: "replace-child",
    definition: {
      exactArity: 3,
      params: [["str", "ext"], "ext", "num"],
      returns: ["null"],
    },
    handler: ([parent, child, index]) => {
      const [parentEl, childEl] = [v2e(parent), v2e(child)];
      const replacedEl = parentEl?.childNodes[num(index)];
      if (parentEl && childEl && replacedEl) {
        parentEl.replaceChild(childEl, replacedEl);
      }
      return nullValOrErr;
    },
  },
  {
    name: "prompt",
    definition: { exactArity: 1, returns: ["str", "null"] },
    handler: params => {
      const reply = prompt(val2str(params[0]));
      return { kind: "val", value: reply ? { t: "str", v: reply } : nullVal };
    },
  },
  {
    name: "alert",
    definition: { exactArity: 1, returns: ["null"] },
    handler: params => {
      alert(val2str(params[0]));
      return nullValOrErr;
    },
  },
  {
    name: "interval",
    definition: { exactArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval]) => {
      setInterval(() => invoker(ctx, `(${func.v})`), num(interval));
      return nullValOrErr;
    },
  },
  {
    name: "timeout",
    definition: { exactArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval]) => {
      setTimeout(() => invoker(ctx, `(${func.v})`), num(interval));
      return nullValOrErr;
    },
  },
  {
    name: "fetch-str",
    definition: {
      exactArity: 3,
      params: ["func", "str", "str"],
      returns: ["str"],
    },
    handler: ([callback, method, url]) => {
      fetchOp(str(url), str(method), str(callback));
      return nullValOrErr;
    },
  },
];

const ctx: Ctx = {
  ...defaultCtx,
  exe,
  get,
  set,
  print: str => console.log(str),
  functions,
};

const loadScript = async (scriptEl: HTMLScriptElement) => {
  const code = scriptEl.src
    ? await (await fetch(scriptEl.src)).text()
    : scriptEl.innerHTML;
  window.ix(code);
};

window.onload = async () => {
  const savedState = localStorage.getItem("insitux-state");
  state = new Map<string, Val>(savedState ? JSON.parse(savedState) : []);
  console.log(state);
  const scripts = Array.from(document.querySelectorAll("script")).filter(
    el => el.type === "text/insitux",
  );
  for (let s = 0; s < scripts.length; ++s) {
    await loadScript(scripts[s]);
  }
};

declare global {
  interface Window {
    ix: (code: string) => void;
  }
}

window.ix = code => alertErrors(invoker(ctx, code));

function alertErrors(errors: InvokeOutput) {
  if (errors.length > 0) {
    const errorTexts = errors.map(({ type, text }) =>
      type === "error" ? [...text, ""].join("\u0332") : text,
    );
    alert(`---- Insitux\n${errorTexts.join("")}`);
  }
}
