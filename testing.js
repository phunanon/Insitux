
var ops = {
  dec(x) { return x - 1; },
  str(...args) {
    return args.join("");
  },
  version() {
    return "22.5.8";
  },
  print(...args) {
    console.log(args.join(""));
  },
  "fast+": (...args) => {
    return args[0] + args[1];
  },
  "fast-": (...args) => {
    return args[0] - args[1];
  },
  "fast<": (...args) => {
    return args[0] < args[1];
  }
}

ops["fib"] = function(...args) {
  var stack = [];
  stack.push(args[0]);
  stack.push(2);
  stack.push("fast<");
  var op = stack.pop();
  var params = stack.splice(stack.length - (1 + 1), 2);
  stack.push(ops[op](...params));
  if (stack.pop()) {
    stack.push(args[0]);
  }
  else {
    stack.push(args[0]);
    stack.push("dec");
    var op = stack.pop();
    var params = stack.splice(stack.length - (1 + 0), 1);
    stack.push(ops[op](...params));
    stack.push("fib");
    var op = stack.pop();
    var params = stack.splice(stack.length - (1 + 0), 1);
    stack.push(ops[op](...params));
    stack.push(args[0]);
    stack.push(2);
    stack.push("fast-");
    var op = stack.pop();
    var params = stack.splice(stack.length - (1 + 1), 2);
    stack.push(ops[op](...params));
    stack.push("fib");
    var op = stack.pop();
    var params = stack.splice(stack.length - (1 + 0), 1);
    stack.push(ops[op](...params));
    stack.push("fast+");
    var op = stack.pop();
    var params = stack.splice(stack.length - (1 + 1), 2);
    stack.push(ops[op](...params));
  }
  return stack.pop();
}
ops["entry"] = function(...args) {
  var stack = [];
  stack.push(28);
  stack.push("fib");
  var op = stack.pop();
  var params = stack.splice(stack.length - (1 + 0), 1);
  stack.push(ops[op](...params));
  return stack.pop();
}

let deltas = [];
for (let i = 0; i < 100; ++i) {
  const start = Date.now();
  ops.entry();
  let delta = Date.now() - start;
  deltas.push(delta);
  console.log(`${delta}ms`);
}
deltas.sort();
console.log(`Median: ${deltas[deltas.length / 2]}ms`);