import { functionInvoker, InvokeOutput, invoker } from "./invoker";
import { Ctx, defaultCtx, ExternalFunctions, Val } from "./types";
import { num, str, val2str, _nul, _str, _num, _boo } from "./val";
import { jsToIx } from "./val-translate";

const invokeFunction = (ctx: Ctx, name: string, args: Val[]) => {
  alertErrors(functionInvoker(ctx, name, args, false));
};

function fetchOp(
  url: string,
  method: string,
  callback?: string,
  body?: string,
) {
  setTimeout(async () => {
    let v: Val;
    try {
      v = { t: "str", v: await (await fetch(url, { method, body })).text() };
    } catch (e) {
      v = { t: "null", v: undefined };
    }
    if (callback) {
      invokeFunction(ctx, callback, [v]);
    }
  });
}

function htmlToElement(html: string) {
  let temp = document.createElement("template");
  html = html.trim();
  temp.innerHTML = html;
  return temp.content.firstChild;
}

const v2e = (val: Val) =>
  val.t === "str" ? document.querySelector(val.v) : <HTMLElement>val.v;
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
        return jsToIx(v, v => ({ t: "ext", v }));
      } catch (e) {
        return { err: `${e}` };
      }
    },
  },
  call: {
    definition: { minArity: 1, params: ["key", "ext"] },
    handler: ([method, object, ...rest]) => {
      const methodName = str(method).slice(1);
      const obj = object.v;
      try {
        console.log("obj", obj);
        const args = rest.map(a => a.v);
        const x = eval(`obj.${methodName}(...args)`);
        eval("window.obj = obj");
        return jsToIx(x, v => ({ t: "ext", v }));
      } catch (e) {
        return { err: `${e}` };
      }
    },
  },
  prop: {
    definition: { exactArity: 2, params: ["str", "ext"] },
    handler: ([prop, object]) => {
      const propName = str(prop);
      const obj = object.v;
      try {
        const x = eval(`obj["${propName}"]`);
        return jsToIx(x, v => ({ t: "ext", v }));
      } catch (e) {
        return { err: `${e}` };
      }
    },
  },
  "query-selector-all": {
    definition: { exactArity: 1, params: ["str"], returns: ["vec"] },
    handler: ([selector]) => {
      return {
        t: "vec",
        v: Array.from(document.querySelectorAll(str(selector))).map(el => {
          return { t: "ext", v: el };
        }),
      };
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
  "set-interval": {
    definition: { exactArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval]) => {
      setInterval(() => invoker(ctx, `(${func.v})`), num(interval));
    },
  },
  "set-timeout": {
    definition: { minArity: 2, params: ["func", "num"], returns: ["null"] },
    handler: ([func, interval, ...args]) => {
      setTimeout(
        () => invokeFunction(ctx, str(func), args),
        num(interval),
      );
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
      minArity: 2,
      maxArity: 3,
      params: ["str", "str", "func"],
      returns: ["str"],
    },
    handler: ([url, body, callback]) => {
      fetchOp(
        str(url),
        "POST",
        callback ? str(callback) : undefined,
        str(body),
      );
    },
  },
};

const ctx: Ctx = {
  ...defaultCtx,
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
