import { Ctx, Env, Val, ValOrErr, InvokeResult } from "./types";
const { round } = Math;

type State = { output: string };

function exe(state: State, name: string, args: Val[]): ValOrErr {
  const nullVal: Val = { t: "null", v: undefined };
  switch (name) {
    case "test.function":
      state.output += args[0].v + "\n";
      break;
    default:
      return { err: `operation "${name}" does not exist` };
  }
  return nullVal;
}

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
    code: `;This is a test comment
           (print "Hello, world!")`,
    out: `Hello, world!\nnull`,
  },
  { name: "1 + 1 = 2", code: `(+ 1 1)`, out: `2` },
  { name: "Negate 1 = -1", code: `(neg 1)`, out: `-1` },
  { name: "(1+1)+1+(1+1) = 5", code: `(+ (+ 1 1) 1 (+ 1 1))`, out: `5` },
  { name: "Conditional head", code: `((if true + -) 12 9 1)`, out: `22` },
  {
    name: "when and unless",
    code: `[(when 123 (print "hi") 234) (unless true (print "bye"))]`,
    out: `hi\n[234 null]`,
  },
  {
    name: "match and wildcard",
    code: `(match [1 2]
             [0 0] (print "hello")
             [0 2] (print "bye")
             [1 _] "hey")`,
    out: `hey`,
  },
  { name: "Cond number head", code: `((if false 1 2) [:a :b :c])`, out: `:c` },
  {
    name: "and & short-circuit",
    code: `[(and true (if true null 1) (print "hi")) (and 1 2 3)]`,
    out: `[false true]`,
  },
  {
    name: "or & short-circuit",
    code: `[(or true (print "hi") 1) (or false (print-str "-> ") 1)]`,
    out: `-> [true 1]`,
  },
  { name: "String retrieve", code: `(2 "Hello")`, out: `l` },
  { name: "Vector retrieve", code: `(2 [:a :b :c :d])`, out: `:c` },
  {
    name: "Key as operation",
    code: `[(:age {:name "Patrick" :age 24}) (:abc [:a :abc :c])]`,
    out: `[24 :abc]`,
  },
  {
    name: "Dictionary as op 1",
    code: `({"name" "Patrick" "age" 24} "age")`,
    out: `24`,
  },
  {
    name: "Dictionary as op 2",
    code: `({"name" "Patrick"} "age" 24)`,
    out: `{"name" "Patrick", "age" 24}`,
  },
  {
    name: "Equalities",
    code: `[(= 1 2 1)
            (not= 1 2 1)
            (= "Hello" "hello")
            (not= "world" "world")
            (= [0 [1]] [0 [1]])]`,
    out: `[false true false false true]`,
  },
  { name: "Define and retrieve", code: `(var a 1) a`, out: `1` },
  { name: "Define and add", code: `(var a 1) (inc a)`, out: `2` },
  { name: "Define op and call", code: `(var f +) (f 2 2)`, out: `4` },
  { name: "Define vec and call", code: `(var f [1]) (f 1)`, out: `1` },
  {
    name: "Define num and call",
    code: `(var f 1) (f [:a :b :c])`,
    out: `:b`,
  },
  { name: "Apply op to var", code: `(var a 5) (var! a - 10)`, out: `5` },
  {
    name: "Apply op to let",
    code: `(let a 10) (let! a (if true + -) (+ 2 3) 5)`,
    out: `20`,
  },
  { name: "Print simple vector", code: `[1 2 3]`, out: `[1 2 3]` },
  { name: "Boolean select", code: `[(true 1 2) (false 1)]`, out: `[1 null]` },
  {
    name: "Sum vector of numbers",
    code: `[(reduce + [1 2 3]) (reduce + 3 [1 2 3])]`,
    out: `[6 9]`,
  },
  {
    name: "Sum vectors of numbers",
    code: `(map + [1 2 3] [1 2 3 4])`,
    out: `[2 4 6]`,
  },
  {
    name: "Basic for XY list",
    code: `(for x [0 1] y [3 4] [x y])`,
    out: `[[0 3] [0 4] [1 3] [1 4]]`,
  },
  {
    name: "Dependent for XY list",
    code: `(for x [0 1] y [(inc x) (+ x 2)] [x y])`,
    out: `[[0 1] [0 2] [1 2] [1 3]]`,
  },
  {
    name: "Empty for",
    code: `(for x [] 1)`,
    out: `[]`,
  },
  {
    name: "Return from for",
    code: `(for x [1 2 3] [x (return 4) x])`,
    out: `4`,
  },
  {
    name: "Trailing continue",
    code: `(for x [1 2 3] (+ 2 2) (continue))`,
    out: `[]`,
  },
  {
    name: "For triangle",
    code: `(for x [0 1 2 3] y (range x) [x y])`,
    out: `[[1 0] [2 0] [2 1] [3 0] [3 1] [3 2]]`,
  },
  {
    name: "For continue",
    code: `(for x [0 1 2 3] (when (= x 2) (continue)) x)`,
    out: `[0 1 3]`,
  },
  {
    name: "For break",
    code: `(for x [0 1 2 3] (when (= x 2) (break)) x)`,
    out: `[0 1]`,
  },
  {
    name: "For destructure",
    code: `(for [x y] [[1 2]] [x y])`,
    out: `[[1 2]]`,
  },
  {
    name: "For closure capture",
    code: `(var y 10 f (fn (for x (range 3) y)) y 20) (f)`,
    out: `[10 10 10]`,
  },
  {
    name: "Filter by integer",
    code: `(filter 2 [[1] [:a :b :c] "hello" "hi"])`,
    out: `[[:a :b :c] "hello"]`,
  },
  {
    name: "Comments, short decimal",
    code: `;((print "Hello")
           .456`,
    out: `0.456`,
  },
  {
    name: "Dictionary into vector",
    code: `(into [1 2] {3 4 5 6})`,
    out: `[1 2 [3 4] [5 6]]`,
  },
  {
    name: "Vector into dictionary",
    code: `(into {[0] 1 [2] 3} [[0] 2])`,
    out: `{[0] 2, [2] 3}`,
  },
  {
    name: "While loop",
    code: `(var n 5)
           (while (< 0 n)
             (print-str n)
             (var n (dec n)))`,
    out: `543210`,
  },
  {
    name: "Loop",
    code: `(loop 3 i (print-str i))`,
    out: `012null`,
  },
  {
    name: "Catch error",
    code: `(catch
             (:e (catch (let a :a) (+ 1 a) (0 errors)))
             (print "hi"))`,
    out: `Type`,
  },
  //Basic functions and closures
  { name: "Define with no call", code: `(function func (print "Nothing."))` },
  {
    name: "Call greet func",
    code: `(function greeting (print "Hello!")) (greeting)`,
    out: `Hello!\nnull`,
  },
  {
    name: "Call const value func",
    code: `(function const 123) (const)`,
    out: `123`,
  },
  {
    name: "Call identity funcs",
    code: `(function id1 %)
           (function id2 x x)
           [(id1 123) (id2 456)]`,
    out: `[123 456]`,
  },
  {
    name: "Call greet with name",
    code: `(function greeting name (print "Hello, " name "!"))
           (greeting "Patrick")`,
    out: `Hello, Patrick!\nnull`,
  },
  {
    name: "Call with too few args",
    code: `(function func a b c [a b c]) (func 1 2)`,
    out: `[1 2 null]`,
  },
  {
    name: "Define func and call",
    code: `(function func a b (+ a b)) (var f func) (f 2 2)`,
    out: `4`,
  },
  {
    name: "Anonymous parameters",
    code: `(function avg<n? (< (/ (.. + %) (len %)) %1))
           (avg<n? [0 10 20 30 40] 5)`,
    out: `false`,
  },
  {
    name: "Call parameter",
    code: `(function f x (x "hello")) (f print)`,
    out: `hello\nnull`,
  },
  { name: "Let and retrieve", code: `(function f (let a 1) a) (f)`, out: `1` },
  {
    name: "Let num op and call",
    code: `(function f (let n 0) (n [1])) (f)`,
    out: `1`,
  },
  {
    name: "Explicit return",
    code: `(function f (return 123) (print 456)) (f)`,
    out: `123`,
  },
  {
    name: "Closure 1",
    code: `(let x 10)
           (let closure #(+ x x))
           (let x 11)
           (closure)`,
    out: `20`,
  },
  {
    name: "Closure 2",
    code: `(filter #(or (= % 5) (even? %)) (range 10))`,
    out: `[0 2 4 5 6 8]`,
  },
  {
    name: "Closure 3",
    code: `(map #(len args) (range 3) (range 3))`,
    out: `[2 2 2]`,
  },
  {
    name: "Closure 4",
    code: `(function f #(+ x x))
           (var x 10) (let c20 (f))
           (var x 20) (let c40 (f))
           [(c20) (c40)]`,
    out: `[20 40]`,
  },
  {
    name: "Closure with ext func",
    code: `(#(test.function %) 1)`,
    out: `1\nnull`,
  },
  {
    name: "Func returns closure",
    code: `(function f x #(x 2 2))
           (let closure (f +))
           (closure)`,
    out: `4`,
  },
  {
    name: "Dictionary closure",
    code: `(function f x #{x 2})
           (let closure (f :a))
           (closure)`,
    out: `{:a 2}`,
  },
  {
    name: "Vector closure",
    code: `(function f x #[1 x %])
           (let closure (f 2))
           (closure 3)`,
    out: `[1 2 3]`,
  },
  {
    name: "Closure as head",
    code: `(#[% %1 %2] 1 2 3)`,
    out: `[1 2 3]`,
  },
  {
    name: "Partial closure 1",
    code: `(@[] 1 2 3)`,
    out: `[1 2 3]`,
  },
  {
    name: "Partial closure 2",
    code: `(@((do +) 2) 2)`,
    out: `4`,
  },
  {
    name: "Parameterised closure 1",
    code: `((fn a b (+ a b)) 2 2)`,
    out: `4`,
  },
  {
    name: "Parameterised closure 2",
    code: `((fn a b (print-str a b) (+ a b)) 2 2)`,
    out: `224`,
  },
  {
    name: "Parameterised closure 3",
    code: `(reduce
             (fn primes num
               (if (find zero? (map (rem num) primes))
                 primes
                 (append num primes)))
             [2]
             (range 3 10))`,
    out: `[2 3 5 7]`,
  },
  {
    name: "Closure with inter-lets",
    code: `(let a + c 5 d 10)
           (let closure (fn b (let d 1) (a b c d)))
           (let a - c 4 d 11)
           (closure 1)`,
    out: `7`,
  },
  {
    name: "Closure with inner-let",
    code: `(((fn x (let y 1) #[x y]) 2))`,
    out: `[2 1]`,
  },
  {
    name: "Closure w/ var var",
    code: `(var x 1) (let f (fn (var x (inc x)))) (f) (f)`,
    out: `3`,
  },
  {
    name: "Closure with captured f",
    code: `[((fn x (@(val x))) 0) (var f val) ((fn y (@(f y))) 0)]`,
    out: `[0 val 0]`,
  },
  {
    name: "Closure w/ inter-params",
    code: `(function f x (fn y (fn z [x y z]))) (((f :a) :b) :c)`,
    out: `[:a :b :c]`,
  },
  {
    name: "Clojure w/ shadow param",
    code: `(function f y ((fn x y [x y]) 1 y)) (f 5)`,
    out: `[1 5]`,
  },
  {
    name: "Destructure var",
    code: `(var [x [y]] [1 [2]]) [y x]`,
    out: `[2 1]`,
  },
  {
    name: "Destructure bad",
    code: `(var [a b [c d]] [0 1]) [a b c d]`,
    out: `[0 1 null null]`,
  },
  {
    name: "Destructure string",
    code: `(let [a b c] "hello") [a b c]`,
    out: `["h" "e" "l"]`,
  },
  {
    name: "Destructure function",
    code: `(function f a [[b c] d] e [e d c b a]) (f 0 [[1 2] 3] 4)`,
    out: `[4 3 2 1 0]`,
  },
  {
    name: "Destructuring closure",
    code: `(let f (fn a [b [c]] d [d c b a])) (f 0 [1 [2]] 3)`,
    out: `[3 2 1 0]`,
  },
  {
    name: "Destruct closure capture",
    code: `(((fn [x] #(val x)) [1]))`,
    out: `1`,
  },
  {
    name: "Destructuring fn decoy",
    code: `(let f (fn a [a [a]])) (f 0)`,
    out: `[0 [0]]`,
  },
  {
    name: "Destructure rest",
    code: `(let [a b & c] [1 2 3]) [a b c]`,
    out: `[1 2 [3]]`,
  },
  {
    name: "Destructure params rest",
    code: `(function f a & b [a b]) (f 1 2 3)`,
    out: `[1 [2 3]]`,
  },
  {
    name: "Destructure rest empty",
    code: `(function f a & b [a b]) (f 1)`,
    out: `[1 []]`,
  },
  { name: "Implicit currying", code: "(-> 1 inc (+ 10))", out: `12` },
  //Runtime errors
  {
    name: "String instead of number",
    code: `(function sum (.. + args))
           (print (sum 2 2))
           (sum 2 "hi")`,
    out: `4`,
    err: ["Type"],
  },
  { name: "Reference non-existing", code: `x`, err: ["Reference"] },
  {
    name: "Expired let retrieve",
    code: `(function f (let a 1) a) (f) a`,
    err: ["Reference"],
  },
  { name: "Call non-existing", code: `(x)`, err: ["External"] },
  { name: "Call budget", code: `(function f (f)) (f)`, err: ["Budget"] },
  {
    name: "Loop budget",
    code: `(var n 10000)
           (while (< 0 n)
             (var n (dec n)))`,
    err: ["Budget"],
  },
  { name: "Range budget", code: `(range 10000)`, err: ["Budget"] },
  {
    name: "Head exe arity check",
    code: `(((fn +)) 1)`,
    err: ["Arity"],
  },
  { name: "Orphaned break", code: `(break)`, err: ["Parse"] },
  //Complex functions
  {
    name: "Fibonacci 13",
    code: `(function fib n
             (if (< n 2) n
               (+ (fib (dec n))
                  (fib (- n 2)))))
           (fib 6)`,
    out: `8`,
  },
  {
    name: "dedupe (recur)",
    code: `(function dedupe list -out
             (let out (or -out []))
             (let next (if (out (0 list)) [] [(0 list)]))
             (if (empty? list) out
                 (recur (skip 1 list) (into out next))))
           (dedupe [1 1 2 3 3 3])`,
    out: `[1 2 3]`,
  },
  {
    name: "frequencies",
    code: `(function frequencies list
             (reduce #(% %1 (inc (or (% %1) 0))) {} list))
           (frequencies "12121212")`,
    out: `{"1" 4, "2" 4}`,
  },
  //Test environment functions
  { name: "exe", code: `(test.function 123)`, out: `123\nnull` },
  //Syntax errors
  { name: "Empty parens", code: `()`, err: ["Parse"] },
  { name: "Imbalanced parens 1", code: `(print ("hello!")`, err: ["Parse"] },
  { name: "Imbalanced parens 2", code: `print "hello!")`, err: ["Parse"] },
  {
    name: "Imbalanced quotes",
    code: `(print "Hello)`,
    err: ["Parse"],
  },
  { name: "Function as op", code: `(function)`, err: ["Parse"] },
  { name: "Function without name", code: `(function (+))`, err: ["Parse"] },
  { name: "Function without body", code: `(function func)`, err: ["Parse"] },
  { name: "Variable not symbol", code: `(var 1 2)`, err: ["Parse"] },
  //Parser type and arity errors
  { name: "Parser type error 1", code: `(function f (+ 1 :a))`, err: ["Type"] },
  {
    name: "Parser type error 2",
    code: `(function f (+ 1 (into {} {})))`,
    err: ["Type"],
  },
  {
    name: "Parser type error 3",
    code: `(function f (if true (into 2 {}) (+ 2 2)))`,
    err: ["Type"],
  },
  { name: "Parser arity error 1", code: `(abs)`, err: ["Parse"] },
  //Testing
  { name: "Assertion", code: `(assert "test" false)`, err: ["Assert"] },
  {
    name: "Mock & unmock",
    code: `(mock print (var x)) (print 1) (unmock print) (print x)`,
    out: `1\nnull`,
  },
  {
    name: "Mock variable value",
    code: `(let x do) (mock x *) (do 2 2)`,
    out: `4`,
  },
  {
    name: "Unmocked",
    code: "(mock print do) ((unmocked print) 1)",
    out: `1\nnull`,
  },
];

