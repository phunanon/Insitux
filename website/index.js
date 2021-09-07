document.addEventListener("DOMContentLoaded", async function () {
  const req = await fetch(
    `https://raw.githubusercontent.com/phunanon/Insitux/master/README.md`
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
  build = build.replaceAll(/(\"[^\"]+\"|\:[^\n\s\[\]]+)/g, `<str>$1</str>`);
  build = build.replaceAll(/\(([^\n\s\[\]]+)/g, "(<op>$1</op>");
  let newBuild = "",
    depth = 0;
  for (let i = 0; i < build.length; ++i) {
    if ("([".includes(build[i])) {
      newBuild += `<p${depth}>${build[i]}</p${depth}>`;
      ++depth;
    } else if (")]".includes(build[i])) {
      --depth;
      newBuild += `<p${depth}>${build[i]}</p${depth}>`;
    } else {
      newBuild += build[i];
    }
  }
  return newBuild;
}
