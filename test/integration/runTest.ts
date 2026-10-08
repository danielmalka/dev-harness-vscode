import path from "node:path";
import { runTests } from "@vscode/test-electron";

runTests({
  extensionDevelopmentPath: path.resolve(__dirname, "../../.."),
  extensionTestsPath: path.resolve(__dirname, "index"),
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
