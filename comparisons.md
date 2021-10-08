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
(function palindrome? text
  (.. and (map = text (reverse text))))
```
TypeScript
```ts
const isPalindrome = text =>
  text.reverse().reduce((acc, ch, i) => acc && ch == text[i], true);
```