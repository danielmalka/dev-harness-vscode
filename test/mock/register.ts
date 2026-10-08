// Resolves `require("vscode")` to the mock in unit tests only.
import Module from "node:module";
import path from "node:path";

const mock = path.join(__dirname, "vscode.js");
const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const original = m._resolveFilename;
m._resolveFilename = (request, ...rest) => (request === "vscode" ? mock : original(request, ...rest));
