import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["out/", "out-test/", "node_modules/", ".vscode-test/"] },
  ...tseslint.configs.recommended,
);
