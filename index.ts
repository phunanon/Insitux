import { Test } from "./test";
import { Parse } from "./parse";

export function invoke(
  ctx: {
    set: (key: string, val: ExternalTypes) => ExternalError;
    get: (key: string) => ValAndErr;
    exe: (name: Functions, args: ExternalTypes[]) => ValAndErr;
  },
  code: string
): InvokeError[] {
  const ast = Parse.parse(code);
  //console.log(ast);
  const { set, get, exe } = ctx;
  {
    set("folder/blah", "hello");
  }
  {
    const { value, error } = get("folder/blah");
  }
  {
    const { value, error } = exe("util.fire_projectile", [[0, 0, 0], [0, 1, 0], "M4A1"]);
    exe("admin.ban", ["BIackShibe", "Being gay, that is a sin", 1280]);
  }
  return [];
}

Test.perform();