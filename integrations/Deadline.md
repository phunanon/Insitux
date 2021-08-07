# Deadline API

Insitux was developed with roblox-ts in mind, allowing for easy porting to roblox, and consequently, deadline.
Currently, the commandline it works with is still in "early" development, however its core functionality works.
Code completion is coming, however, for now the accessible API functions will be listed here.

shobfix is an environment and server wrapper for Insitux.
Insitux is a scripting language, which may access values from the shobfix environment.

## How-to

### functions

to run functions, wrap them in parentheses:

```clojure
;; space acts like a separator
(function_name argument argument2)
;; runs `function_name` with `argument` and `argument2`
```

strings and numbers are interpreted as-usual:

```clojure
(print "hello world!")
;; prints hello world!
```

### values

to set values, add $ to treat them like a "set" function:

```clojure
($dl.globals.time_offset 0.5)
;; 0.5
```

to get values, add $ to treat them like a "get" function when supplied as arguments

```clojure
(print $dl.globals.time_offset)
;; prints the value of dl.globals.time_offset
```

### other

to define variables, use `define`:

```clojure
(define hi 0.5)
(print hi)
;; prints hi (0.5)
```

## The API

### main.ts

basic shobfix environment definitions to interface with your console or provide basic functionality

```clojure
(print ...)
;; function
;; prints supplied args to your console

(clear)
;; function
;; clears your console

(typeof arg)
;; function
;; returns a string type of `arg`

(wait n)
;; function
;; alias for Luau wait
```

### dl.ts

deadline environment definitions to do things like set the time, change the map or gamemode

```clojure
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
```

## Test

Test functions

```clojure
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

```clojure
(dl.util.message "hello world from deadline " $dl.globals.version " rev. " $dl.globals.revision)
```
