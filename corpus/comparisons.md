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
(-> (fn a b (repeat #(char-code (rand-int a b)) 4))
   #(map % [97 65 48 33] [123 91 58 48])
    flatten
    shuffle
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

Insitux
```clj
(.. str (repeat #(char-code (rand-int 33 126)) 16))
```
Python
```py
import string, random
"".join(random.choices(string.printable.strip(), k=16))
```
