<table>
  <tr>
    <td>
      <img src="https://phunanon.github.io/Insitux/media/insitux.png" alt="Insitux logo" height="32">
    </td>
    <td colspan="3">
      S-expression scripting language written in portable TypeScript.
    </td>
  </tr>
  <tr>
    <td>
      <a href="https://phunanon.github.io/Insitux">Website</a>
    </td>
    <td>
      <a href="https://phunanon.github.io/Insitux/website/repl">Try online</a>
    </td>
    <td>
      <a href="https://discord.gg/w3Fc4YZ9Qw">
        Talk with us
        <img src="https://phunanon.github.io/Insitux/website/DiscordLogo.png" alt="Discord logo" height="16">
      </a>
    </td>
  </tr>
</table>

Successor to [Chika](https://github.com/phunanon/Chika),
[Epizeuxis](https://github.com/phunanon/Epizeuxis), and
[Kuan](https://github.com/phunanon/Kuan).

[**Main Github repository**](https://github.com/phunanon/Insitux)
[**Roblox-ts NPM package**](https://www.npmjs.com/package/@rbxts/insitux) and its [Github repository](https://github.com/insitux/rbxts-Insitux).

## Usage

Like any programming language it is written down as _code_. Insitux takes your
code and follows it like complex instructions.  
You and the Insitux app talk to each other in these ways:

| what   | direction of data        | example                       |
| ------ | ------------------------ | ----------------------------- |
| code   | goes into the app        | `(+ 2 2)`                     |
| return | comes out of the app     | `4`                           |
| set    | writes data              | `($day.cycle_speed 100)`      |
| get    | reads data               | `$day.cycle_speed`            |
| exe    | data goes both in an out | `(util.fire [0 0 0] [0 1 0])` |

### Writing the code

Most code is written as _expressions_ like `(+ 2 2)`. As you can see, values are
separated by spaces or new lines within the parentheses, and the operation you
want to perform is the first value. Expressions can nest within one another, for
example:  
`(+ 2 (- 10 2) 2)`  
which is like the arithmetic expression `2 + (10 - 2) + 2`. Letting Insitux run
this code would return the value `12`.  
There are many built-in operations such as for arithmetic, manipulating text,
making lists, causing things to happen, etc. You can also write your own custom
operations called _functions_. An example:

```clj
(function say-hello name
  (var greeting "Hello")
  (print greeting ", " name "!"))
```

If you first enter this into the app, then `(say-hello "Patrick")`, it would
print to the screen a line saying `Hello, Patrick!`

### Built-in operations

Remember, each operation goes at the beginning of the expression in parentheses.
Each value separated by spaces are called _arguments_. Below is a list of
built-in operations each within an example, with results after a `→`.

```clj
;Prints a line of text, joining its arguments together
(print "2 + 2 = " (+ 2 2))
→ 2 + 2 = 4

;Prints text without a line after it
(print-str "Hello, ")
(print-str "world!")
→ Hello, world!

;Defines one or more variables for later use anywhere in the program
(var my-number 123) → 123
(print my-number)   → 123
(var a 1 b 2 c 3)   → 3
[a b c]             → [1 2 3]

;Defines one or more variables for use only within one function call
(function test
  (let name "Patrick")
  (let a 1 b 2 c 3)
  [name a b c])
(test)
→ ["Patrick" 1 2 3]

;Tests a condition and executes either the second or third argument
(if true 1 2) → 1
(if 1 2 3)    → 2
(if false 1)  → null
(if null 1 2) → 2
(if false
  (print "hi")
  (print "bye"))
→ bye

;Tests each argument and returns true or false if all arguments are truthy
;Note: short-circuits evaluation after falsey argument
(and null (print "hi")) → false
(and true 1 2 3)        → true
(.. and [0 1 false])    → false

;Returns first truthy argument or false
;Note: short-circuits evaluation after first truthy argument
(or (print-str "hi") 1 (print "hi")) → hi1
(or null false 1 2 3)                → 1
(.. or [null false null])            → false

;Like if, but either executes all arguments or returns null
(when true (print-str "hi") 123)
→ hi123

;Various arithmetic operators which take one or more arguments
;Note: fast+ fast- fast* fast/ fast// are also available for two arguments only
(+ 1 1 1)    → 3
(- 10 5 1)   → 4
(* 10 10 10) → 1000
(/ 10 3)     → 3.333333
(// 10 3)    → 3
(** 2 3)     → 8
(** 10)      → 100

;Various arithmetic and test functions which take one argument only
(inc 100)    → 101
(dec 50)     → 49
(abs -123)   → 123
(sin (pi))   → ~0
(cos (pi))   → -1
(tan (* 45 (/ (pi) 180))) → ~1
(sqrt 25)    → 5
(round 3.5)  → 4
(floor 2.7)  → 2
(ceil 2.1)   → 3
(logn 1)     → 0
(log2 8)     → 3
(log10 1000) → 3
(odd? 5) (even? 6) (pos? 5) (neg? -5) (zero? 0)
(null? null) (num? 123) (bool? true) (str? "hi")
(dict? {}) (vec? []) (key? :abc) (func? +)

;Various arithmetic functions which take two or more arguments
(rem 10 3)  → 1
(min 1 2 3) → 1
(max 1 2 3) → 3

;Various equality operators, which all accept a variable number of arguments
;Note: < > <= >= only compare numbers
;Note: != will only check that each value is different from the next
;Note: fast= fast!= fast< fast> fast<= fast>= are also available for two
;  arguments only
(= 10 10)     → 10
(= 11 11)     → false
(!= 1 2 4 3)  → 1
(!= 1 1 2)    → false
(< 1 2 3)     → true
(> 10 5)      → true
(<= 10 10 15) → true
(>= 10 11 11) → false

;Negates boolean value
(! true)  → false
(! false) → true
(! null)  → true
(! 123)   → false

;Creates a vector (list) of values in two different ways
[1 "hello" :c]
(vec 1 "hello" :c)

;Creates a dictionary of values in two different ways
{:a 123 "hello" "world"}
(dict :a 123 "hello" "world")

;The length of a string of text or a vector, or number of dictionary entries
(len "Hello!")  → 6
(len [0 1 2])   → 3
(len {0 1 2 3}) → 2

;Concatenates strings of text together, also displaying numbers and vectors as
;  text too
(str "Hello, "
     "world! Welcome "
     2
     " my app. "
     [:a :b "c"])
→ "Hello, world! Welcome 2 my app. [:a :b c]"

;Returns a string parsed into a number, or null
(to-num "123") → 123
(to-num "abc") → null

;Returns a string or number converted into a keyword
(to-key "hello") → :hello
(to-key 123)     → :123

;Returns character from string index or item from vector index
;Note: the first letter/item is 0, the second is 1, etc
(2 "Hello!")    → l
(1 [:a :b :c])  → :b
(-1 [:a :b :c]) → :c

;Returns item if contained within vector else null
([0 1 2 3] 3)   → 3
([:a :b :c] :d) → null

;Returns keyword if contained within vector, or value if key contained in
;  dictionary, else null
(:a {:a 1 :b 2 :c 3}) → 1
(:a [:a :b :c])       → :a
(:a {:d 1 :e 2 :f 3}) → null
(:a [1 2 3])          → null

;Returns value associated with key if within dictionary else null
({0 1 2 3} 0)           → 1
({:a "hi" :b "bye"} :c) → null

;Associates a new key and value in a dictionary
({:a 2 :b 3} :c 4) → {:a 2 :b 3 :c 4}

;Returns either its first or second argument, or null
;Note: unlike `if` or `when` all arguments are evaluated regardless of condition
(true 1 2)  → 1
(false 1 2) → 2
(let b true)
(b :a :b)   → :a
(true 5)    → 5
(false 5)   → null

;Either a random whole number (integer) or decimal number
[(rand-int) (rand-int)]  might be [0 0], [0 1], [1 0], [1 1]
(rand-int 10)            any integer from 0 to 9
(rand-int 10 20)         any integer from 10 to 20
(rand)                   any decimal between 0 and 1
(rand 100)               any decimal between 0 and 100
(rand -10 10)            any decimal between -10 and 10

;"Maps" a function over one or more vectors
;Note that it only iterates by the minimum number of vector items
(map double [0 1 2 3])    → [0 2 4 6]
(map + [0 1 2 3] [4 5 6]) → [4 5 8]
(map str "abc" "xyz")     → ["ax" "by" "cz"]

;Iterates a function over one or more vectors
(for * [0 1 2] [1 10 100])
→ [0 1 2 0 10 20 0 100 200]

;"Reduces" a vector into one value through a function, also accepting an initial
;  value as its second argument
;Note: will return sole vector item or initial value if there are too few values
(reduce + [1 2 3])   → 6
(reduce + [1 2 3] 3) → 9
(reduce + [1] 1)     → 2
(reduce + [1])       → 1  ;
(reduce + [] 1)      → 1  ;
(reduce + [])        → [] ; + is never called

;Continues looping until condition becomes false
;Note: returns the final value or null if the first evaluated condition is false
(var n 0)
(while (< n 5)
  (print n)
  (var n (inc n)))
→ 012345
(while false 0)
→ null

;Returns the first argument; returns the last argument
(val 3 2 1 (print-str "hello"))
→ hello3
(do (print-str "hello") 1 2 3)
→ hello3

;Returns the concatenation of vectors and dictionaries
(into {} [0 1 2 3 4 5])         → {0 1, 2 3, 4 5}
(into [] {:a "hi" :b "bye"})    → [[:a "hi"] [:b "bye"]]
(into {:a 123 :b 456} {:a 456}) → {:a 456, :b 456}
(into [1 2 3] [4 5 6])          → [1 2 3 4 5 6]

;Returns a vector or dictionary with one item or key-value pair appended
;Or, inserts a value into a vector at a specified index
;Or, removes a key from a dictionary
(push [1 2] :a)   → [1 2 :a]
(push {1 2} 1)    → {}
(push [1 2] :a 1) → [1 :a 2]
(push {1 2} 3 4)  → {1 2, 3 4}

;Returns a section of a string or vector
(sect "Patrick")       → "atrick"
(sect "Patrick" 2)     → "trick"
(sect "Patrick" -2)    → "Patri"
(sect "Patrick" 1 2)   → "at"
(sect "Patrick" 1 -1)  → "atric"
(sect "Patrick" -2 1)  → "c"
(sect "Patrick" -2 -2) → "ri"
(sect [0 1 2 3])       → [1 2 3]
etc

;Filter a vector or string by a function, optionally passing extra arguments
(filter odd? [0 1 2 3])    → [1 3]
(filter ["e" "l"] "Hello") → ["e" "l" "l"]
(filter = [1 1 2 2 3 3] 3) → [3 3]
(remove odd? [0 1 2 3])    → [0 2]
(remove = [1 1 2 2 3 3] 3) → [1 1 2 2]

;Returns the first item or character in a vector or string matching a predicate,
;  optionally passing extra arguments
(find odd? [0 1 2 3])   → 1
(find > [4 5 6 7] 5)    → 6
(find ["a" "b"] "Able") → "b"

;Returns the number of items or characters in a vector or string matching a
;  predicate, optionally passing extra arguments
(count odd? (range 10)) → 5
(count = [1 1 2 3 3] 1) → 2

;Returns the reverse of a vector or string
(reverse "Hello") → "olleH"
(reverse [1 2 3]) → [3 2 1]

;Returns a vector sorted, optionally by the return of a function of each item
;Note: will only sort all number or all string
(sort [0 7 8 9 8 6])    → [0 6 7 8 8 9]
(sort [0 1 8 9 65] str) → [0 1 65 8 9]
(sort [{:a 23} {:a 24} {:a 19}] :a) → [{:a 19} {:a 23} {:a 24}]

;Generates a range of numbers
;Note: the first argument is always inclusive, second exclusive
(range 5)      → [0 1 2 3 4]
(range 1 5)    → [1 2 3 4]
(range -3)     → [0 -1 -2]
(range 0 -3)   → [0 -1 -2]
(range 0 5 2)  → [0 2 4]
(range 5 0 2)  → [5 3 1]
(range 5 1)    → [5 4 3 2]
(range 4 1 -1) → [4 3 2]
(range 1 4 -1) → [3 2 1]
(range 0 4 0)  → [0 1 2 3]

;Splits a string by spaces or provided delimiting string
(split "Hello" "e") → ["H" "llo"]
(split "hi hi!")    → ["hi" "hi!"]

;Joins a vector by spaces or provided string
(join [1 2 3])      → "1 2 3"
(join [1 2 3] ", ") → "1, 2, 3"

;Tests if a string starts with and ends with another string
(starts-with? "Hello" "He") → true
(ends-with? "Hello" "Lo")   → false

;Returns a string made entirely upper- or lower-case
(upper-case "hEllo") → "HELLO"
(lower-case "HeLlO") → "hello"

;Returns a string repeated a specified number of times
(str* "x" 6) → "xxxxxx"

;Returns the keys and values of a dictionary
(var d {0 1 :a "hello" "hi" 123})
(keys d) → [0 :a "hi"]
(vals d) → [1 "hello" 123]

;Tests if a string contains a sub-string
(has? "Hello" "ll") → true

;Returns index of an item or sub-string in a vector or string, or null
;Or, replaces an item or character with another at a specified index
(idx [1 2 3 4] 3)    → 2
(idx [1 2 3 4] 5)    → null
(idx "Hello" "ll")   → 2
(idx [1 2 3 4] :a 2) → [1 2 :a 4]
(idx "hello" "H" 0)  → "Hello"

;Returns its last argument early from a function with a value, or null
(function f (return 123) (print "hello"))
(f) → 123
(function f (return) (print "hi"))
(f) → null

;Applies a vector's items and other arguments as a function's parameters
(.. + [0 1 2] 3 [4 5 6])
→ 21

;Applies a final vector's items and other arguments as a function's parameters
(... + 0 1 2 3 [4 5 6])
→ 21

;Evaluates the first argument and returns the value if no runtime errors, else
;  populates the let `errors` and returns the evaluation of the second argument
;Note: the first argument must be expression
(catch (+) errors)
→ [{:e "Arity", :m "+ needs at least 2 arguments, not 0", :line 1, :col 9}]
(catch (+ 2 2) (print "hi")) → 4

;Returns the time in milliseconds
(time) → 1630143983032

;Returns report of built-in Insitux tests as a string, optionally verbose
(tests)
(tests true)

;Returns Insitux version as number
(version) → 2021****

;Returns symbol name strings vector by definition order in the Insitux session
(symbols) → ["print" "print-str" "!" "=" …]

;Evaluates a string as code, returning any values returned or null
(eval "(+ 2 2)") → 4

;Resets an Insitux session back to how it started
;Note: safely position this in a program as it may cause Reference Errors
(reset)
```

### Miscellaneous

- Write `;` outside of a string of text to create a comment:

```clj
;This won't be treated as code
(print "Hello") ;Comment at the end of lines too
```

- Commas `,` are treated as whitespace.

- Write `\"` inside of a string to represent `"`, `\n` to represent a newline,
  `\t` to represent a tab character.

- Write decimal numbers either `0.123` or `.123`.

- Pi and Euler's number are accessible through constants `PI` and `E`

- `args` contains a vector of arguments the function was called with.

- Arguments can also be accessed through `%0`, `%1`, `%2`, etc, with `%` the
  same as `%0`.

  - Accessing too high a number will return `null`.

- Parameters take precedence over lets and defines.

- Insitux implementations are advised to support this behaviour:

```clj
($test.ing 123)   → 123
$test.ing         → 123
(ing "$test")     → 123
(ing "$test" 456) → 456
$test.ing         → 456
```

### Functions

**Named functions**

A named function is declared using `function` at the head of an expression,
followed by a function name, followed by any parameter names, followed by a body
consisting of at least one value or expression, and can contain many
expressions.

```clj
;       name   parameters
(function add x y
  (+ x y))
;  body
```

_Parameters_ are referenceable names declared in a function, and _arguments_ are
values actually passed to a function. All arguments are accessible through the
`args` let, a vector of values. If a function is underloaded (given fewer
arguments than parameters specified) then un-populated parameters are `null`. If
a function is overloaded the extra arguments are still accessible though the
`args` let.

```clj
; Valid function definitions

(function f 123) ;(f) always returns 123

(function f 123 456) ;(f) always returns 456

(function f x x) ;(f x) always returns x

(function name a b c
  (print "I will add together " (join args))
  (+ a b c))
;(f x y z) prints a message then returns the sum of x y z

; Invalid function definitions

(function)

(function name)
```

Calling a function itself again from within is called _recurring_. To
immediately recur use the `recur` syntax, as it will optimise the program to use
less memory and perform faster.

```clj
(function f n
  (when (pos? n)
    (print n)
    (recur (dec n))))
(f 10) ;Recurs ten times
```

**Closures**

A closure is an anonymous (unnamed) function which also "captures" the data
context around them. The syntax of a closure is:

```clj
#(+ 2 2)
```

Closures capture variables, lets, and named parameters of their parent function,
so even when they are passed around the values are frozen as they were upon the
closure's declaration. For example:

```clj
(var a 10)
(var closure #(+ a a))
(var a 100)
(closure) → 20 not 200
```

They can take arguments, and be used as the operation of an expression:

```clj
(var closure #(+ % %))
(closure 2)            → 4
(#(.. vec args) 1 2 3) → [1 2 3]
```

There are also partial closures with slightly different syntax. They append
their arguments to the end of the closure expression.

```clj
(var partial @(* 10))
(partial 4) → 40
;exactly the same as writing:
(var partial #(... * 10 args))
```

They can also be in the form of `#[]`, `#{}`, `@[]`, and `@{}`:

```clj
(#[% %]  1) → [1 1]
(#{:a %} 1) → {:a 1}
(@[1] 2 3)  → [1 2 3]
(@{:a} 5)   → {:a 5}
```

### Various examples

```clj
; 2D coordinate inside 2D area?
(function inside-2d? X Y areaX areaY areaW areaH
  (and (<= areaX X (+ areaX areaW))
       (<= areaY Y (+ areaY areaH))))

(inside-2d? 50 50 0 0 100 100)  → true
(inside-2d? 50 150 0 0 100 100) → false

; Recursive Fibonacci solver
(function fib n
  (if (< n 2) n
      (+ (fib (dec n))
         (fib (- n 2)))))

(fib 13) → 233

; Filter for vectors and strings above a certain length
(filter 2 [[1] [:a :b :c] "hello" "hi"])
→ [[:a :b :c] "hello"]

; Flatten a vector one level deep
(.. .. vec [[0 1] 2 3 [4 5]])
→ [0 1 2 3 4 5]

; Triple every vector item
(for * [0 1 2 3 4] [3])
;or
(map @(* 3) [0 1 2 3 4])
→ [0 3 6 9 12]

; Palindrome checker
(function palindrome? text
  (.. and (map = text (reverse text))))

(palindrome? "aabbxbbaa") → true
(palindrome? "abcd")      → false

; Clojure's juxt
(function juxt
  (let funcs args)
  #(for #(.. %1 %) [args] funcs))

((juxt + - * /) 10 8)
→ [18 2 80 1.25]

; Clojure's comp
(function comp f
  (let funcs (sect args))
  #(do (let 1st (.. f args))
       (reduce #(%1 %) funcs 1st)))

(map (comp + inc) [0 1 2 3 4] [0 1 2 3 4])
→ [1 3 5 7 9]

; Clojure's frequencies
(function frequencies list
  (reduce #(push % %1 (inc (or (% %1) 0))) list {}))

(frequencies "hello")
→ {"h" 1, "e" 1, "l" 2, "o" 1}

; Deduplicate a list recursively
(function dedupe list -out
  (let out  (or -out [])
       next (if (out (0 list)) [] [(0 list)]))
  (if (empty? list) out
    (recur (sect list) (into out next))))
;or deduplicate a list via dictionary keys
(function dedupe list
  (keys (.. .. dict (for vec list [0]))))

(dedupe [1 2 3 3])
→ [1 2 3]

; Time a function call
(function measure
  (let report [(time) (.. .. args) (time)])
  (str (1 report) " took " (- (2 report) (0 report)) "ms"))

(measure fib 35) → "9227465 took 45500ms"

; Display the Mandelbrot fractal as ASCII
(function mandelbrot width height depth
  (.. str (for #(do
    (let c_re (/ (* (- % (/ width 2)) 4) width)
         c_im (/ (* (- %1 (/ height 2)) 4) width))
    (let x 0 y 0 i 0)
    (while (and (<= (+ (** x) (** y)) 4)
                (< i depth))
      (let x2 (+ (- (** x) (** y)) c_re)
           y  (+ (* 2 x y) c_im)
           x  x2
           i  (inc i)))
    (str (if (zero? %) "\n" "") (if (< i depth) "#" " ")))
    (range width) (range height))))

(mandelbrot 48 32 10)
```
