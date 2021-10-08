### Integrating Insitux into Roblox games

Include https://github.com/insitux/rbxts-Insitux into your roblox-ts project.

Next is up to you. `index.ts`'s `invoke()` must be supplied with a context you implement, and per invocation given a unique/randomised/incremented invocationId.  
Insitux generally expects you have implemented `print` and `print-str` via `exe: (name: string, args: Val[]) => Promise<ValAndErr>;`.

If anybody could improve this guide please make a PR!