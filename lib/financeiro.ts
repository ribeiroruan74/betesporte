export interface DadosFinanceiros {
  valorPorEntrega: number;
}

export type FinanceiroPorInfluenciador = Record<string, DadosFinanceiros>;

export const FINANCEIRO_STORAGE_KEY = "betesporte_financeiro";

export const FINANCEIRO_PADRAO: DadosFinanceiros = { valorPorEntrega: 0 };

export function lerFinanceiro(): FinanceiroPorInfluenciador {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FINANCEIRO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function salvarFinanceiro(dados: FinanceiroPorInfluenciador) {
  try {
    localStorage.setItem(FINANCEIRO_STORAGE_KEY, JSON.stringify(dados));
  } catch {
    // localStorage indisponível/cheio — ignora
  }
}