export function doTests(
  invoke: (
    ctx: Ctx,
    code: string,
    invokeId: string,
    print: boolean,
  ) => InvokeResult,
  terse = true,
): string[] {
  const results: {
    okErr: boolean;
    okOut: boolean;
    elapsedMs: number;
    display: string;
  }[] = [];
  for (let t = 0; t < tests.length; ++t) {
    const { name, code, err, out } = tests[t];
    const state: State = { output: "" };
    const env: Env = { funcs: {}, vars: {}, mocks: {} };
    const startTime = new Date().getTime();
    const valOrErrs = invoke(
      {
        print: (str, withNewLine) => {
          state.output += str + (withNewLine ? "\n" : "");
        },
        exe: (name: string, args: Val[]) => exe(state, name, args),
        functions: {},
        env,
        loopBudget: 1000,
        rangeBudget: 100,
        callBudget: 100,
        recurBudget: 100,
      },
      code,
      code,
      true,
    );
    const errors = "errors" in valOrErrs ? valOrErrs.errors : [];
    const okErr = (err || []).join() === errors.map(({ e }) => e).join();
    const okOut = !out || state.output.trim() === out;
    const elapsedMs = new Date().getTime() - startTime;
    const [tNum, tName, tElapsed, tOutput, tErrors] = [
      `${t + 1}`.padEnd(3),
      name.padEnd(24),
      `${round(elapsedMs)}ms`.padEnd(6),
      okOut || out + "\t!=\t" + state.output.trim(),
      okErr ||
        errors.map(
          ({ e, m, errCtx: { line, col } }) => `${e} ${line}:${col}: ${m}`,
        ),
    ];
    results.push({
      okErr,
      okOut,
      elapsedMs,
      display: `${tNum} ${tName} ${tElapsed} ${tOutput}   ${tErrors}`,
    });
  }
  const totalMs = results.reduce((sum, { elapsedMs }) => sum + elapsedMs, 0);
  const numPassed = results.filter(({ okOut, okErr }) => okOut && okErr).length;
  const withHeader = [
    ...(terse ? [] : ["#   Name                     Time   OK-out OK-err"]),
    ...results.filter(r => !terse || !r.okOut || !r.okErr).map(r => r.display),
  ];
  return [
    ...withHeader,
    `---- ${numPassed}/${results.length} tests passed in ${round(totalMs)}ms.`,
  ];
}
