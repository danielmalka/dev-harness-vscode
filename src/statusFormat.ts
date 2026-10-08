/** Status bar text from a GET /api/state response (R8). Pure; no vscode import. */

export const DOWN_TEXT = "dh · dashboard parado";

/** avatar.state ids (jevmon) to pt-br labels; an unknown id is shown raw. */
const LABELS: Record<string, string> = {
  esperando: "esperando você",
  erro: "erro",
  trabalhando: "trabalhando",
  concluido: "concluído",
  atencao: "atenção",
  parado: "parado",
};

export interface StatusView {
  text: string;
  tooltip: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function pct(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}%` : "sem dado";
}

function age(sec: unknown): string {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0) return "idade desconhecida";
  if (sec < 60) return `há ${Math.round(sec)} s`;
  if (sec < 3600) return `há ${Math.round(sec / 60)} min`;
  return `há ${Math.round(sec / 3600)} h`;
}

/** Returns undefined when the response lacks avatar.state (caller shows DOWN_TEXT). */
export function formatStatus(raw: unknown): StatusView | undefined {
  if (!isObj(raw) || !isObj(raw.avatar) || typeof raw.avatar.state !== "string" || raw.avatar.state === "") return undefined;
  const id = raw.avatar.state;
  const label = LABELS[id] ?? id;
  const l = isObj(raw.limits) ? raw.limits : {};
  const ok = l.ok === true; // ponytail: limits.ok false means the numbers are not trustworthy
  const five = ok ? l.five_hour : undefined;
  const week = ok ? l.seven_day : undefined;
  return {
    text: `dh · ${label} · 5h ${pct(five)} · sem ${pct(week)}`,
    tooltip: `Dev Harness: ${label}\nLimite 5h: ${pct(five)} (${age(l.five_hour_age_sec)})\nLimite semana: ${pct(week)} (${age(l.seven_day_age_sec)})`,
  };
}
