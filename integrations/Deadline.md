# Deadline

Insitux was developed with roblox-ts in mind, allowing for easy porting to roblox, and consequently, deadline.
Currently, the commandline it works with is still in "early" development, however its core functionality works.

shobfix is an environment and server wrapper for Insitux.
Insitux is a scripting language, which may access values from the shobfix environment.

## Language Guide

### Functions

to run functions, wrap them in parentheses:

```clj
;; space acts like a separator
(function_name argument argument2)
;; runs `function_name` with `argument` and `argument2`
```

to define functions:

```clj
(function hi arg (print "hello, " arg))
(hi "programmer")
```

strings and numbers are interpreted as such:

```clj
(print "hello world!")
;; prints hello world!
```

### Values

to set values, add $ to treat them like a "set" function:

```clj
($dl.globals.time_offset 0.5)
;; 0.5
```

to get values, add $ to treat them like a "get" function when supplied as arguments

```clj
(print $dl.globals.time_offset)
;; prints the value of dl.globals.time_offset
```

### Other

to define variables, use `var`:

```clj
(var hi 0.5)
(print hi)
;; prints hi (0.5)
```

### Examples

```clj
(print "hello world from deadline " $dl.globals.version " rev. " $dl.globals.revision)
```

```clj
(dl.util.set_map "dl_shipment")
```

## Integration guide

### Playing sounds

`dl.sound` is a class that allows playing sounds.

```clj
(dl.sound.new "handle")
(dl.sound.set_id "handle" "your_id")
(dl.sound.play "handle")
(wait 10)
(dl.sound.set_time_position "handle" 0)
```

`dl.gunshot_emitter` mimicks gunshot sounds the game plays.

```clj
(dl.gunshot_emitter.new "handle" "UMP45")
(dl.gunshot_emitter.set_position "handle" [0 100 0])

;; automatic gunfire
(dl.gunshot_emitter.start_kind "handle" "auto")
(wait 3)
(dl.gunshot_emitter.stop_kind "handle" "auto")
(dl.gunshot_emitter.start_kind "handle" "tail")
```

### Simulating weapons

```clj
;; fires a non-damaging UMP45 shot at 1500 projectile velocity
(dl.util.fire [0 0 0] [0 100 0] "45acp_match_fmj" 1500)
```

```clj
;; blows you up
(dl.players.you.explode)
;; explodes a grenade that deals damage at 0,100,0
(dl.util.explosion [0 100 0])
```

### Manipulating players

```clj
(dl.players.you.fill_ammo "primary")
```

## The API

### basic shobfix environment definitions 

```clj
#defs:main.ts

(print ...)
;; function
;; prints supplied args to the console

(clear)
;; function
;; clears the console

(typeof arg)
;; function
;; returns a string type of `arg`

(wait n)
;; function
;; alias for Luau `wait()`
```

### internal insitux functions

