function insituxHighlight(code) {
  const { tokens } = insituxTokenise(code, "", false);
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
    text = text.replaceAll(">", "&gt;").replaceAll("<", "&lt;");
    if (typ == "(" || typ == ")") {
      depth -= Number(typ == ")");
      lines[0] += `<p${depth}>${text}</p${depth}>`;
      depth += Number(typ == "(");
    } else {
      lines[0] +=
        prevText == "("
          ? `<op>${text}</op>`
          : typ == "rem"
          ? `<i>;${text}</i>`
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
.highlight i {
  color: #0f0;
}
.highlight op {
  color: #aaf;
}
.highlight str, .highlight num {
  color: rgb(255, 164, 111) !important;
}
.highlight p0 {
  color: #2ae0d7;
}
.highlight p1 {
  color: #dd3d65;
}
.highlight p2 {
  color: #14b17a;
}
.highlight p3 {
  color: #c7e564;
}
.highlight p4 {
  color: #e24dc2;
}`;
  addCss(css);
});