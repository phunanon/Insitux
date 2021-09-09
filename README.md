<table>
  <tr>
    <td><img src="media/Insitux.png" alt="Insitux logo" height="32"></td>
    <td><a href="https://phunanon.github.io/Insitux">Website</a></td>
    <td><a href="https://phunanon.github.io/Insitux/website/repl">Try in online REPL</a></td>
  </tr>
  <tr>
    <td colspan="3">S-expression programming language written in portable TypeScript.</td>
  </tr>
</table>

Successor to [Chika](https://github.com/phunanon/Chika),
[Epizeuxis](https://github.com/phunanon/Epizeuxis),
and [Kuan](https://github.com/phunanon/Kuan).

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
separated by spaces or new lines within the parentheses, and the operation you want to
perform is the first value. Expressions can nest within one another, for
example:  
`(+ 2 (- 10 2) 2)`  
which is like the arithmetic expression `2 + (10 - 2) + 2`. Letting Insitux run
this code would return the value `12`.  
There are many built-in operations such as for arithmetic, manipulating text,
making lists, causing things to happen, etc. You can also write your own custom
operations called _functions_. An example:

```clj
(function say-hello name
  (define greeting "Hello")
  (print greeting ", " name "!"))
```

If you first enter this into the app, then `(say-hello "Patrick")`, it would
print to the screen a line saying `Hello, Patrick!`

### Built-in operations

Remember, each operation goes at the beginning of the expression in parentheses.
Each value separated by spaces are called _arguments_. Below is a list of
built-in operations each within an example, with results after a `=>`.

```clj
;Prints a line of text, joining its arguments together
(print "2 + 2 = " (+ 2 2))
=> 2 + 2 = 4

;Prints text without a line after it
(print-str "Hello, ")
(print-str "world!")
=> Hello, world!

;Defines a variable for later use anywhere in the program
(define my-number 123)
(print my-number)
=> 123

;Defines a variable for use only within one function call
(function test
  (let my-number 123)
  (print my-number))
(test)
=> 123

;Tests a condition and executes either the second or third argument
(if true 1 2) => 1
(if 1 2 3)    => 2
(if false 1)  => null
(if null 1 2) => 2
(if false
  (print "hi")
  (print "bye"))
=> bye

;Like if, but either executes all arguments or returns null
(when true (print-str "hi") 123)
=> hi123

;Yields the mathematical Pi
(pi) => 3.141592653589793

;Various arithmetic operators which take one or more arguments
(+ 1 1 1)    => 3
(- 10 5 1)   => 4
(* 10 10 10) => 1000
(/ 10 3)     => 3.333333
(// 10 3)    => 3
(** 2 3)     => 8
(** 10)      => 100

;Various arithmetic and test functions which take one argument only
(inc 100)    => 101
(dec 50)     => 49
(abs -123)   => 123
(sin (pi))   => ~0
(cos (pi))   => -1
(tan (* 45 (/ (pi) 180)))
=> ~1
(sqrt 25)    => 5
(round 3.5)  => 4
(floor 2.7)  => 2
(ceil 2.1)   => 3
(odd? 5) (even? 6) (pos? 5) (neg? -5) (zero? 0)
(null? null) (num? 123) (bool? true) (str? "hi")
(dict? {}) (vec? []) (key? :abc) (func? +)

;Various arithmetic functions which take two or more arguments
(rem 10 3)  => 1
(min 1 2 3) => 1
(max 1 2 3) => 3

;Various equality operators, which all accept a variable number of arguments
;Note: < > <= >= only compare numbers
;Note: != will only check that each value is different from the next
(= 10 10)     => true
(!= 1 2 1)    => true
(< 1 2 3)     => true
(> 10 5)      => true
(<= 10 10 15) => true
(>= 10 11 11) => false

;Negates boolean value
(! true)  => false
(! false) => true
(! null)  => true
(! 123)   => false

;Creates a vector (list) of values in two different ways
[1 "hello" :c]
(vec 1 "hello" :c)

;Creates a dictionary of values in two different ways
{:a 123 "hello" "world"}
(dict :a 123 "hello" "world")

;The length of a string of text or a vector, or number of dictionary entries
(len "Hello!")  => 6
(len [0 1 2])   => 3
(len {0 1 2 3}) => 2

;Concatenates strings of text together, also displaying numbers and vectors as text too
(str "Hello, "
     "world! Welcome "
     2
     " my app. "
     [:a :b "c"])
=> "Hello, world! Welcome 2 my app. [:a :b c]"

;Returns a string parsed into a number
(num "123") => 123

;Returns character from string index or item from vector index
;Note: the first letter/item is 0, the second is 1, etc
(2 "Hello!")    => l
(1 [:a :b :c])  => :b
(-1 [:a :b :c]) => :c

;Returns item if contained within vector else null
([0 1 2 3] 3)   => 3
([:a :b :c] :d) => null

;Returns value associated with key if within dictionary else null
({0 1 2 3} 0)           => 1
({:a "hi" :b "bye"} :c) => null

;Associates a new key and value in a dictionary
({:a 2 :b 3} :c 4) => {:a 2 :b 3 :c 4}

;Either a random whole number (integer) or decimal number
[(rand-int) (rand-int)]  might be [0 0], [0 1], [1 0], [1 1]
(rand-int 10)            any integer from 0 to 9
(rand-int 10 20)         any integer from 10 to 20
(rand-num)               any decimal between 0 and 1
(rand-num 100)           any decimal between 0 and 100
(rand-num -10 10)        any decimal between -10 and 10

;"Maps" a function over one or more vectors
;Note that it only iterates by the minimum number of vector items
(map double [0 1 2 3])    => [0 2 4 6]
(map + [0 1 2 3] [4 5 6]) => [4 5 8]
(map str "abc" "xyz")     => ["ax" "by" "cz"]

;Iterates a function over one or more vectors
(for * [0 1 2] [1 10 100])
=> [0 1 2 0 10 20 0 100 200]

;"Reduces" a vector into one value through a function, also accepting an initial value as its second argument
(reduce + [1 2 3])   => 6
(reduce + [1 2 3] 3) => 9

;Continues looping until condition becomes false
;Note: also returns the final value, in this case `0`
(define n 0)
(while (< n 5)
  (print n)
  (define n (inc n)))
=> 012345

;Returns the first argument; returns the last argument
(val 3 2 1 (print-str "hello"))
=> hello3
(do (print-str "hello") 1 2 3)
=> hello3

;Returns the concatenation of vectors and dictionaries
(into {} [0 1 2 3 4 5])         => {0 1, 2 3, 4 5}
(into [] {:a "hi" :b "bye"})    => [[:a "hi"] [:b "bye"]]
(into {:a 123 :b 456} {:a 456}) => {:a 456 :b 456}
(into [1 2 3] [4 5 6])          => [1 2 3 4 5 6]

;Returns a vector or dictionary with one item or key-value pair appended
(push [1 2] 3)   => [1 2 3]
(push {1 2} 3 4) => {1 2 3 4}

;Returns a section of a string or vector
(sect "Patrick")       => "atrick"
(sect "Patrick" 2)     => "trick"
(sect "Patrick" -2)    => "Patri"
(sect "Patrick" 1 2)   => "at"
(sect "Patrick" 1 -1)  => "atric"
(sect "Patrick" -2 1)  => "c"
(sect "Patrick" -2 -2) => "ri"
(sect [0 1 2 3])       => [1 2 3]
etc

;Filter a vector or string by a function
(filter odd? [0 1 2 3])    => [1 3]
(filter ["e" "l"] "Hello") => ["e" "l" "l"]

;Returns the reverse of a vector or string
(reverse "Hello") => "olleH"
(reverse [1 2 3]) => [3 2 1]

;Returns a vector sorted, optionally sorting by the return of a function of each item
;Note: will only sort all number or all string
(sort [0 7 8 9 8 6])    => [0 6 7 8 8 9]
(sort [0 1 8 9 65] str) => [0 1 65 8 9]
(sort [{:a 23} {:a 24} {:a 19}] :a) => [{:a 19} {:a 23} {:a 24}]

;Generates a range of numbers
;Note: the first argument is always inclusive, second exclusive
(range 5)      => [0 1 2 3 4]
(range 1 5)    => [1 2 3 4]
(range -3)     => [0 -1 -2]
(range 0 -3)   => [0 -1 -2]
(range 0 5 2)  => [0 2 4]
(range 5 0 2)  => [5 3 1]
(range 5 1)    => [5 4 3 2]
(range 4 1 -1) => [4 3 2]
(range 1 4 -1) => [3 2 1]
(range 0 4 0)  => [0 1 2 3]

;Tests if a string starts with and ends with another string
(starts-with? "Hello" "He") => true
(ends-with? "Hello" "Lo")   => false

;Splits a string by spaces or provided delimiting string
(split "Hello" "e") => ["H" "llo"]
(split "hi hi!")    => ["hi" "hi!"]

;Joins a vector by spaces or provided string
(join [1 2 3])      => "1 2 3"
(join [1 2 3] ", ") => "1, 2, 3"

;Returns the keys and values of a dictionary
(define d {0 1 :a "hello" "hi" 123})
(keys d) => [0 :a "hi"]
(vals d) => [1 "hello" 123]

;Tests if a string contains a sub-string
(has? "Hello" "ll") => true

;Returns index of an item or sub-string in a vector or string, or null
(idx [1 2 3 4] 5)  => null
(idx [1 2 3 4] 3)  => 2
(idx "Hello" "ll") => 2

;Applies a vector's items and other arguments as the arguments to a function
(.. + [0 1 2] 3 [4 5 6])
=> 21

;Returns the time in milliseconds
(time) => 1630143983032

;Runs built-in Insitux tests, with optional verbosity
(tests)
(tests true)

;Returns Insitux version
(version)
```

### Miscellaneous

- Write `;` outside of a string of text to create a comment:

```clj
;This won't be treated as code
(print "Hello") ;Comment at the end of lines too
```

- Write `\"` inside of a string to represent `"`, `\n` to represent a newline, `\t` to represent a tab character.

- Write decimal numbers either `0.123` or `.123`.

- `args` contains a vector of arguments the function was called with.

- Parameters take precedence over lets and defines.

- Insitux implementations are advised to support this behaviour:

```clj
($test.ing 123)   => 123
$test.ing         => 123
(ing "$test")     => 123
(ing "$test" 456) => 456
$test.ing         => 456
```

### Various examples

```clj
; 2D coordinate inside 2D area?
(function inside-2d? X Y areaX areaY areaW areaH
  (and (<= areaX X (+ areaX areaW))
       (<= areaY Y (+ areaY areaH))))

(inside-2d? 50 50 0 0 100 100)  => true
(inside-2d? 50 150 0 0 100 100) => false

; Recursive Fibonacci solver
(function fib n
  (if (< n 2) n
      (+ (fib (dec n))
         (fib (- n 2)))))

(fib 13) => 233

; Filter for vectors and strings above a certain length
(filter 2 [[1] [:a :b :c] "hello" "hi"])
=> [[:a :b :c] "hello"]

; Flatten a vector one level deep
(.. .. vec [[0 1] 2 3 [4 5]])
=> [0 1 2 3 4 5]

; Triple every vector item
(for * [0 1 2 3 4] [3])
=> [0 3 6 9 12]

; Deduplicate a list
(function dedupe list -out
  (let out (or -out []))
  (let next (if (out (0 list)) [] [(0 list)]))
  (if (empty? list) out
    (dedupe (sect list) (into out next))))

(dedupe [1 2 3 3]) => [1 2 3]

; Time an operation
(define report [(time) (fib 35) (time)])
(str (1 report) " took " (- (2 report) (0 report)) "ms")
=> "9227465 took 55436ms"
```
