document.addEventListener("DOMContentLoaded", async function () {
  const req = await fetch(
    `https://raw.githubusercontent.com/phunanon/Insitux/master/README.md`,
  );
  const text = await req.text();
  const examples = text
    .replace(/[\s\w\W]+### Various examples/, "")
    .replaceAll(/```.*/g, "")
    .trim();
  const html = synHighlight(examples);
  document.querySelector("examples").innerHTML = html;
});

function synHighlight(code) {
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
    text = text.replaceAll("<", "&gt;");
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