```clj
#defs:index.ts

(function sum a b (+ a b))
;; syntax
;; Defines a new function.

(fn a b (+ a b))
;; syntax
;; Creates a parameterised closure.

(var a 1 b 2 c 3)
;; syntax
;; Defines one or more variables for later use anywhere in the program.

(let a 1 b 2 c 3)
;; syntax
;; Defines one or more variables for later use within the same function call.

(if true (print "hi") (print "bye"))
;; syntax
;; Tests a condition and executes either the second or third argument (or null).

(if! true (print "hi") (print "bye"))
;; syntax
;; Tests a condition and executes either the third or second argument (or null).

(match something, [:a :b] 0, [_ :a] 1)
;; syntax
;; Matches a value with each case and executes and returns the corresponding value, else a default final value or false.

(satisfy 0, pos? true, neg? false 0)
;; syntax
;; Matches a value with each case function and executes and returns the corresponding value, else a default final value or false.

(-> "hello" 1 upper-case)
;; syntax
;; "Thread" return values into the next function, seeded with first argument.

(and null (print "hi"))
;; syntax and function
;; Tests each argument and returns true or false if all arguments are truthy.
;; Note: short-circuits evaluation after falsy argument.

(and null true (print "hi"))
;; syntax and function
;; Returns first truthy argument or false.
;; Note: short-circuits evaluation after first truthy argument.

(when true (print "hi") (print "bye"))
;; syntax
;; Tests a condition is true and executes its body else returns null.

(unless false (print "hi") (print "bye"))
;; syntax
;; Tests a condition is false and executes its body else returns null.

(while (pos? n) (print "hi") (var n (dec n)))
;; syntax
;; Loops all arguments so long as the first argument is true.

(function f (return 123) (print "hello"))
;; syntax
;; Returns its last argument early from a function.

(catch (+) errors)
;; syntax
;; Evaluates the first argument and returns the value if no runtime errors, else populates the let `errors` and returns the evaluation of the second argument

(print "2 + 2 = " (+ 2 2))
;; function
;; Prints a line of text, joining its arguments together.

(+ 1 2 3)
;; function
;; Sums together its arguments.

(- 3 2 1)
;; function
;; Subtracts each argument from the previous in turn.

(* 10 10 10)
;; function
;; Multiplies all its arguments together.

(/ 10 5 2)
;; function
;; Divides each argument by the next in turn.

(// 10 3)
;; function
;; Divides and retains the quotient each argument by the next in turn.

(** 10 2)
;; function
;; Returns its first argument to the power of its second argument.

(abs -123)
;; function
;; Returns absolute of a number.

(sin (pi))
;; function
;; Returns sine of a radian angle.

(cos (pi))
;; function
;; Returns cosine of a radian angle.

(tan (* 45 (/ (pi) 180)))
;; function
;; Returns tangent of a radian angle.

(sqrt 25)
;; function
;; Returns the square root of a number.

(rem 10 2)
;; function
;; Returns the remainder of a division.

(round 2 3.5)
;; function
;; Rounds a number to the nearest integer or decimal provided.

(floor 3.9)
;; function
;; Rounds a number down to the nearest integer.

(ceil 3.1)
;; function
;; Rounds a number up to the nearest integer.

(logn 1)
;; function
;; Returns the natural logarithm of a number.

(log2 8)
;; function
;; Returns the logarithm base 2 of a number.

(log2 1000)
;; function
;; Returns the logarithm base 10 of a number.

(min 1 2 3)
;; function
;; Returns the smallest number of its arguments.

(max 1 2 3)
;; function
;; Returns the largest number of its arguments.

(pi)
;; function
;; Returns the mathematical Pi.

(inc 123)
;; function
;; Returns its argument +1 (incremented).

(dec 123)
;; function
;; Returns its argument -1 (decremented).

(= 123 my-variable)
;; function
;; Tests if all arguments are equal to one another.

(!= 123 456)
;; function
;; Tests if each argument is different from the previous.

(< 1 2 3)
;; function
;; Tests if arguments are increasing in value.

(> 3 2 1)
;; function
;; Tests if arguments are decreasing in value.

(<= 3 3 4 5)
;; function
;; Tests if arguments are not decreasing in value.

(>= 4 4 3 2 2 1)
;; function
;; Tests if arguments are not increasing in value.

(vec 1 "hello" :c)
;; function
;; Returns a vector of its arguments, exactly as using […].

(dict 1 "hello" :c "world")
;; function
;; Returns a dictionary of its arguments, exactly as using {…}.

(len "hello")
;; function
;; Returns the length of a string, vector, or number of dictionary entries.

(rand-int 10 20)
;; function
;; Returns a random whole number between its two arguments;
;; or, provided no arguments a random 0 or 1;
;; or, provided one argument a random whole number between 0 and that.

(rand)
;; function
;; Returns a random number between 0 and 1;
;; or, provided one argument a random number between 0 and that;
;; or, provided two arguments a random number between those two.

(map str [0 1 2] "abc")
;; function
;; Returns a vector of calling a function with each of all the items or characters of one or more vectors or strings as arguments.

(for str [0 1 2] "abc")
;; function
;; Returns a vector of calling a function with every combination of vector item or string characters as arguments.

(reduce + [1 2 3])
;; function
;; Calls a function repeatedly with each vector item or string character and the result from the previous function result.

(while (< n 5) (do-something) (var n (inc n)))
;; function
;; Runs expressions until its condition (first argument) is false.

(str "Hello, " "world!")
;; function
;; Concatenates its arguments into one string.

(. + 2 2)
;; function
;; Treats its arguments as an expression, first argument as the expression head.

(.. + [0 1] 2 [3 4])
;; function
;; Applies a vector's items and other arguments as the arguments to a function.

(... + 0 1 2 [3 4])
;; function
;; Applies a final vector's items and other arguments as the parameters to a function.

(into [0 1] {3 4 5 6})
;; function
;; Returns the concatenation of vectors and dictionaries.

(append 3 [0 1 2])
;; function
;; Append item to the end of a vector.

(prepend 3 [0 1 2])
;; function
;; Prepend item to the beginning of a vector.

(omit :a {:a 1 :b 2})
;; function
;; Removes key from a dictionary.

(assoc :a 2 {:a 1 :b 2})
;; function
;; Associates a value to a key in a dictionary.

(insert :a 1 [1 2])
;; function
;; Insert item at a specified index in a vector.

(sect "Hello, world!" 1 3)
;; function
;; Returns a section of a vector or string.

(skip 7 "Hello, world!")
;; function
;; Returns a section of a vector or string, skipping N elements.

(first 5 "Hello, world!")
;; function
;; Returns a section of a vector or string, up to N elements.

(last "Hello, world!")
;; function
;; Returns a section of a vector or string, of the last N elements.

(crop 2 2 "Hello, world!")
;; function
;; Returns a section of a vector or string, after X elements, less Y elements.

(substr? "ll" "Hello")
;; function
;; Tests if a sub-string is in a string.

(to-num "123")
;; function
;; Converts a string to a number.

(to-key "hello")
;; function
;; Converts a string or number into a keyword.

(to-vec "hello")
;; function
;; Returns string or dictionary as vector.

(type-of "hello")
;; function
;; Returns type string of argument.

(keys {0 1 2 3})
;; function
;; Returns the keys of a dictionary.

(vals {0 1 2 3})
;; function
;; Returns the vals of a dictionary.

(idx [1 2 3] 2)
;; function
;; Returns index of an item or sub-string in a vector or string, or null.

(odd? 5)
;; function
;; Tests if number is odd.

(even? 4)
;; function
;; Tests if number is even.

(filter odd? [0 1 2 3])
;; function
;; Filters a vector or string by a function, optionally passing extra arguments. Returns the same type that is provided.

(remove odd? [0 1 2 3])
;; function
;; Negatively filters a vector or string by a function, optionally passing extra arguments. Returns the same type that is provided.

(find odd? [0 1 2 3])
;; function
;; Returns the first item in the vector or string matching a predicate, optionally passing extra arguments.

(count odd? (range 10))
;; function
;; Returns the number of items or characters in a vector or string matching a predicate, optionally passing extra arguments.

(repeat 1 10)
;; function
;; Returns a vector of either a function called N times with the incrementation, or a value repeated N times.

(reverse [0 1 2 3])
;; function
;; Returns the reverse of a vector or string.

(flatten [8 [6 9] [0 [4]]])
;; function
;; "Flattens" its argument's immediate sub-vectors, and their immediate sub-vectors, etc.

(shuffle (range 10))
;; function
;; Randomly rearranges a vector's items.

(sort [8 6 9 0 4])
;; function
;; Returns a vector of vector items or string characters sorted.

(sort-by sin [8 6 9 0 4])
;; function
;; Returns a vector of vector items, dictionary entries, or string characters sorted by the return of a function over each item.

(group-by odd? [0 1 2 3])
;; function
;; Groups by a function return into a dictionary of vectors, for vector items, string characters;
;; or a dictionary of dictionaries for dictionary entries.

(part-by odd? [0 1 2 3 4])
;; function
;; Partitions by a function return into a vector of [when-true when-false] vectors for vector items or string characters;
;; or a vector of two dictionaries for dictionary entries.

(freqs [0 0 1 2 3])
;; function
;; Returns dictionary with keys as distinct vector items, string characters, with values as number of occurrences.

(distinct 8 6 9 0 0 9)
;; function
;; Returns vector of distinct arguments, or if given one vector, a vector of distinct values.

(starts? "He" "Hello")
;; function
;; Tests if a string starts with another string.

(ends? "lo" "hello")
;; function
;; Tests if a string ends with another string.

(lower-case "HELLO")
;; function
;; Returns a string made entirely lower-case.

(lower-case "hello")
;; function
;; Returns a string made entirely upper-case.

(str* "hello " 6)
;; function
;; Returns a string repeated a specified number of times.

(char-code "hello ")
;; function
;; Returns the code associated with a string's first or Nth character, or null;
;; Or returns a string with the associated supplied character code.

(split "e" "hello")
;; function
;; Splits a string into a vector by spaces or a provided string.

(join ", " [0 1 2 3])
;; function
;; Joins a vector into a string by a provided string.

(replace "l" "x" "hello")
;; function
;; Joins a vector into a string by a provided string.

(time)
;; function
;; Returns the time in milliseconds.

(pos? 5)
;; function
;; Tests if a number is positive.

(neg? -5)
;; function
;; Tests if a number is negative.

(zero? 0)
;; function
;; Tests if a value is 0.

(null? null)
;; function
;; Tests if a value is null.

(num? 123)
;; function
;; Tests if a value is number.

(bool? true)
;; function
;; Tests if a value is boolean.

(str? "hi")
;; function
;; Tests if a value is string.

(dict? {})
;; function
;; Tests if a value is dictionary.

(vec? [])
;; function
;; Tests if a value is vector.

(key? :abc)
;; function
;; Tests if a value is keyword.

(func? +)
;; function
;; Tests if a value is function.

(do (print-str "hello") 1 2 3)
;; function
;; Returns its last argument.

(val 3 2 1 (print-str "hello"))
;; function
;; Returns its first argument.

(range 0 10 (print-str "hello"))
;; function
;; Returns its first argument.

(eval "(+ 2 2)")
;; function
;; Evaluates a string as code, returning any values returned or null.

(symbols)
;; function
;; Returns symbol name strings vector by definition order in the Insitux session.

(tests)
;; function
;; Returns report of built-in Insitux tests as a string, optionally verbose.

(about set-at)
;; function
;; Returns arity, type, and other information about specified function.
```
