Insitux
```clj
(function frequencies list
  (reduce #(push % %1 (inc (or (% %1) 0))) list {}))
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