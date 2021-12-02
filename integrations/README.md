### Integrating Insitux into Roblox games

Include https://github.com/insitux/rbxts-Insitux into your roblox-ts project.

Next is up to you. `index.ts`'s `invoke()` must be supplied with a context you implement, and per invocation given a unique/randomised/incremented sourceId. You can add operations to Insitux with the `addOperation` method.  
Further explanation can be found in the docstring of most functions and types like `invoke`, `Ctx`, `symbols`, etc.

If anybody could improve this guide please make a PR!