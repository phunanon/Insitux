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
  let build = code;
  let newBuild = "",
    depth = 0,
    inComment = false,
    inString = false,
    inOp = false,
    inNum = false;
  for (let i = 0; i < build.length; ++i) {
    const prevCh = i ? build[i - 1] : "";
    if (inComment) {
      newBuild += build[i];
      inComment = build[i] != "\n";
      if (!inComment) {
        newBuild += "</i>";
      }
      continue;
    } else if (!inString && build[i] == ";") {
      inComment = true;
      newBuild += "<i>;";
      continue;
    }
    if (build[i] == '"') {
      inString = !inString;
      newBuild += `${inString ? "<str>" : ""}"${inString ? "" : "</str>"}`;
      continue;
    }
    if (inString) {
      newBuild += build[i];
      continue;
    }
    if (inOp) {
      if (/[\[\]\(\)\s]/.test(build[i])) {
        inOp = false;
        newBuild += "</op>";
      }
    } else if (prevCh != "#" && /[\d.]/.test(build[i])) {
      if (!inNum) {
        newBuild += "<num>";
      }
      inNum = true;
    } else if (inNum) {
      inNum = false;
      newBuild += "</num>";
    }
    if ("([{".includes(build[i])) {
      if (prevCh == "#") {
        newBuild = newBuild.substring(0, newBuild.length - 1);
        newBuild += `<p${depth}>#${build[i]}</p${depth}>`;
      } else {
        newBuild += `<p${depth}>${build[i]}</p${depth}>`;
      }
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
