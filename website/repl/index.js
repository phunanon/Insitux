let $input, $history;
const id = Date.now();

async function DomKeydown({ keyCode, shiftKey }) {
  if (![13, 9].includes(keyCode) || shiftKey) {
    return true;
  }
  const input = $input.value.trim();
  setTimeout(() => {
    $input.value = "";
    DomInputResize($input);
  }, 10);
  $history.innerHTML += `<code>${insituxHighlight(input)}</code>\n`;
  const errors = (await insituxInvoke(input, browserExe))
    .map(({ type, text }) =>
      type == "message" ? `<m>${text}</m>` : `<e>${text}</e>`,
    )
    .join("");
  $history.innerHTML += errors;
  $history.scrollTo(0, $history.scrollHeight);
  return false;
}

function historyAppend(str) {
  $history.innerHTML += str;
}

async function browserExe(name, args) {
  const nullVal = { t: "null", v: undefined };
  switch (name) {
    case "print-str":
    case "print":
      historyAppend(args[0].v + (name == "print" ? "\n" : ""));
      break;
    case "clear":
      setTimeout(() => ($history.innerHTML = ""), 1000);
      break;
    default:
      if (args.length && args[0].t == "str" && args[0].v.startsWith("$")) {
        if (args.length === 1) {
          return await insituxGet(`${args[0].v.substring(1)}.${name}`);
        } else {
          insituxSet(`${args[0].v.substring(1)}.${name}`, args[1]);
          return { value: args[1] };
        }
      }
      return { value: nullVal, err: `operation ${name} does not exist` };
  }
  return { value: nullVal };
}

let state = {};

async function DomLoad() {
  state = JSON.parse(localStorage.getItem("repl")) ?? {};
  $input = document.querySelector("textarea");
  $history = document.querySelector("div");
  $history.innerHTML += `<a href="https://phunanon.github.io/insitux"><img src="../../media/Insitux64.png"/></a><span>REPL</span>\n`;
  $history.addEventListener("mouseup", event => {
    if (!(getSelection() + "")) {
      $input.focus();
    }
  });
  $input.addEventListener("keydown", DomKeydown);
  $input.focus();
  DomInputResize($input);
  await insituxInvoke('(str "Insitux version " (version))', browserExe);
  await insituxInvoke("(tests)", browserExe);
}

function DomInputResize(that) {
  that.style.height = 0;
  that.style.height = `calc(${that.scrollHeight}px - 1rem)`;
  window.scrollTo(0, document.body.scrollHeight);
  $history.style.height = `calc(100% - 1rem - ${that.style.height})`;
}

const insituxEnv = { funcs: {}, vars: {}, lets: [] };

async function insituxGet(key) {
  return { value: state[key] };
}

async function insituxSet(key, val) {
  state[key] = val;
  localStorage.setItem("repl", JSON.stringify(state));
}

async function insituxInvoke(code, exe) {
  return await insitux(
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
