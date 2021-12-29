let $input, $history;
const id = Date.now();

function executeInput(input) {
  const precode = LZString.compressToEncodedURIComponent(input);
  $history.innerHTML +=
    "<code>" +
    `<a href="?precode=${precode}" target="_self">&#x1f517;</a>` +
    insituxHighlight(input) +
    "</code>\n";
  const errors = insituxInvoke(input)
    .map(({ type, text }) =>
      type == "message" ? `<m>${text}</m>` : `<e>${text}</e>`,
    )
    .join("");
  $history.innerHTML += errors;
  $history.scrollTo(0, $history.scrollHeight);
}

function DomKeydown({ keyCode, shiftKey }) {
  if (![13, 9].includes(keyCode) || shiftKey) {
    return true;
  }
  const input = $input.value;
  setTimeout(() => {
    $input.value = "";
    DomInputResize($input);
  }, 10);
  executeInput(input);
  return false;
}

function historyAppend(str) {
  $history.innerHTML += str;
}

function browserExe(name, args) {
  const nullVal = { t: "null", v: undefined };
  switch (name) {
    case "prompt":
      return { kind: "val", value: { t: "str", v: prompt(args[0].v) } };
    case "clear":
      setTimeout(() => ($history.innerHTML = ""), 1000);
      break;
    default:
      if (args.length && args[0].t == "str" && args[0].v.startsWith("$")) {
        if (args.length === 1) {
          return insituxGet(`${args[0].v.substring(1)}.${name}`);
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

function DomLoad() {
  state = JSON.parse(localStorage.getItem("repl")) ?? {};
  $input = document.querySelector("textarea");
  $history = document.querySelector("div");
  $history.innerHTML += `<a href="https://github.com/phunanon/Insitux"><img src="../../media/ix64.png"/></a><span>REPL</span>\n`;
  $history.addEventListener("mouseup", e => {
    if (!(getSelection() + "")) {
      $input.focus();
    }
  });
  $input.addEventListener("keydown", DomKeydown);
  $input.focus();
  DomInputResize($input);
  insituxInvoke('(str "Insitux version " (version))');

  //Pre-filled code from URL query
  const params = new URLSearchParams(window.location.search);
  const precodeQuery = params.get("precode");
  if (!precodeQuery) {
    return;
  }
  const precode = LZString.decompressFromEncodedURIComponent(precodeQuery);
  if (precode) {
    executeInput(precode);
  }
}

function DomInputResize(that) {
  that.style.height = 0;
  that.style.height = `calc(${that.scrollHeight}px - 1rem)`;
  window.scrollTo(0, document.body.scrollHeight);
  $history.style.height = `calc(100% - 1rem - ${that.style.height})`;
}

const insituxEnv = { funcs: {}, vars: {} };

function insituxGet(key) {
  return { value: state[key] };
}

function insituxSet(key, val) {
  state[key] = val;
  localStorage.setItem("repl", JSON.stringify(state));
}

function insituxInvoke(code) {
  return insitux(
    {
      env: insituxEnv,
      exe: browserExe,
      get: insituxGet,
      set: insituxSet,
      print(str, withNewLine) {
        historyAppend(`${str}${withNewLine ? "\n" : ""}`);
      },
      functions: [],
      rangeBudget: 10000,
      loopBudget: 10000,
      callBudget: 10000,
      recurBudget: 10000,
    },
    code,
  );
}
