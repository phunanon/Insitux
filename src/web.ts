import { functionInvoker, InvokeOutput, invoker } from "./invoker";
import { Ctx, defaultCtx, ExternalFunctions, Val, ValOrErr } from "./types";
import { num, str, val2str, _nul, _str } from "./val";

const e = (el: string) => document.querySelector(el);
let state = new Map<string, Val>();

const get = (key: string): ValOrErr =>
  state.has(key) ? state.get(key)! : _nul();
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
      return args[1];
    }
  }
  return { err: `operation ${name} does not exist` };
}

function fetchOp(url: string, method: string, callback: string, body?: string) {
  setTimeout(async () => {
    let v: Val;
    try {
      v = { t: "str", v: await (await fetch(url, { method, body })).text() };
    } catch (e) {
      v = { t: "null", v: undefined };
    }
    alertErrors(functionInvoker(ctx, callback, [v]));
  });
}

function htmlToElement(html: string) {
  let temp = document.createElement("template");
  html = html.trim();
  temp.innerHTML = html;
  return temp.content.firstChild;
}

const v2e = (val: Val) => (val.t === "str" ? e(val.v) : <HTMLElement>val.v);
const functions: ExternalFunctions = {
  js: {
    definition: { minArity: 1, params: ["str"] },
    handler: params => {
      try {
        const evaluated = eval(str(params[0]));
        const v =
          typeof evaluated === "function"
            ? evaluated(params.slice(1).map(a => a.v))
            : evaluated;
        let value: Val = { t: "ext", v };
        if (typeof v === "string") value = _str(v);
        return value;
      } catch (e) {
        return { err: `${e}` };
      }
    },
  },
  "inner-html": {
    definition: { exactArity: 2, params: [["str", "ext"]], returns: ["str"] },
    handler: ([el, html]) => {
      const element = v2e(el);
      if (element) {
        element.innerHTML = val2str(html);
      }
    },
  },
  "html-el": {
    definition: {
      exactArity: 1,
      returns: ["ext"],
    },
    handler: ([html]) => {
      return { t: "ext", v: htmlToElement(val2str(html)) };
    },
  },
  "child-at": {
    definition: {
      exactArity: 2,
      params: [["str", "ext"], "num"],
      returns: ["ext", "null"],
    },
    handler: ([parent, index]) => {
      const el = v2e(parent)?.childNodes[num(index)];
      return el ? { t: "ext", v: el } : _nul();
    },
  },
  "append-child": {
    definition: {
      exactArity: 2,
      params: [["str", "ext"], "ext"],
      returns: ["null"],
    },
    handler: ([parent, child]) => {
      const parentEl = v2e(parent);
      parentEl?.appendChild(<HTMLElement>child.v);
    },
  },
  "remove-child": {
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
    },
  },
  "replace-child": {
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
    },
  },
  prompt: {
    definition: { exactArity: 1, returns: ["str", "null"] },
    handler: params => {
      const reply = prompt(val2str(params[0]));
      return reply ? _str(reply) : _nul();
    },
  },
  alert: {
    definition: { exactArity: 1, returns: ["null"] },
    handler: params => {
      alert(val2str(params[0]));
    },
  },
  interval: {
    definition: { exactArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval]) => {
      setInterval(() => invoker(ctx, `(${func.v})`), num(interval));
    },
  },
  timeout: {
    definition: { exactArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval]) => {
      setTimeout(() => invoker(ctx, `(${func.v})`), num(interval));
    },
  },
  "GET-str": {
    definition: {
      exactArity: 2,
      params: ["func", "str"],
      returns: ["str"],
    },
    handler: ([callback, url]) => {
      fetchOp(str(url), "GET", str(callback));
    },
  },
  "POST-str": {
    definition: {
      exactArity: 3,
      params: ["func", "str", "str"],
      returns: ["str"],
    },
    handler: ([callback, url, body]) => {
      fetchOp(str(url), "POST", str(callback), str(body));
    },
  },
};

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

function alertErrors({ output }: { output: InvokeOutput }) {
  if (output.length > 0) {
    const errorTexts = output.map(({ type, text }) =>
      type === "error" ? [...text, ""].join("\u0332") : text,
    );
    alert(`---- Insitux\n${errorTexts.join("")}`);
  }
}
