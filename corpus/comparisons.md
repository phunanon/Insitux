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
