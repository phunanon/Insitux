import { invoke } from ".";

export namespace Test {
  let state: Map<string, ExternalTypes>;
  let output = "";

  function get(key: string) {
    const val = state.get(key);
    //console.log(`get ${key}: ${val}`);
    return {
      value: val || null,
      error: val ? null : `"${key} not found.`,
    };
  }

  function set(key: string, val: ExternalTypes) {
    //console.log(`set ${key}: ${val}`);
    return null;
  }

  function exe(name: string, args: ExternalTypes[]) {
    switch (name) {
      case "print":
        output += args[0];
        break;
    }
    return { value: 0, error: "none" };
  }

  export function perform() {
    //Clear environment
    state = new Map<string, ExternalTypes>();
    //Define tests
    type Test = { name: string; code: string; numError?: number; out: string };
    type Result = { name: string; errSuccess: boolean; outSuccess: boolean };
    const tests: Test[] = [
      //Basic functions
      { name: "Hello, world!", code: `(println "Hello, world!")`, out: `Hello, world!\nNull` },
      { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
      //Moderate functions
      { name: "Average", code: `(fn avg (/ (sum %) (len %))) (avg [0 10 20 30 40])`, out: `20` },
      //Test environment functions
      {
        name: "get set get",
        code: `[(get globals.time_offset)
                (set globals.time_offset 5.5)
                (get globals.time_offset)]`,
        numError: 0,
        out: `[null 5.5 5.5]`,
      },
    ];
    //Begin tests
    const test = (code: string) => invoke({ get, set, exe }, code);
    const run = ({ name, code, numError, out }: Test): Result => {
      const errors = test(code);
      const errSuccess = (numError || 0) == errors.length;
      const outSuccess = output == out;
      output = "";
      return { name, errSuccess, outSuccess };
    };
    const results = tests.map(run);
    results.forEach(({ name, outSuccess, errSuccess }) =>
      console.log(name.padEnd(24), outSuccess, errSuccess)
    );
  }
}
