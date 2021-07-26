import { invoke } from ".";

export namespace Test {
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

  export async function perform() {
    //Define tests
    const tests: {
      name: string;
      code: string;
      numError?: number;
      out: string;
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
      /*//Moderate functions
      {
        name: "Average",
        code: `(function avg (/ (sum %) (len %))) (avg [0 10 20 30 40])`,
        out: `20`,
      },
      //Complex functions
      {
        name: "Fibonacci",
        code: `(function fib n (if (< n 2) n (+ (fib (dec n)) (fib (- n 2)))))
               (println (fib 23))`,
        out: `28657`,
      },
      //Test environment functions
      {
        name: "get set get",
        code: `[(get globals.time_offset)
                (set globals.time_offset 5.5)
                (get globals.time_offset)]`,
        numError: 0,
        out: `[null 5.5 5.5]`,
      },
      //Syntax errors
      */
    ];
    //Begin tests
    const env: Env = { funcs: {}, vars: {} };
    const results: {
      name: string;
      okErr: boolean;
      okOut: boolean;
      errors: InvokeError[];
    }[] = [];
    const startTime = new Date().getTime();
    for (const { name, code, numError, out } of tests) {
      const state: State = {
        dict: new Map<string, ExternalValue>(),
        output: "",
      };
      const errors = await invoke(
        {
          get: (key: string) => get(state, key),
          set: (key: string, val: ExternalValue) => set(state, key, val),
          exe: (name: string, args: ExternalValue[]) => exe(state, name, args),
          env,
        },
        code
      );
      const okErr = (numError || 0) == errors.length;
      const okOut = state.output == out + "\n";
      results.push({ name, okErr, okOut, errors });
    }
    results.forEach(({ name, okOut, okErr, errors }, i) =>
      console.log(`${i}`.padEnd(3), name.padEnd(24), okOut, okErr || errors)
    );
    console.log(
      `${results.filter(({ okOut, okErr }) => okOut && okErr).length}/${
        results.length
      } passed in ${new Date().getTime() - startTime}ms.`
    );
  }
}
