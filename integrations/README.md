### Integrating Insitux into Roblox games

Firstly ensure you've joined [the Discord server](https://discord.gg/w3Fc4YZ9Qw) if you encounter any issues. Insitux isn't compiled against roblox-ts often.

Next, ensure the /src directory is in your project directory, **excluding** `repl.ts` and `invoker.ts` as these are for NodeJS and the web. Though if you manage to get invoker.ts working on roblox-ts please inform us via the Discord server or open a pull-request/issue as it would be helpful for other players too.

Next, replace the contents of `poly-fills.ts` with the contents of [Roblox-ts-poly-fills.ts](https://github.com/phunanon/Insitux/blob/master/integrations/Roblox-ts-poly-fills.ts).

Next is up to you. `index.ts`'s `invoke()` must be supplied with a context you implement, and per invocation given a unique/randomised/incremented invocationId.  
Insitux generally expects you have implemented `print` and `print-str` via `exe: (name: string, args: Val[]) => Promise<ValAndErr>;`.

**Working with Val**

`Val` is a type used throughout Insitux internally. Property `t` informs you of the type of `v`. Make use of `visStr()`, `visNum()`, etc to ensure the correct types. For example:

```ts
const val: Val = {t: "str", v: "hello"};
if (visStr(val)) {
  //Here v is understood to be a string, not unknown
}
```