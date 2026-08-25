export type Tema = "sistema" | "claro" | "escuro";

const CHAVE = "betesporte_config";

export function lerTema(): Tema {
  if (typeof window === "undefined") return "sistema";
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return "sistema";
    const p = JSON.parse(raw);
    return p?.preferencias?.tema ?? "sistema";
  } catch {
    return "sistema";
  }
}

export function estaEscuro(tema: Tema): boolean {
  if (typeof window === "undefined") return false;
  if (tema === "escuro") return true;
  if (tema === "claro") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", estaEscuro(tema));
}

export function salvarTema(tema: Tema) {
  try {
    const raw = localStorage.getItem(CHAVE);
    const atual = raw ? JSON.parse(raw) : {};
    const novo = { ...atual, preferencias: { ...(atual.preferencias ?? {}), tema } };
    localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // localStorage indisponível — aplica só na sessão atual
  }
  aplicarTema(tema);
}
