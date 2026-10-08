// Minimal stand-in for the `vscode` module, used only by unit tests. Tests set `mockState` to drive it.
export const mockState = {
  config: {} as Record<string, unknown>,
  warnings: [] as string[],
  errors: [] as string[],
  externalize: (u: string) => u,
};

export const Uri = { parse: (s: string) => ({ s, toString: () => s }) };

export const env = {
  asExternalUri: async (u: { s: string }) => {
    const out = mockState.externalize(u.s);
    return { toString: () => out };
  },
};

export const StatusBarAlignment = { Left: 1, Right: 2 };

export const items: { text: string; tooltip?: string; command?: string; shown: boolean; disposed: boolean }[] = [];

export const window = {
  createStatusBarItem: () => {
    const it = { text: "", tooltip: undefined, command: undefined, shown: false, disposed: false } as (typeof items)[number] & {
      show(): void;
      dispose(): void;
    };
    it.show = () => void (it.shown = true);
    it.dispose = () => void (it.disposed = true);
    items.push(it);
    return it;
  },
  showWarningMessage: async (m: string) => void mockState.warnings.push(m),
  showErrorMessage: async (m: string) => void mockState.errors.push(m),
};

export const workspace = {
  getConfiguration: (section: string) => ({
    get: <T>(key: string, def: T): T => {
      const k = `${section}.${key}`;
      return (k in mockState.config ? mockState.config[k] : def) as T;
    },
  }),
};

export const commands = {};
