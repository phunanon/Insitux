Insitux
```clj
;Note: it is now built into Insitux directly
(function frequencies list
  (reduce #(% %1 (inc (or (% %1) 0))) {} list))
```
TypeScript
```ts
const frequencies = <T>(arr: T[]) =>
  arr.reduce((fs, x) => fs.set(x, fs.has(x) ? fs.get(x) + 1 : 1), new Map<T, number>());
```

Insitux
```clj
(function total-state items
  (let weights [:success :warning :error]
       states  (map :state items))
  ((.. max (map @(idx weights) states)) weights))

(var health-items
  (map @{:state} [:success :warning :success :error]))

(total-state health-items)
;Returns :error as it's the worst state
```
TypeScript
```
type State = "success" | "warning" | "error";
type HealthItem = { state: State };

function totalState(items: { state: State }[]) {
  const weights: State[] = ["success", "warning", "error"];
  const states = items.map(i => i.state);
  return weights[Math.max(...states.map(weights.indexOf))];
}

const healthItems: HealthItem[] = [
  { state: "success" },
  { state: "warning" },
  { state: "success" },
  { state: "error" },
];

totalState(healthItems);
//Returns "error" as it's the worst state
```

Insitux
```clj
(-> #(map rand-int [97 65 48 33] [123 91 58 48])
    (times 4)
    flatten
    shuffle
    (map char-code)
    (.. str))
```
Python
```py
from random import randint, shuffle
randChars = lambda a, b: [chr(randint(a, b)) for i in range(4)]
parts = map(randChars, [97, 65, 48, 33], [123, 91, 58, 48])
combined = sum(parts, [])
shuffle(combined)
"".join(combined)
```
or
```py
from random import randint, shuffle
charRanges = [[97, 123], [65, 91], [48, 58], [33, 48]]
string = []
for start, stop in charRanges:
    for _ in range(4):
        string.append(chr(randint(start, stop)))
shuffle(string)
print("".join(string))
```

Insitux
```clj
(-> (read "ix-demo.cast")
    trim
    (split "\n")
    (var all-lines)
    (skip 1)
    (map (split ","))
    (map #[(to-num (skip 1 (0 %)))
           (join "," (skip 1 %))])
   @(map vec (skip 1 %))
    (map (fn [[b] [a s]] [(min 1 (- b a)) s]))
    (reductions (fn [sum] [t s] [(+ sum t) s]))
    (map (fn [t s] (str "[" t "," s)))
    (prepend (0 all-lines))
    (join "\n"))
```
JavaScript
```js
import { readFileSync } from "fs";
const text = readFileSync("ix-demo.cast").toString().trim();
const lines = text.split("\n");
let prevT = 0,
  sum = 0;
const newLines = lines.slice(1).map(line => {
  let [_, t, s] = line.match(/\[(.+?)(.+$)/);
  sum += Math.min(1, t - prevT);
  return `[${sum}${s}`;
});
newLines.unshift(lines[0]);
console.log(newLines.join('\n'));
```

----

Some kinda 3D doughnut animation - by https://github.com/ZackeryRSmith
```py
from math import pi, sin, cos

W, H = 80, 25

SPEED_A, SPEED_B, SPEED_I, SPEED_J = (
    0.05, 0.05, 0.05, 0.05
)

CHARS = ".,-~:;=!*#$@"
PI2 = 2 * pi


def calculate_screen(screen: list) -> str:
    return (
        "\33[2J"    # Clear screen
        "\33[H"     # Move cursor to top left
        "\33[?25l"  # Hide cursor
    ) + "".join(
        "\n" if i % W == 0 else c for i, c in enumerate(screen)
    )

a = b = 0

while True:
    grid, _grid = [" "] * H * W, [0] * 4 * H * W

    j = 0
    while j < PI2:
        j += SPEED_I
        i = 0

        while i < PI2:
            i += SPEED_J

            sa, sb, sc, sd, ca, cb, cc, cd = (
                *map(sin, (a, b, i, j)), *map(cos, (a, b, i, j))
            )
            e, f = 1/(sc*(cd+2)*sa+sd*ca+5), sc*(cd+2)*ca-sd*sa

            index = int(
                (x := int(W/2+30*e*(cc*(cd+2)*cb-f*sb)))
                + W * (y := int(H/2+15*e*(cc*(cd+2)*sb+f*cb)))
            )
            if 0 < y < H and 0 < x < W and _grid[index] < e:
                z = int(8*((sd*sa-sc*cd*ca)*cb-sc*cd*sa-sd*ca-cc*cd*sb))

                _grid[index] = e  # type: ignore
                grid[index] = CHARS[max(z, 0)]

    print(calculate_screen(grid))

    a += SPEED_A
    b += SPEED_B
```
```clj
(var W 80 H 25
     chars ".,-~:;=!*#$@"
     PI2 (* 2 PI)
     speed-A .05 speed-B .05 speed-I .05 speed-J .05
     a 0 b 0)

(function calculate-screen screen
  (str
    "\33[2J"    ; Clear screen
    "\33[H"     ; Move cursor to top left
    "\33[?25l"  ; Hide cursor
    (join "\n" (map (.. str) (partition W screen)))))

(while true
  (let grid  (times (* H W) " ")
       _grid (times (* H W) 0)
       j 0)
  (while (< j PI2)
    (let j (+ j speed-I) i 0)
    (while (< i PI2)
      (let i (+ i speed-I)
           [sa sb sc sd] (map sin [a b i j])
           [ca cb cc cd] (map cos [a b i j])
           cd+2 (+ cd 2)
           e (/ 1 (+ (* sc cd+2 sa) (* sd ca) 5))
           f (- (* sc cd+2 ca) (* sd sa))
           x (floor (+ (/ W 2) (* 30 e (- (* cc cd+2 cb) (* f sb)))))
           y (floor (+ (/ H 2) (* 15 e (+ (* cc cd+2 sb) (* f cb)))))
           index (+ x (* W y)))
      (when (and (< 0 y H) (< 0 x W) (< (index _grid) e))
        (let z (floor (* 8 (- (* (- (* sd sa) (* sc cd ca)) cb)
                              (* sc cd sa)
                              (* sd ca)
                              (* cc cd sb)))))
        (var _grid (set-at [index] e _grid)
             grid  (set-at [index] ((max z 0) chars) grid)))))
  (print (calculate-screen grid))
  (var a (+ a speed-A) b (+ b speed-B)))
```
