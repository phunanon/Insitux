# Deadline API

Insitux was developed with roblox-ts in mind, allowing for easy porting to roblox, and consequently, deadline.
Currently, the commandline it works with is still in "early" development, however its core functionality works.

shobfix is an environment and server wrapper for Insitux.
Insitux is a scripting language, which may access values from the shobfix environment.

## How-to

### functions

to run functions, wrap them in parentheses:

```clj
;; space acts like a separator
(function_name argument argument2)
;; runs `function_name` with `argument` and `argument2`
```

strings and numbers are interpreted as-usual:

```clj
(print "hello world!")
;; prints hello world!
```

### values

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

### other

to define variables, use `define`:

```clj
(define hi 0.5)
(print hi)
;; prints hi (0.5)
```


## Permission levels

- 1: public player
- 2: vip server owner
- 3: moderator
- 4: admin

## The API

### index.ts

internal insitux functions

```clj
#defs:index.ts

(function sum a b (+ a b))
;; keyword
;; Defines a new function.

(define variable-name 123)
;; keyword
;; Defines a variable for later use.

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
;; Returns a random whole number between its two arguments.
;; Or, provided no arguments a random 0 or 1.
;; Or, provided one argument a random whole number between 0 and that.

(rand-num)
;; function
;; Returns a random number between 0 and 1.
;; Or, provided one argument a random number between 0 and that.
;; Or, provided two arguments a random number between those two.

(map str [0 1 2] "abc")
;; function
;; Returns a vector of calling a function with each of all the items or characters of one or more vectors or strings as arguments.

(reduce + [1 2 3])
;; function
;; Calls a function repeatedly with each vector item or string character and the result from the previous function result.

(while (< n 5) (do-something) (define n (inc n)))
;; function
;; Runs expressions until its condition (first argument) is false.

(str "Hello, " "world!")
;; function
;; Concatenates its arguments into one string.

(apply + [0 1] 2 [3 4])
;; function
;; Applies a vector's items and other arguments as the arguments to a function.

(into [0 1] {3 4 5 6})
;; function
;; Returns the concatenation of vectors and dictionaries.

(sect "Hello, world!" 1 3)
;; function
;; Returns a section of a vector or string.

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

(round 3.5)
;; function
;; Rounds a number to the nearest integer.

(floor 3.9)
;; function
;; Rounds a number down to the nearest integer.

(ceil 3.1)
;; function
;; Rounds a number up to the nearest integer.

(min 1 2 3)
;; function
;; Returns the smallest number of its arguments.

(max 1 2 3)
;; function
;; Returns the largest number of its arguments.

(** 10 2)
;; function
;; Returns its first argument to the power of its second argument.

(pi)
;; function
;; Returns the mathematical Pi.

(has? "Hello" "ll")
;; function
;; Tests if a string contains a sub-string.

(num "123")
;; function
;; Converts a string to a number.

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
;; Filters a vector or string by a function.

(reverse [0 1 2 3])
;; function
;; Returns the reverse of a vector or string.

(sort [8 6 9 0 4] sin)
;; function
;; Sorts a vector of numbers or strings, optionally sorting by the return of a function of each item.

(starts-with? "Hello" "He")
;; function
;; Tests if a string starts with another string.

(ends-with? "hello" "lo")
;; function
;; Tests if a string ends with another string.

(split "hello" "e")
;; function
;; Splits a string into a vector by space or a provided string.

(join [0 1 2 3])
;; function
;; Joins a vector into a string by spaces or a provided string.
```

### main.ts

basic shobfix environment definitions to interface with your console or provide basic functionality

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

### dl.ts

deadline environment definitions to do things like set the time, change the map or gamemode

```clj
#defs:dl.ts

(print $dl.players.BIackShibe.name)
;; readonly string value
;; name of "BIackShibe", if a player named BIackShibe is ingame

(print $dl.players.BIackShibe.team)
($dl.players.BIackShibe.team team)
;; string value
;; team of "BIackShibe", can be set to either security or insurgent

(print $dl.players.BIackShibe.position)
($dl.players.BIackShibe.position [x y z])
;; vector3 value
;; the position of "BIackShibe", can be set with a vector as shown above

(print (dl.players.BIackShibe.is_alive))
;; function
;; returns whether "BIackShibe" is alive

(print $dl.globals.map.lighting)
;; readonly string value
;; current map lighting

(print $dl.globals.map.loaded)
;; readonly boolean value
;; idk

(print $dl.globals.map.title)
;; readonly string value
;; name of the current map

(print $dl.globals.tags)
;; unfinished; will likely allow for custom orb tags

(print $dl.globals.team_aliases)
;; unfinished; will allow to change team names and colors

(print $dl.globals.base_player_weight)
;; number value
;; default player weight; before any weapon weight calculation is done

(print $dl.globals.builder_revision)
;; readonly number value
;; current revision of the builder

(print $dl.globals.channel_type)
;; readonly string value
;; game channel type

(print $dl.globals.chat_tip_frequency)
;; number value
;; frequency of chat tips

(print $dl.globals.chat_tips_enabled)
;; bool value
;; sets whether chat tips appear

(print $dl.globals.day_cycle_speed)
;; number value
;; how quickly the day passes

(print $dl.globals.disable_attachment_checks)
;; bool value
;; disables most builder attachment validity checks

(print $dl.globals.editor_mount_any)
;; bool value
;; disables ALL builder validity checks

(print $dl.globals.revision)
;; readonly number value
;; game revision

(print $dl.globals.jump_frequency)
;; number value
;; how often the players can jump

(print $dl.globals.pvp)
;; bool value
;; whether pvp is enabled

(print $dl.globals.spawn_enabled)
;; bool value
;; whether spawning is enabled

(print $dl.globals.team_kill)
;; bool value
;; whether teamkilling is enabled

(print $dl.globals.time_offset)
;; number value
;; day cycle offset, affected by very small values

(print $dl.globals.version)
;; readonly string value
;; game version

(dl.util.message message)
;; admin-restricted function
;; prints message to server chat without text filtering

(dl.util.fmessage message)
;; function
;; prints message to server chat

(dl.util.set_map target_map)
;; function
;; sets current map to target_map

(dl.sound.play rbxassetid)
(dl.sound.play "rbxassetid://2297359893")
;; 0.19.2+
;; function
;; plays a sound globally
;; placeholder until a sound object is added
;; in the game
```

## Test

Test functions

```clj
#defs:test.ts

(test.lua_error_test)
;; function
;; Lua error()

(test.shobfix_generic_error_test)
;; function
;; shobfix error

(test.shobfix_perm_error_test)
;; function
;; permission error
```

## Examples

```clj
(print "hello world from deadline " $dl.globals.version " rev. " $dl.globals.revision)
```

```clj
(dl.util.set_map "dl_shipment")
```
