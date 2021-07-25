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
    type Test = { name: string; code: string; numError?: number; out: string };
    type Result = { name: string; errSuccess: boolean; outSuccess: boolean };
    const tests: Test[] = [
      //Basic snippets
      { name: "Hello, world!", code: `"Hello, world!"`, out: `Hello, world!` },
      { name: "Say Hello, world!", code: `(print-line "Hello, world!")`, out: `Hello, world!\nnull` },
      { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
      { name: "(1+1)+1+(1+1) = 5", code: `(+ (+ 1 1) 1 (+ 1 1))`, out: `5` },
      //{ name: "Conditional head", code: `((if true + -) 12 9 1)`, out: `22` },
      /*{ name: "Vector retrieve", code: `(2 [:a :b :c :d])`, out: `:c` },
      //Moderate functions
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
      },*/
    ];
    //Begin tests
    const env: Env = { funcs: {}, vars: {} };
    const results: { name: string; errSuccess: boolean; outSuccess: boolean }[] = [];
    for (const { name, code, numError, out } of tests) {
      const state: State = { dict: new Map<string, ExternalValue>(), output: "" };
      const errors = await invoke(
        {
          get: (key: string) => get(state, key),
          set: (key: string, val: ExternalValue) => set(state, key, val),
          exe: (name: string, args: ExternalValue[]) => exe(state, name, args),
          env,
        },
        code
      );
      const errSuccess = (numError || 0) == errors.length;
      const outSuccess = state.output == out + "\n";
      results.push({ name, errSuccess, outSuccess });
    }
    results.forEach(({ name, outSuccess, errSuccess }) =>
      console.log(name.padEnd(24), outSuccess, errSuccess)
    );
  }
}
