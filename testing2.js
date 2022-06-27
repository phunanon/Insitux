const ops = {};
ops["fib"] = (n) => (((n < 2) ? n : ((ops["fib"]((n - 1))) + (ops["fib"]((n - 2))))));
ops["entry"] = () => (ops["fib"](28));

let deltas = [];
for (let i = 0; i < 100; ++i) {
  const start = Date.now();
  const answer = ops.entry();
  let delta = Date.now() - start;
  deltas.push(delta);
  console.log(`${answer} ${delta}ms`);
}
deltas.sort();
console.log(`Median: ${deltas[deltas.length / 2]}ms`);