function insituxHighlight(code) {
  const { tokens } = insituxTokenise(code, "", false, true);
  let lines = [];
  let lineLen = 1;
  let prevText = "";
  let depth = 0;
  for (let t = 0, lim = tokens.length; t < lim; ++t) {
    let {
      typ,
      text,
      errCtx: { line, col },
    } = tokens[t];
    while (line > lines.length) {
      lines.unshift("");
      lineLen = 1;
    }
    lines[0] += " ".repeat(col - lineLen);
    if (typ == "str") {
      text = `"${text}"`;
    }
    lineLen = col + text.length;
    text = text
      .replaceAll(">", "&gt;")
      .replaceAll("<", "&lt;")
      .replaceAll("\n", "\\n")
      .trimEnd();
    if (typ == "(" || typ == ")") {
      depth -= Number(typ == ")");
      lines[0] += `<p${depth}>${text}</p${depth}>`;
      depth += Number(typ == "(");
    } else {
      lines[0] +=
        typ == "sym" && text == "#"
          ? `<p${depth}>${text}</p${depth}>`
          : prevText == "("
          ? `<op>${text}</op>`
          : typ == "sym" && text.startsWith("%")
          ? `<arg>${text}</arg>`
          : typ == "sym" && text.startsWith(":")
          ? `<key>${text}</key>`
          : typ == "rem"
          ? `<rem>;${text}</rem>`
          : typ == "str"
          ? `<str>${text}</str>`
          : typ == "num"
          ? `<num>${text}</num>`
          : text;
    }
    prevText = text;
  }
  return lines.reverse().join("\n");
}

const addCss = s =>
  (document.head.appendChild(document.createElement("style")).innerHTML = s);

document.addEventListener("DOMContentLoaded", async function () {
  const css = `
rem { color: #0f0; }
op { color: #aaf; }
str,
arg,
key,
num { color: rgb(255, 164, 111) !important; }
p0 { color: #2ae0d7; }
p1 { color: #dd3d65; }
p2 { color: #14b17a; }
p3 { color: #c7e564; }
p4 { color: #e24dc2; }
p5 { color: #ff9b00; }
p6 { color: #6660ff; }
p7 { color: #4de2aa; }
p8 { color: #ffb6ca; }`;
  addCss(css.split("\n").join("\n.highlight "));
});
