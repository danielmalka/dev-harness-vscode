// Minimal stand-in for the `vscode` module, used only by unit tests. Tests set `mockState` to drive it.
export const mockState = {
  config: {} as Record<string, unknown>,
  warnings: [] as string[],
  errors: [] as string[],
  externalize: (u: string) => u,
  workspaceFolders: undefined as { uri: { scheme: string; fsPath: string } }[] | undefined,
  /** Answers for successive showQuickPick calls: a function picks from the items; undefined cancels. */
  picks: [] as (((items: unknown[]) => unknown) | undefined)[],
  pickItems: [] as unknown[][],
  warningAnswer: undefined as string | undefined,
  executed: [] as unknown[][],
  /** Every terminal-side call, in order: createTerminal, show, sendText. */
  terminalLog: [] as unknown[],
  /** When true, a created terminal reports shell integration on the next tick. */
  shellIntegrationFires: false,
  /** The last terminal created, so a test can mark it closed (exitStatus). */
  lastTerminal: undefined as undefined | { exitStatus?: { code: number } },
};

const integrationListeners = new Set<(e: { terminal: unknown }) => void>();

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
  showWarningMessage: async (m: string) => (mockState.warnings.push(m), mockState.warningAnswer),
  showQuickPick: async (items: unknown[]) => {
    mockState.pickItems.push(items);
    const pick = mockState.picks.shift();
    return pick ? pick(items) : undefined;
  },
  createTerminal: (opts: unknown) => {
    mockState.terminalLog.push(["createTerminal", opts]);
    const term: { shellIntegration: undefined; exitStatus?: { code: number }; show: () => void; sendText: (t: string, n?: boolean) => void } = {
      shellIntegration: undefined,
      show: () => void mockState.terminalLog.push(["show"]),
      sendText: (text: string, addNewLine?: boolean) => void mockState.terminalLog.push(["sendText", text, addNewLine]),
    };
    mockState.lastTerminal = term;
    if (mockState.shellIntegrationFires) setImmediate(() => integrationListeners.forEach((l) => l({ terminal: term })));
    return term;
  },
  onDidChangeTerminalShellIntegration: (l: (e: { terminal: unknown }) => void) => {
    integrationListeners.add(l);
    return { dispose: () => void integrationListeners.delete(l) };
  },
  showErrorMessage: async (m: string) => void mockState.errors.push(m),
};

export const workspace = {
  get workspaceFolders() {
    return mockState.workspaceFolders;
  },
  getConfiguration: (section: string) => ({
    get: <T>(key: string, def: T): T => {
      const k = `${section}.${key}`;
      return (k in mockState.config ? mockState.config[k] : def) as T;
    },
  }),
};

export const commands = {
  executeCommand: async (...args: unknown[]) => void mockState.executed.push(args),
};
