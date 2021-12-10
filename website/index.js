document.addEventListener("DOMContentLoaded", async function () {
  const req = await fetch(
    `README.md`,
  );
  const text = await req.text();
  const examples = text
    .replace(/[\s\w\W]+## Various examples/, "")
    .replaceAll(/```.*/g, "")
    .trim();
  const html = insituxHighlight(examples);
  document.querySelector("examples").innerHTML = html;
});
