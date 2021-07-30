import { invoke } from ".";
import { len } from "./poly-fills";

type State = { dict: Map<string, ExternalValue>; output: string };

async function get(state: State, key: string) {
  const val = state.dict.get(key);
  //console.log(`get ${key}: ${val}`);
  return {
    value: val || null,
    error: val ? null : `"${key} not found.`,
  };
}

async function set(state: State, key: string, val: ExternalValue) {
  //console.log(`set ${key}: ${val}`);
  return null;
}

async function exe(state: State, name: string, args: ExternalValue[]) {
  switch (name) {
    case "print":
      state.output += args[0];
      break;
    case "print-line":
      state.output += args[0] + "\n";
      break;
  }
  return { value: 0, error: "none" };
}

export async function performTests() {
  //Define tests
  const tests: {
    name: string;
    code: string;
    err?: string[];
    out?: string;
  }[] = [
    //Basic snippets
    { name: "Hello, world!", code: `"Hello, world!"`, out: `Hello, world!` },
    {
      name: "Say Hello, world!",
      code: `(print-line "Hello, world!")`,
      out: `Hello, world!\nnull`,
    },
    { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
    { name: "Negate 1 = -1", code: `(- 1)`, out: `-1` },
    { name: "(1+1)+1+(1+1) = 5", code: `(+ (+ 1 1) 1 (+ 1 1))`, out: `5` },
    { name: "Conditional head", code: `((if true + -) 12 9 1)`, out: `22` },
    { name: "String retrieve", code: `(2 "Hello")`, out: `l` },
    { name: "Vector retrieve", code: `(2 [:a :b :c :d])`, out: `:c` },
    { name: "Define and retrieve", code: `(define a 1) a`, out: `1` },
    { name: "Define and add", code: `(define a 1) (inc a)`, out: `2` },
    { name: "Define op and call", code: `(define f +) (f 2 2)`, out: `4` },
    {
      name: "Define num op and call",
      code: `(define f 1) (f [:a :b :c])`,
      out: `:b`,
    },
    { name: "Print simple vector", code: `[1 2 3]`, out: `[1 2 3]` },
    {
      name: "Sum vector of numbers",
      code: `[(reduce + [1 2 3]) (reduce + [1 2 3] 3)]`,
      out: `[6 9]`,
    },
    {
      name: "Sum vectors of numbers",
      code: `(map + [1 2 3] [1 2 3 4])`,
      out: `[2 4 6]`,
    },
    //Basic functions
    {
      name: "Call greet func",
      code: `(function greeting (print-line "Hello!")) (greeting)`,
      out: `Hello!\nnull`,
    },
    {
      name: "Call const val func",
      code: `(function const 123) (const)`,
      out: `123`,
    },
    {
      name: "Call greet with name",
      code: `(function greeting name (print-line "Hello, " name "!")) (greeting "Patrick")`,
      out: `Hello, Patrick!\nnull`,
    },
    {
      name: "Call with too few args",
      code: `(function func a b c [a b c]) (func 1 2)`,
      out: `[1 2 null]`,
    },
    {
      name: "Define func and call",
      code: `(function func a b (+ a b)) (define f func) (f 2 2)`,
      out: `4`,
    },
    {
      name: "Anonymous parameters",
      code: `(function avg<n? (< (/ (reduce + %) (len %)) %1)) (avg<n? [0 10 20 30 40] 5)`,
      out: `false`,
    },
    //Type errors
    {
      name: "String instead of number",
      code: `(function avg (/ (reduce + %) (len %))) (print-line (avg [1 2 3])) (avg "Hello")`,
      out: `2`,
      err: ["Type Error"],
    },
    //Complex functions
    {
      name: "Fibonacci 23",
      code: `(function fib n (if (< n 2) n (+ (fib (dec n)) (fib (- n 2)))))
             (fib 23)`,
      out: `28657`,
    },
    //Test environment functions
    {
      name: "get set get",
      code: `[(get globals.time_offset)
              (set globals.time_offset 5.5)
              (get globals.time_offset)]`,
      out: `[null 5.5 5.5]`,
    },
    //Syntax errors
  ];
  //Begin tests
  const env: Env = { funcs: {}, vars: {} };
  const results: {
    name: string;
    okErr: boolean;
    okOut: boolean;
    errors: InvokeError[];
    elapsedMs: number;
  }[] = [];
  for (const { name, code, err, out } of tests) {
    const state: State = {
      dict: new Map<string, ExternalValue>(),
      output: "",
    };
    const startTime = new Date().getTime();
    const errors = await invoke(
      {
        get: (key: string) => get(state, key),
        set: (key: string, val: ExternalValue) => set(state, key, val),
        exe: (name: string, args: ExternalValue[]) => exe(state, name, args),
        env,
      },
      code
    );
    const okErr = (err || []).join() == errors.map(({ e }) => e).join();
    const okOut = !out || state.output.trim() == out;
    results.push({
      name,
      okErr,
      okOut,
      errors,
      elapsedMs: new Date().getTime() - startTime,
    });
  }
  results.forEach(({ name, okOut, okErr, errors, elapsedMs }, i) =>
    console.log(
      `${i + 1}`.padEnd(3),
      name.padEnd(24),
      `${elapsedMs}ms`.padEnd(6),
      okOut,
      okErr || errors
    )
  );
  const totalMs = results.reduce((sum, { elapsedMs }) => sum + elapsedMs, 0);
  console.log(
    `----- ${len(results.filter(({ okOut, okErr }) => okOut && okErr))}/${len(
      results
    )} passed in ${totalMs}ms.`
  );
}
