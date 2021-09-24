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
  let build = "";
  build = code
    .split("\n")
    .map(line => (line.startsWith(";") ? `<i>${line}</i>` : line))
    .join("\n");
  build = build.replaceAll(/([0-9]+)([\s\)\]])/g, "<num>$1</num>$2");
  let newBuild = "",
    depth = 0,
    inString = false,
    inOp = false;
  for (let i = 0; i < build.length; ++i) {
    if (build[i] == '"') {
      inString = !inString;
      newBuild += `${inString ? "<str>" :""}"${inString ? "" : "</str>"}`;
      continue;
    }
    if (inString) {
      newBuild += build[i];
      continue;
    }
    if (/[\[\]\(\)\s]/.test(build[i]) && inOp) {
      inOp = false;
      newBuild += "</op>";
    }
    if ("([{".includes(build[i])) {
      newBuild += `<p${depth}>${build[i]}</p${depth}>`;
      ++depth;
      inOp = build[i] == "(";
      if (inOp) {
        newBuild += "<op>";
      }
    } else if (")]}".includes(build[i])) {
      --depth;
      newBuild += `<p${depth}>${build[i]}</p${depth}>`;
    } else {
      newBuild += build[i];
    }
  }
  return newBuild;
}
