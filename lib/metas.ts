export interface MetaSemanal {
  storiesSemana: number;
  feedSemana: number;
}

export type MetasPorInfluenciador = Record<string, MetaSemanal>;

export const METAS_STORAGE_KEY = "betesporte_metas";

export const META_PADRAO: MetaSemanal = { storiesSemana: 0, feedSemana: 0 };

export function lerMetas(): MetasPorInfluenciador {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(METAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function salvarMetas(metas: MetasPorInfluenciador) {
  try {
    localStorage.setItem(METAS_STORAGE_KEY, JSON.stringify(metas));
  } catch {
    // localStorage indisponível/cheio — ignora
  }
}

export function metaDe(metas: MetasPorInfluenciador, nome: string): MetaSemanal {
  return metas[nome] || META_PADRAO;
}
