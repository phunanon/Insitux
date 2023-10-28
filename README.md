<table>
  <tr>
    <td>
      <img src="https://phunanon.github.io/Insitux/media/insitux.png" alt="Insitux logo" height="32">
    </td>
    <td colspan="3">
      Extensible scripting language written in portable TypeScript.
    </td>
  </tr>
  <tr>
    <td>
      <a href="https://insitux.github.io">Website</a>
    </td>
    <td>
      <a href="https://insitux.github.io/repl">Try online</a>
    </td>
    <td>
      <a href="https://discord.gg/w3Fc4YZ9Qw">
        <img src="https://discord.com/api/guilds/877823554274590741/widget.png?style=banner2" alt="Discord invite" height="48">
      </a>
    </td>
  </tr>
</table>

Inspired by [Chika](https://github.com/phunanon/Chika),
[Epizeuxis](https://github.com/phunanon/Epizeuxis), and
[Kuan](https://github.com/phunanon/Kuan).
Pronounced /ɪnˈsɪtjuːɪks/ in the International Phonetic Alphabet.

- [**Main NPM package**](https://www.npmjs.com/package/insitux) and its [Github repository](https://github.com/phunanon/Insitux)
- [**Roblox-TS NPM package**](https://www.npmjs.com/package/@rbxts/insitux) and its [Github repository](https://github.com/insitux/rbxts-Insitux)
- [YouTube tutorials and demonstrations playlist](https://www.youtube.com/watch?v=iKOuzXhs14A&list=PLOKSmPXGYmewQI3dNBubTNljRD2C4Dg0z)
- [Rosetta Code entries](https://rosettacode.org/wiki/Insitux)

Works in Node.js/Bun, the web, and Roblox.

## Node CLI tool usage & installation

Requires [Node.js](https://nodejs.org/en/download/) or [Bun](https://bun.sh/docs/installation).  
Bun has faster cold-starts, and Node.js slightly faster performance when warm.

```console
$ npm i -g insitux  #make ix available in your terminal via Node.js
$ bun i -g insitux  #… or via Bun

$ ix help           #or -h, to show this help
$ ix                #open a REPL session (exit with Ctrl+D or Ctrl+C)
$ ix .              #execute entry.ix in the working directory
$ ix file.ix        #execute file.ix in the working directory
$ ix -e "PI"        #execute provided string
$ ix -nb             #disable REPL budgets (loops, recur, etc)
$ ix -nc            #turn off "colour mode" for REPL errors, etc
$ ix -unv           #generate unvisited.txt of unvisited code line:column
$ ix [args] -r      #… then open a REPL session
$ ix [...] -- [...] #seperation between ix args and program args (e.g. %0)
Most arguments/switches can be mixed with one another.

$ ix i              #installs dependencies listed in deps.txt
$ ix r              #remove dependencies listed in deps.txt
$ ix i user/repo    #clone Github repository into the .ix directory
$ ix r user/repo    #… and subsequently remove
$ ix i alias http…  #download file via HTTP into the .ix directory as alias.ix
$ ix r alias        #… and subsequently remove

If you have Visual Studio Code, install the syntax highlighter!
$ code --install-extension insitux.insitux-syntax
```

- If present, `.repl.ix` will be automatically executed whenever `ix` runs
- Example of `--` switch: `ix -e "%" -- hi` prints `hi`
- The REPL will remember previous REPL results, available as % through to %7

### `ix` environment operations

The Node Insitux REPL/environment has operations in addition to pure Insitux.

```clj
;Execute the entry.ix file of a cloned repository from the .ix directory
;Or execute the [alias].ix file from the .ix directory
;Or execute [file.ix] from the working directory / same directory of execution
(import "username/some-dep")
(import "alias")
(import "file.ix")

;Read, read the lines of, write, and append to a file at a specified path
(read "path/to/file")
(read-lines "path/to/file")
(write "path" "content as string")
(file-append "path" "content as string")

;Prompt user for input
(prompt "Prompt message")

;Execute system call
(exec "curl -s icanhazip.com")

;Yet to be documented, but implemented:
;- Make a HTTP call (GET POST)
;- create and append blobs
;- set and clear intervals and timeouts
```

## Web usage

Insitux can be used as a web library, though this is underdeveloped.

```clj
;Yet to be documented, but implemented:
js call prop query-selector-all query-selector inner-html html-el child-at
append-child remove-child replace-child POST-str GET-str prompt alert
set-timeout set-interval 
```

## Coding in Insitux

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

;Defines or redefines one or more variables for later use anywhere
;Note: (var a 1 b 2) internally becomes (var a 1) (var b 2)
(var my-number 123) → 123
(print my-number)   → 123
(var a 1 b 2 c 3)   → 3
[a b c]             → [1 2 3]

;Defines or redefines one or more variables for use only within a function call
;Note: (let a 1 b 2) internally becomes (let a 1) (let b 2)
(function test
  (let name "Patrick")
  (let a 1 b 2 c 3)
  [name a b c])
(test)
→ ["Patrick" 1 2 3]

;Redefines a var or let by applying a function and arguments to it
;Note: internally rewrites the expression e.g. (var! a + 10) → (var a (+ 10 a))
(var a 10)
(let b [:a :b :c])
(var! a inc)  → 11
(var! a - 15) → 5
(let! b 1)    → :b
[a b]         → [21 :b]

;Returns its last argument early from a function with a value, or null
(function f (return 123) (print "hello"))
(f) → 123
(function f (return) (print "hi"))
(f) → null ;and prints "hi"

;Returns its last argument early from a function without a value, or null,
;  when its condition is truthy
(function f (return-when true 123) (print "hello"))
(f) → 123
(function f (return-unless true) (print "hi"))
(f) → null ;and prints "hi"

;Tests a condition and executes and returns either the second or third argument
;Note: doesn't evaluate the other conditional branch
(if true 1 2)  → 1
(if 1 2 3)     → 2
(if false 1)   → null
(if null 1 2)  → 2
(if false
  (print "hi")
  (print "bye"))
→ "bye"
(if-not true 1 2) → 2
etc

;Executes and returns arg[2x+2] where arg[2x+1] is equal to arg[0], else the
;  last argument if an even number of arguments else false
;Note: doesn't evaluate any argument[x+2] unless upon return
;Note: commas for readability not syntactic requirement
(match 1, 1 2)     → 2
(match 1, 2 3)     → false
(match 1, 2 3, 4)  → 4
(match 1
  2 (print-str "hi ")
  1 0)
→ 0
(match 1
  1 (print-str "hi ")
  2 0)
→ hi null
(match [1 2]
  [0 0] "hello"
  [0 2] "bye"
  [1 _] "hey")
→ "hey"

;Like match, but instead matches on if passing the value to each argument[x+1]
;  function returns truthy
(satisfy 10
  (< 100) "Greater than 100"
  (< 10) "Greater than 10"
  pos? "Greater than 0"
  "0 or below")
→ "Greater than 0"

;Returns boolean negation of sole argument
(not true)  → false
(not 1)     → false
(not false) → true
(not null)  → true

;Tests each argument and returns true or false if all arguments are truthy
;Note: short-circuits evaluation after falsy argument
(and null (print "hi")) → false
(and true 1 2 3)        → true
(.. and [0 1 false])    → false

;Returns first truthy argument or false
;Note: short-circuits evaluation after first truthy argument
(or (print-str "hi") 1 (print "hi")) → hi1
(or null false 1 2 3)                → 1
(.. or [null false null])            → false

;Returns the sole truthy of two arguments else false
(xor false null) → false
(xor false 1)    → 1
(xor [] null)    → []
(xor 1 true)     → false

;Like if, but either executes all arguments or returns null
(when true
  (print-str "hi")
  123)
(unless false
  (print-str "hi")
  123)
→ hi123

;Various arithmetic operators which take one or more arguments
;Note: fast+ fast- fast* fast/ fast// are also available for two arguments only
(+ 1 1 1)      → 3
(- 10 5 1)     → 4
(* 10 10 10)   → 1000
(/ 10 3)       → 3.333333
(// 10 3)      → 3
(& 10 13)      → 8
(| 10 12)      → 14
(^ 10 12)      → 6
(<< 10 1)      → 20 ;Zero-fill
(>> -5 1)      → -3 ;Signed
(>>> 5 1)      → 2  ;Zero-fill
(rem 100 40)   → 20
(rem 100 40 3) → 2
(min 1 2)      → 1
(min 4 3 2 5)  → 2
(max 4 3 2 5)  → 5
(** 10)        → 100
(** 2 3)       → 8
(round 3.5)    → 4
(round 2 PI)   → 3.14

;Various arithmetic operators which return a number or their sole argument when
;  underloaded
(*1)       → 1
(*1 10)    → 10
(*1 10 10) → 100
etc
(+0)       → 0
(+0 10)    → 10
(+0 10 10) → 20
etc

;Various arithmetic and test functions which take fixed arguments
(neg 10)     → -10
(inc 100)    → 101
(dec 50)     → 49
(abs -123)   → 123
(sin (pi))   → ~0
(cos (pi))   → -1
(tan (* 45 (/ (pi) 180))) → ~1
(sqrt 25)    → 5
(floor 2.7)  → 2
(ceil 2.1)   → 3
(clamp 0 10 11) → 10 ;Clamps a value between two bounds (here, 0 and 10)
(logn 1)     → 0
(log2 8)     → 3
(log10 1000) → 3
(~ 10)       → -11 ;Bitwise NOT
(div? 10 2)  → true
(asin 1) (acos 1) (atan 1) (sinh 1) (cosh 1) (tanh 1)
(odd? 5) (even? 6) (pos? 5) (neg? -5) (zero? 0)
(null? null) (num? 123) (bool? true) (str? "hi")
(dict? {}) (vec? []) (key? :abc) (func? +) (wild? _)

;Various equality operators, which all accept two or more arguments
;Note: < > <= >= only compare numbers
;Note: not= will only check that each value is different from the next
;Note: fast= fastnot= fast< fast> fast<= fast>= are also available for two
;  arguments only
(= 10 10)     → true
(= :a :b)     → false
(== 10 10)    → 10
(== 10 11)    → null
(not= 1 2 3)  → true
(not= 1 1 2)  → false
(< 1 2 3)     → true
(> 10 5)      → true
(<= 10 10 15) → true
(>= 10 11 11) → false

;Compares two strings for their character order
(str< "a" "b" "c")  → true
(str> "aa" "ab")    → false
(str<= "a" "a" "b") → true
(str>= "A" "b")     → false

;Negates boolean value
(! true)  → false
(! false) → true
(! null)  → true
(! 123)   → false

;Creates a vector (list) of values in two different ways
[1 "hello" :c]
(vec 1 "hello" :c)

;Creates a dictionary of keys and values
;Note: dictionaries with duplicate keys only preserve the final duplicate key
;  and its value
;Note: a dictionary can have one wildcard key, with the first being preserved
;Note: dictionary wildcard keys are matched by type rather than value
{:a 123, "hello" "world"}           ;commas are optional
{:a 123 :a 234} → {:a 234}
{:a 123 _ 234}  → {:a 123 _ 234}
(dict :a 123 "hello" "world")
(dict [[:a 123] ["hello" "world"]])
(kv-dict [:a "hello"] [123 "world"])

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

;Same as str, but ignores null arguments
(strn "Hello" null ", world!") → "Hello, world!"

;Converts number into string of chosen base from 2 to 36
(to-base 2 10)   → "1010"
(to-base 16 10)  → "a"
(to-base 36 100) → "2s"

;Converts string of chosen base from 2 to 36 into number
(from-base 2 "1010") → 10
(from-base 16 "a")   → 10
(from-base 36 "2s")  → 100

;Returns the average of numbers in a provided vector
(average [1 2 -3])   → 0
(average [1 2 4])    → 2.33333
(average [:a 1 2.5]) → 1.75
(average [])         → NaN

;Returns a string parsed into a number, or null
(to-num "123") → 123
(to-num "abc") → null

;Returns a string or number converted into a keyword
(to-key "hello") → :hello
(to-key 123)     → :123

;Returns string or dictionary as vector
(to-vec "hello")     → ["h" "e" "l" "l" "o"]
(to-vec {:a 1 :b 2}) → [[:a 1] [:b 2]]

;Returns truthiness of value
(bool 1)    → true
(bool null) → false

;Returns type string of argument
(type-of 123)     → "num"
(type-of "hello") → "str"
(type-of _)       → "wild"
etc

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
({:a 1 _ 2} :b)         → 2
({:a 1 _ 2} _)          → 2
({:a "hi" :b "bye"} :c) → null

;Associates a new key and value in a dictionary
;See also: assoc
({:a 2 :b 3} :c 4) → {:a 2, :b 3, :c 4}
({:a 2 _ 3} _ 4)   → {a: 2, _ 4}

;Returns either its first or second argument, or null
;Note: unlike `if` or `when` all arguments are evaluated regardless of condition
(true 1 2)  → 1
(false 1 2) → 2
(let b true)
(b :a :b)   → :a
(true 5)    → 5
(false 5)   → null

;Either a random whole number (integer) or decimal number
[(rand-int) (rand-int)]  might be [0 0] [0 1] [1 0] [1 1]
(rand-int 10)            any integer from 0 to 9
(rand-int 10 20)         any integer from 10 to 20
(rand)                   any decimal between 0 and 1
(rand 100)               any decimal between 0 and 100
(rand -10 10)            any decimal between -10 and 10

;"Maps" a function over one or more vectors, strings, and dictionaries
;Note that it only iterates by the minimum number of vector items
(map double [0 1 2 3])    → [0 2 4 6]
(map + [0 1 2 3] [4 5 6]) → [4 5 8]
(map str "abc" "xyz")     → ["ax" "by" "cz"]

;Works the same as map, but concatenates the returned vectors and items
(flat-map (juxt dec inc) (range 3)) → [-1 1 0 2 1 3]
(flat-map (times 2) (range 3))      → [0 0 1 1 2 2]
(flat-map val [0 1 [2 3] 4 5])      → [0 1 2 3 4 5]

;Same as map, but only (f i item), where i is an increasing index from 0
(xmap vec "hello")
→ [[0 "h"] [1 "e"] [2 "l"] [3 "l"] [4 "o"]]
(xmap skip ["hi" "hey" "hello"])
→ ["hi" "ey" "llo"]
(xmap #(str (str* " " %) %1) ["hi" "hey" "hello"])
→ ["hi" " hey" "  hello"]

;Iterates a body over one or more collections, with each sub-collection
;  re-evaluated upon each first iteration of them, returning a vector of
;  returns
;Note: declarations are let-scoped
(for x [0 1 2 3] (* x 10))
→ [0 10 20 30]
(for x [1 2 3]
     y (range x)
  [x y])
→ [[1 0] [2 0] [2 1] [3 0] [3 1] [3 2]]
(for x [0 1 2 3]
  (let y (inc x))
  (* y 10))
→ [10 20 30 40]
(for [k v] {0 1 2 3 4 5}
  (when (= k 2) (continue))
  v)
→ [1 5]
(for x "hello"
  (when (= x "l") (break))
  x)
→ ["h" "e"]

;"Reduces" a vector, string, or dictionary into one value through a function,
;  optionally accepting an initial value as its second argument
;  with the collection as its third argument
;Note: will return sole item or initial value if there are too few values
(reduce + [1 2 3])     → 6
(reduce vec [0 1 2 3]) → [[[0 1] 2] 3]
(reduce + 3 [1 2 3])   → 9
(reduce + 1 [1])       → 2
(reduce + [1])         → 1  ;
(reduce + 1 [])        → 1  ;
(reduce + [])          → [] ; + is never called

;Returns the intermediate values of a vector, string, or dictionary reduction
;  starting with the initial value
;See: reduce
(reductions + [1 2 3])   → [1 3 6]
(reductions + 2 [1 2 3]) → [2 3 5 8]

;Continues looping until condition becomes false
;Note: returns the final value or null if the first evaluated condition is false
(var n 0)
(while (< n 5)
  (print n)
  (var n (inc n)))
→ 012345
(while false 0)
→ null
(while true
  (let x (rand-int 100))
  (when (> x 10) (continue))
  (print x)
  (when (= x 10) (break)))
→ prints random values 10 and below until 10

;Loops its body N times, the first expression evaluated for N,
;  the second argument being a let name set to the current loop number.
;  Returns last loop's value.
;Note: the provided limit is available as e.g. i-limit
(loop 3 i (print-str "hi"))      → hihihinull
(loop 4 i (print-str i))         → 0123null
(loop 3.5 i (print-str i))       → 0123null
(loop 3 i (print-str i) i-limit) → 0123
(loop (rand 10) i i) ;Loops up to ten times

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

;Removes key from a dictionary
(omit :a {:a 1 :b 2})   → {:b 2}
(omit [1] {[1] 1 :b 2}) → {:b 2}

;Removes multiple keys from a dictionary
(omits [:a :c] {:a 1 :b 2 :c 3}) → {:b 2}
(omits [[1]] {[1] 1 :b 2})       → {:b 2}

;Removes value with index from a vector
(drop 1 [:a :b :c])  → [:a :c]
(drop -1 [:a :b :c]) → [:a :b]

;Associates a value to a key in a dictionary
(assoc :a 2 {:a 1 :b 2}) → {:a 2, :b 2}
(assoc [1] 3 {:b 2}) → {:b 2, [1] 3}

;Insert item at a specified index in a vector
(insert :a 0 [1 2])  → [:a 1 2]
(insert :a 1 [1 2])  → [1 :a 2]
(insert :a -1 [1 2]) → [1 2 :a]
(insert :a 9 [1 2])  → [1 2 :a]

;Append item to the end of a vector
(append :a [1 2]) → [1 2 :a]

;Prepend item to the beginning of a vector
(prepend :a [1 2]) → [:a 1 2]

;Returns particular sections of a string or vector
(skip 1 "hello")      → "ello"
(first 2 "hello")     → "he"
(last 2 "hello")      → "lo"
(trunc 2 "hello")     → "hel"
(crop 1 1 "hello")    → "ell"
;edge-case examples
(crop 0 -3 "abcdefghi")  → "abc"
(crop -3 0 "abcdefghi")  → "ghi"
(crop -4 -7 "abcdefghi") → "fg"

;Take or skip vector items or string characters until condition is no longer met
(take-while odd? [1 3 2 4 5 7]) → [1 3]
(take-until odd? [2 4 1 3 6 8]) → [2 4]
(skip-while odd? [1 3 2 4 5 7]) → [2 4 5 7]
(skip-until odd? [2 4 1 3 6 8]) → [1 3 6 8]

;Filter a vector, string, or dictionary by a function.
;Return value is the same type as the second argument.
(filter odd? [0 1 2 3])    → [1 3]
(filter ["e" "l"] "Hello") → "ell"
(filter (comp 1 odd?) {:a 1 :b 2 :c 3})
→ {:a 1, :c 3}
(remove odd? [0 1 2 3])    → [0 2]
(remove ["e" "l"] "Hello") → "Ho"
(remove (comp 1 odd?) {:a 1 :b 2 :c 3})
→ {:b 2}

;Filter a vector for truthy values
(sieve [0 1 2 null 3]) → [0 1 2 3]
(sieve [0 1 2 false 3]) → [0 1 2 3]

;Returns the first item or character in a vector or string matching a predicate.
(find odd? [0 1 2 3])   → 1
(find (< 5) [4 5 6 7])  → 6
(find ["a" "b"] "Able") → "b"

;Returns the index of the first item or character in a vector or string
;  matching a predicate.
(find-idx odd? [6 8 9 0])      → 2
(find-idx (< 5) [2 3 4 5 6 7]) → 4
(find-idx odd? [0 2 4])        → null

;Returns the number of vector items, string characters, or dictionary entries
;  matching a predicate.
(count odd? (range 10))   → 5
(count (= 1) [1 1 2 3 3]) → 2
(count (comp 1 odd?) {:a 1 :b 2 :c 3})
→ 2
(count-until odd? [0 2 4 5 6 7]) → 3
(count-while odd? [1 3 2 4 5 7]) → 2

;Returns item or character from vector, dictionary, or string which returns the
;  highest or lowest number by predicate
;Note: first instance of best value is selected
(max-by len ["Hello" "Hey" "Yo"]) → "Hello"
(max-by 1 {:a 1 :b 2 :c 3})       → [:c 3]
(max-by char-code "Hello")        → "o"
(min-by val [7 6 5 8 4 3])        → 3
etc

;Returns a boolean on whether the vector, string, or dictionary is empty
(empty? [])        → true
(empty? {})        → true
(empty? "")        → true
(nonempty? [])     → false
(nonempty? {:a 1}) → true
(nonempty? "hi")   → true

;Returns a boolean on whether all vector items, dictionary entries, or string
;  characters satisfy a predicate 
(all? odd? (range 10))      → false
(all? even? (range 0 10 2)) → true
(all? ["a" "b"] "ababaaba") → true
(all? #(% 1) {:a 1 :b 1})   → true

;Returns boolean of whether any vector items, dictionary entries, or string
;  characters match the predicate
(some? odd? [0 1 2 3])  → true
(some? digit? "Hello!") → false
(none? odd? [0 2 4 6])  → true
(none? digit? "Hello1") → false

;Returns a vector of either a function called N times with the incrementation,
; or a value repeated N times
(repeat 1 5)   → [1 1 1 1 1]
(repeat val 5) → [0 1 2 3 4]
(times 5 1)    → [1 1 1 1 1]
(times 5 val)  → [0 1 2 3 4]

;"Thread" return values into the next function, seeded with first argument
(-> "hello" 1 upper-case)     → "E"
(-> [0 1] (append 2) reverse) → [2 1 0]

;Returns the reverse of a vector or string
(reverse "Hello") → "olleH"
(reverse [1 2 3]) → [3 2 1]

;"Flattens" its argument's immediate sub-vectors,
;  and their immediate sub-vectors, etc
(flatten [0 1 [2 3] [4 5 [6 7]]]) → [0 1 2 3 4 5 6 7]
(flatten [[1 [[[[{1 [[1]]}]]]]]]) → [1 {1 [[1]]}]

;Randomly rearranges a vector's items
(shuffle (range 10)) → [7 1 0 3 4 2 6 5 8 9]

;Returns a random sample of a vector's items
(sample 5 (range 10)) → [5 1 0 7 8]
(-> 100 range (sample 50) distinct len) → 50

;Returns a random item from a vector, string, or dictionary
(rand-pick [0 1 2 3 4 5]) → 3
(rand-pick [])            → null
(rand-pick "hello")       → "l"
(rand-pick {:a 1 :b 2})   → [:a 1]

;Returns a vector of vector items or string characters sorted
;Note: will only sort all number or all string
(sort [0 7 8 9 8 6]) → [0 6 7 8 8 9]
(sort "hello")       → ["e" "h" "l" "l" "o"]

;Returns a vector of vector items, dictionary entries, or string characters
;  sorted by the return of a function over each item
;Note: will only sort all number or all string
(sort-by val [0 7 8 9 8 6])   → [0 6 7 8 8 9]
(sort-by str [0 1 8 9 65])    → [0 1 65 8 9]
(sort-by :a [{:a 23} {:a 24} {:a 19}])
→ [{:a 19} {:a 23} {:a 24}]
(sort-by 1 {1 3 2 2 3 1})     → [[3 1] [2 2] [1 3]]
(sort-by #(rand-int) "hello") → ["l" "e" "o" "l" "h"]

;Groups by a function return into a dictionary of vectors, for vector items,
;  string characters; or a dictionary of dictionaries for dictionary entries.
;Calls are (f i) for vector items or characters, (f k v) for dictionary entries.
(group-by odd? [0 1 2 3]) → {false [0 2], true [1 3]}
(group-by val [0 0 1 2])  → {0 [0 0], 1 [1], 2 [2]}
(group-by upper-case "hello")
→ {"H" ["h"], "E", ["e"], "L", ["l" "l"], "O" ["o"]}
(group-by val {1 2, false 2, true 3})
→ {1 {1 2}, false {false 2}, true {true 3}}
(group-by do {1 2, false 2, true 3})
→ {2 {1 2 false 2}, 3 {true 3}}

;Partitions by a function return into a vector of [when-true when-false] vectors
;  for vector items or string characters; or a vector of two dictionaries for
;  dictionary entries.
;Calls are (f i) for vector items or characters, (f k v) for dictionary entries.
(part-by odd? [0 1 2 3 4])   → [[1 3] [0 2 4]]
(part-by str? ["hi" 1 "yo"]) → [["hi" "yo"] [1]]
(part-by neg? [0 1 2 3])     → [[] [0 1 2 3]]
(part-by #(key? %) {:a 1 "b" 2 :c 3})
→ [{:a 1, :c 3} {"b" 2}]
(part-by (= (upper-case %)) "Hello!")
→ [["H" "!"] ["e" "l" "l" "o"]]

;Partitions by a function return into a vector of [before-true after-true]
;  vectors for vector items or substrings.
;Calls are (f i) for vector items or characters
(part-when odd? [0 2 4 5 6 8 9 0]) → [[0 2 4] [6 8 9 0]]

;Partitions by a function return into a vector of [before-true true-and-after]
;  vectors for vector items or substrings.
;Calls are (f i) for vector items or characters
(part-before odd? [0 2 4 5 6 8 9 0]) → [[0 2 4] [5 6 8 9 0]]

;Partitions by a function return into a vector of [true-and-before after-true]
;  vectors for vector items or substrings.
;Calls are (f i) for vector items or characters
(part-after odd? [0 2 4 5 6 8 9 0]) → [[0 2 4 5] [6 8 9 0]]

;Returns a vector partitioned into vectors or strings with N items/chars at most
(partition 2 (range 8))       → [[0 1] [2 3] [4 5] [6 7]]
(partition 3 "Hello, world!") → ["Hel" "lo," " wo" "rld" "!"]

;Returns a vector or string with each Nth item/char
(skip-each 1 (range 8))  → [0 2 4 6]
(skip-each 2 "Insitux")  → "Iix"
(skip-each 0 [0 1 2 3])  → [0 1 2 3]
(skip-each 9 (range 50)) → [0 10 20 30 40]

;Returns dictionary with keys as distinct vector items, string characters,
;  with values as number of occurrences
(freqs [0 0 1 2 3]) → {0 2, 1 1, 2 1, 3 1}
(freqs "hellooooo") → {"h" 1, "e" 1, "l" 2, "o" 5}

;Returns vector of distinct vector items or string characters
(distinct [0 9 8 7 8 7 9 6]) → [0 9 8 7 6]
(distinct [[0 1] [0 1] [2]]) → [[0 1] [2]]
(distinct "hello")           → ["h" "e" "l" "o"]
(distinct [1 1 :a :a])       → [1 :a]

;Rotates vector or string by certain offset
(rotate 1 [0 1 2 3])  → [1 2 3 0]
(rotate -1 [0 1 2 3]) → [3 0 1 2]
(rotate 10 "hello")   → "ohell"
(rotate -10 "hello")  → "elloh"
(rotate 0 [0 1 2 3])  → [0 1 2 3]

;Interleaves vectors or strings so that one item of each appears after the other
(interleave [0 1 2] [3 4 5]) → [0 3 1 4 2 5]
(interleave "hello" "hey")   → "hheely"
(interleave [1 2] [9 8 7 6]) → [1 9 2 8]

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

;Splits a string by a provided delimiter string
(split "e" "Hello") → ["H" "llo"]

;Joins a vector, dictionary, or string by a provided string
(join " " [1 2 3])  → "1 2 3"
(join " " "hello")  → "h e l l o"
(join ", " [1 2 3]) → "1, 2, 3"

;Replaces all occurrences of a substring with another in a string
(replace "l" "x" "hello") → "hexxo"
(replace " " "" "yo yo")  → "yoyo"

;Same as replace, but with regular expressions (platform dependent)
(rreplace "[eo]" "x" "hello") → "hxllx"
(rreplace "\d" "" "h1e2l3l4o") → "hello"

;Tests if a string starts with and ends with another string
(starts? "He" "Hello") → true
(ends? "Lo" "Hello")   → false

;Returns a string made entirely upper- or lower-case
(upper-case "hEllo") → "HELLO"
(lower-case "HeLlO") → "hello"

;Checks if the first character of a string is upper- or lower-case
(upper? "Hello123") → true
(lower? "hELLO123") → true

;Checks if the first character of a string is a letter, digit,
;  whitespace (space, tab), or other (punctation)
(letter? "Hi")  → true
(digit? "1abc") → true
(space? " ")    → true
(punc? "+")     → true

;Returns a string repeated a specified number of times
;Note: has a maximum of 1000
(str* "x" 6) → "xxxxxx"

;Returns a strigified value padded to a particular length
;Note: has a maximum of 1000
(pad-left " " 10 "hello")  → "     hello"
(pad-right "." 10 "hello") → "hello....."
(pad-left "x" 5 "Hello!")  → "Hello!"
(pad-left " " 5 10)        → "   10"
(pad-right "." 10 {:a 1})  → "{:a 1}...."
etc

;Returns the code associated with a string's first or Nth character, or null
;Or returns a string with the associated supplied character code
(char-code "hello")   → 104
(char-code "hello" 1) → 101
(char-code "hello" 9) → null
(char-code 104)       → "h"

;Returns the keys and values of a dictionary
(var d {0 1 :a "hello" "hi" 123})
(keys d) → [0 :a "hi"]
(vals d) → [1 "hello" 123]

;Tests if a sub-string is in a string
(substr? "ll" "Hello") → true
(substr? "x" "abcd")   → false

;Tests if a value is in a vector as an item, dictionary as a key, or string as a
;  character
(has? 1 [0 1 2])    → true
(has? :a {:a null}) → true
(has? "l" "Hello")  → true
(has? 1 "111")      → false

;Returns index of an item or sub-string in a vector or string, or null
(idx [1 2 3 4] 3)         → 2
(idx [1 2 3 4] 5)         → null
(idx "Hello" "ll")        → 2
(idx-of 3 [1 2 3 4])      → 2
(idx-of 5 [1 2 3 4])      → null
(idx-of "ll" "Hello")     → 2
(last-idx [3 2 3 4] 3)    → 2
(last-idx "Hello" "l")    → 3
(last-idx-of 3 [3 2 3 4]) → 2
(last-idx-of "l" "Hello") → 3

;Returns vector or dictionary with specified index or key/value set or replaced
;  with another value
(set-at [2] :a [1 2 3 4])       → [1 2 :a 4]
(set-at [0 1] :a [[0 1] [0 1]]) → [[0 :a] [0 1]]
(set-at [0 :a] :c [{:a :b}])    → [{:a :c}]
(set-at [:b] :c {:a [:b]})      → {:a [:b], :b :c}
(set-at [-1] :a [0 1 2])        → [0 1 :a]
;Does nothing
(set-at [5] 1 [0 1 2])          → [0 1 2]
(set-at [0 0] 1 [:a])           → [:a]

;Returns vector or dictionary with specified index or key/value set or replaced
;  with another value, as returned from a specified function
(update-at [0] inc [0 1])     → [1 1]
(update-at [-1] inc [0 1 2])  → [0 1 3]
(update-at [0 1] upper-case
  [["hi" "hello"] ["hi" "hello"]])
→ [["hi" "HELLO"] ["hi" "hello"]]
;Does nothing
(update-at [5 0] inc [0 1 2]) → [0 1 2]

;Takes functions and returns a function that returns a vector of the result of
;  applying each function to those arguments
;E.g. (juxt + -) is equivalent to #[(... + args) (... - args)]
((juxt + - * /) 10 8) → [18 2 80 1.25]

;Takes functions and returns a function that takes a vector and returns a vector
;  of the result of applying each function positionally to the vector items
((adj inc dec (+ 10)) [1 1 1]) → [2 0 11]
((adj inc dec) [0 1 2])        → [1 0 2]
((adj inc) [0 1 2])            → [1 1 2]
((adj _ _ inc) [0 1 2])        → [0 1 3]

;Compose multiple functions to be executed one after the other, with the result
;  of the previous function being fed into the next function
((comp + inc) 8 8 8) → 25
((comp * floor) PI PI) → 9
((comp (* 2) str reverse) 10) → "02"

;Returns a closure which returns its non-matching argument, or the identity
((toggle :cozy :compact) :cozy)    → :compact
((toggle :cozy :compact) :compact) → :cozy
((toggle :cozy :compact) :hello)   → :hello

;Returns a closure which returns true or false based on multiple criteria
;Note: the evalution short-circuits on falsy values
((criteria num? (< 5) odd?) 11) → true
((criteria [0 1 2] [1 2 3]) 2)  → true
((criteria [0 1 2] [3 4 5]) 10) → false

;Calls its first argument with each of its subsequent arguments, returning
;  results as a vector
(proj char-code "a" "b" "c") → [97 98 99]
(proj len [1] [1 2] [1 2 3]) → [1 2 3]

;Treats its arguments as an expression, first argument as the expression head
(. + 2 2) → 4
(map . [+ -] [10 12] [13 6])
→ [23 6]

;Applies a vector's items and other arguments as a function's parameters
(.. + [0 1 2] 3 [4 5 6])
→ 21

;Applies a final vector's items and other arguments as a function's parameters
(... + 0 1 2 3 [4 5 6])
→ 21

;Returns a string JSON representation of an Insitux value
;Note: if you just need to serialise and deserialise Insitux values, use
;  str and eval (safely), as it preserves complex data types
(to-json {:a 1 :b 2}) → "{\":a\":1,\":b\":2}"
(to-json [1 2 3])     → "[1,2,3]"
(to-json "hello")     → "\"hello\""

;Returns an Insitux value from a JSON string
;Note: JSON is unable to provide lossless serialisation of Insitux values 
(from-json "{\":a\":1,\":b\":2}") → {":a" 1 ":b" 2}
(from-json "[1,2,3]")             → [1 2 3]
(from-json "\"hello\"")           → "hello"
(from-json ":bad JSON:")          → null

;Evaluates all but its final argument and returns the penultimate argument's
; value if no runtime errors occurred, else populates the let `errors` and
; returns the evaluation of the final argument
(catch (+ 1 1 %) errors)
→ [{:e "Type", :m "+ takes numeric arguments only, not null", :line 1, :col 9}]
(catch (+ 2 2) (+ 3 3) (print "hi")) → 6
(catch (+ 1 2 3) :success :error) → :success
(catch (+ 1 2 %) :success :error) → :error

;Returns the time in milliseconds
(time) → 1630143983032

;Returns report of built-in Insitux tests as a string, optionally verbose
(tests)
(tests true)

;Returns Insitux version as number
(version) → 22****

;Returns symbol name strings vector by definition order in the Insitux session
(symbols) → ["print" "print-str" "!" "=" …]

;Evaluates a string as code, returning any values returned or null
(eval "(+ 2 2)") → 4

;Evaluates a string as an Insitux value, without executing any code
(safe-eval "{:a 'Hello' :b 123}") → {:a "Hello", :b 123}
(safe-eval "(+ 2 2)")             → null

;Efficiently dereferences a string into a var/let/function value
;Note: this can throw reference errors
(let my-let 123)
(deref "my-let")
→ 123
(deref "+") → +

;Returns arity, type, and other information about specified function
(about +)
→ {:name "+", :external? false, :has-effects? false, :minimum-arity 2,
   :in-types ["num"], :out-types ["num"], :mocked? false}
(about "about")
→ {:name "about", :external? false, :has-effects? false, :exact-arity 1,
   :in-types [["str" "func" "unm"]], :out-types ["dict"], :mocked? false}

;Resets an Insitux session back to how it started
;Note: safely position this in a program as it may cause Reference Errors
(reset)

;Asserts its arguments are all true and returns last argument, else errors
(assert true false)   ; Assert Error: argument 2 was falsy.
(assert (= 1 1) :hi)  → :hi

;Has Insitux use the provided functions for each symbol rather than the built-in
;  operation or user-defined function, restored with unmock
;Note: this is syntax, not an operation
(mock + * fast- fast/)
(+ 2 2 2) → 8
(- 10 5)  → 2

;Restore mocked function to original implementation, or all functions at once
;Note: this is syntax, not an operation
(mock + *)
(+ 2 2 2) → 8
(unmock +)
(+ 2 2 2) → 6
(unmock) ;All mocks restored to originals

;Force Insitux to use original implementation of a mocked function or operation
(mock + *)
(+ 2 2 2)            → 8
((unmocked +) 2 2 2) → 6
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

- `'` can be alternatively used to start and end strings, freely containing `"`.
  Use `\'` inside one of these strings to represent `'`.

- Write decimal numbers either `0.123` or `.123`.

- Hexadecimal can be written as, for example `0xFFF`

- Binary numbers can be written as, for example `0b0101001`

- Pi and Euler's number are accessible through constants `PI` and `E`

- `args` contains a vector of arguments the function was called with.

- `err-ctx` contains a dictionary of its own source line and column number

- Arguments can also be accessed through `%0`, `%1`, `%2`, etc, with `%` the
  same as `%0`.

  - Accessing too high a number will return `null`.

- `_` is a wildcard type and is equal to any value. Example:

```clj
(= 1 _) → 1
(= [:a :b] [:a _]) → true
; Can also be used to discard values
(let [_ _ c] [0 1 2])  → c is 2
; Can also be used for a "default" dictionary value
({:a 123 _ 234} :a) → 123
({:a 123 _ 234} :b) → 234
; Observe particular behaviour around dictionary equality
(= {_ 123 2 234} {_ 123 2 234}) → true
(= {_ 123 2 234} {1 123 2 234}) → false
(= {1 123 2 234} {1 123 2 _})   → true
```

It can also be used as an identity function (i.e. `val`).

- Function definitions take precedence over vars and lets.

- Lets take precedence over vars.

- Parameters take precedence over lets, vars, and functions.

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

(function f
  (function g a b c
    (+ a b c)))
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
context around them. The syntax of a non-parameterised closure is:

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

There are also parameterised closures that can specify parameter names.  
They accept multiple expressions in their body, with the return value being
from the last expression.  
Also useful for passing outer-closure parameters into inner-closures.

```clj
((fn a b (+ a b)) 2 2) → 4
((fn a b (repeat #(rand-int a b) 4))
 10 20)
→ [18 13 14 19]
(var closure (fn x (print-str "hi") (+ x x)))
(closure 2.5) → hi5
```

Providing one too few arguments to an operation will return a partial closure.
Some examples:

```clj
(+ 1)               → @(+ 1)
(join ", ")         → @(join ", ")
(var hello)         → #(var hello %)
(let a 1 b)         → #(let a 1 b %)
(proj (+ 5) 1 2 3)  → [6 7 8]
```

If Insitux notices you modify a let or var inside of the closure it will not be
captured.

```clj
(var x 10)
(var closure1 (fn x))
(var closure2 (fn (var x x) x))
[(closure1) (closure2)] → [10 10]
(var x 11)
[(closure1) (closure2)] → [10 11]

;This also works fine
(function cumulative-sum nums
  (var acc 0)
  (reduce #(append (var! acc + %1) %) [] nums))
(cumulative-sum (range 5))
→ [0 1 3 6 10]
```

**Destructuring**

Destructuring is a syntax available as part of named function signatures,
parameterised closure signatures, and var/let declarations. It capitalises on
a space of otherwise nonsensical syntax - a vector declared but not returned;
and the name/value pairs in var/let being easily determined between.  
A "shape" of parameter names or var/let names can be provided in which each
vector item or string character is "destructured" into.

```clj
(function f [x]
  (str "Hello, " x))
(f ["Patrick"])
→ "Hello, Patrick"

(var f (fn [x y] [y x]))
(f [:a :b :c])
→ [:b :a]

(function func x [y] z
  [x y z])
(func [1 2] [3 4] [5 6])
→ [[1 2] 3 [5 6]]

(var [x [y z]] [1 [2 3 4 5] 6])
(str x y z)
→ "123"

; improper but never causes an error
(var [x [y]] "hello")
[x y]
→ ["h" null]

(var [a b [d c]] [0 1])
[a b c d]
→ [0 1 null null]

; also null if there aren't enough items
(var [x y z] [0 1])
[x y z]
→ [0 1 null]

; furthermore, we can provide a symbol for the "rest" of the items
(let [x y & z] [0 1 2 3 4])
[x y z]
→ [0 1 [2 3 4]]

(function f x & y
  [x y])
(f 1 2 3 4)
→ [1 [2 3 4]]
(f 1)
→ [1 []]
```

## Various examples

Check out our [Rosetta Code entries](https://rosettacode.org/wiki/Insitux) for
70+ other examples.

```clj
; Test if 2D point is inside 2D area
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

; and iterative

(function fib n
  (return-when (zero? n) 0)
  (let a 1 b 0)
  (loop n i
    (let t (+ a b) a b b t)))

(fib 35) → 9227465


; FizzBuzz with match syntax
(function fizzbuzz n
  (match (proj (rem n) 3 5)
    [0 0] "FizzBuzz"
    [0 _] "Fizz"
    [_ 0] "Buzz"
    n))

(map fizzbuzz (range 10 16))
→ ["Buzz" 11 "Fizz" 13 14 "FizzBuzz"]


; Filter for vectors and strings above a certain length
(filter 2 [[1] [:a :b :c] "hello" "hi"])
→ [[:a :b :c] "hello"]


; Flatten a vector one level deep
(.. .. vec [[0 1] 2 3 [4 5]])
→ [0 1 2 3 4 5]


; Triple every vector item, four different ways
(for x [0 1 2 3 4] (* x 3))
(map #(* 3 %) [0 1 2 3 4])
(map @(* 3) [0 1 2 3 4])
(map (* 3) [0 1 2 3 4])
→ [0 3 6 9 12]


;Count vowels
(function count-vowels input
  (-> input lower-case (count (to-vec "aeiou"))))


; Primes calculator
(reduce
  (fn primes num
    (if (find zero? (map (rem num) primes))
      primes
      (append num primes)))
  [2]
  (range 3 1000))


; Generate random strong password
(-> #(map rand-int [97 65 48 33] [123 91 58 48])
    (times 4)
    flatten
    shuffle
    (map char-code)
    (.. str))

→ "d$W1iP*tO9'V9(y8"


; Palindrome checker
;Note: returning non-false or non-null is truthy in Insitux
(function palindrome? x
  (.. and (map = x (reverse x))))
;or
(function palindrome? x
  (= x (reverse x))) ;Works even for vectors due to deep equality checks

(palindrome? "aabbxbbaa") → true
(palindrome? "abcd")      → false
(palindrome? [0 1 2])     → false
(palindrome? [2 1 2])     → true


; Function mocking for unit tests
(var calls [])
(function mocked-print
  (var calls (append args calls))
  null)
(mock print mocked-print)
(print "Hello!")
(assert (= calls [["Hello!"]]))


; Matrix addition, subtraction, transposition
(var A [[3  8] [4  6]]
     B [[4  0] [1 -9]])

(map (map +) A B)
→ [[7 8] [5 -3]]

(var M [[2 -4] [7 10]])

(map (map -) M)
→ [[-2 4] [-7 -10]]

(var M [[0 1 2] [3 4 5]])

(@(.. map vec) M)
→ [[0 3] [1 4] [2 5]]


; Find first repeated letter
(function find-two-in-row text
  (-> (map (.. ==) text (skip 1 text))
      (find val)))

(find-two-in-row "Hello") → "l"


; Add thousands separator
(var thousands (comp str reverse (partition 3) reverse (join ",")))
(thousands 1234567890) → "1,432,765,098"


; Time a function call
(function measure
  (let [start result end] [(time) (... . args) (time)])
  (str result " took " (- end start) "ms"))

(measure fib 35)
→ "9227465 took 22914ms"


;Insitux quine
(#(join(char-code 34)[% %(char-code 41)])"(#(join(char-code 34)[% %(char-code 41)])")
→ (#(join(char-code 34)[% %(char-code 41)])"(#(join(char-code 34)[% %(char-code 41)])")


; Display the Mandelbrot fractal as ASCII
(function mandelbrot width height depth
  (.. str 
    (for yy (range height)
         xx (range width)
      (let c_re (/ (* (- xx (/ width 2)) 4) width)
           c_im (/ (* (- yy (/ height 2)) 4) width)
           x 0 y 0 i 0)
      (while (and (<= (+ (** x) (** y)) 4)
                  (< i depth))
        (let x2 (+ c_re (- (** x) (** y)))
             y  (+ c_im (* 2 x y))
             x  x2
             i  (inc i)))
      (strn ((zero? xx) "\n") (i "ABCDEFGHIJ ")))))

(mandelbrot 56 32 10)


; Convert nested arrays and dictionaries into HTML
(function vec->html v
  (if-not (vec? v) (return v))
  (let [tag attr] v
       from-key   @((key? %) (-> % str (skip 1)))
       has-attr   (dict? attr)
       make-attr  (fn [k v] (str " " (from-key k) "=\"" v "\""))
       attr       (if has-attr (map make-attr attr) "")
       tag        (from-key tag)
       body       (skip (has-attr 2 1) v)
       body       (map vec->html body))
  (if (["link" "meta" "input" "img"] tag)
    (.. str "<" tag attr " />")
    (.. str "<" tag attr ">" body "</" tag ">")))

(vec->html
  [:div
    [:h2 "Hello"]
    [:p "PI is " [:b (round 2 PI)] "."]
    [:p "Find out about Insitux on "
       [:a {:href "https://insitux.github.io"}
          "Github"]]])
→ "<div><h2>Hello</h2><p>PI is <b>3.14</b>.</p><p>Find out about Insitux on <a href=\"https://insitux.github.io\">Github</a></p></div>"


; Neural network for genetic algorithms with two hidden layers
(var sigmoid (comp neg @(** E) inc (/ 1)))
(function m (< .8 (rand)))

(function make-brain  num-in num-out num-hid
  (let make-neuron #{:bias 0 :weights (repeat 1 %)})
  [(repeat (make-neuron num-in)  num-hid)
   (repeat (make-neuron num-hid) num-hid)
   (repeat (make-neuron num-hid) num-out)])

(function mutate  brain
  (let mutate-neuron
    #{:bias    ((m) (rand -2 2) (:bias %))
      :weights (map @((m) (rand -1 1)) (:weights %))})
  (map (map mutate-neuron) brain))

(function neuron-think  inputs neuron
  (let weighted (map * (:weights neuron) inputs)
       avg      (average weighted))
  (sigmoid (+ avg (:bias neuron))))

(function think  brain inputs
  (reduce (fn in layer (map @(neuron-think in) layer))
          inputs brain))

(var brain (mutate (make-brain 5 5 5)))
(-> (repeat #(rand-int) 5)
   @(think brain)
    (map @(round 2)))
→ [0.23 0.41 0.63 0.64 0.57]
```


**Known bugs I put here to make sure I can't lose them,**  
**and to shame myself that they still exist.**  
⚠️ syntax highlighter omits commas  
⚠️ ((let x) 1) x - doesn't work
