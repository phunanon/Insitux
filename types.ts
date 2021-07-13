type ExternalError = null | string;
type InvokeError = `Bad expression: line ${number}: ${string}` | "I just don't like you.";

type Vec3 = [number, number, number];
type ExternalTypes = null | string | number | boolean | Vec3;

type ValAndErr = { value: ExternalTypes; error: ExternalError };

type Functions = "print" | string;
