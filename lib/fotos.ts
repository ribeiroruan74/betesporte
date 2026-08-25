export type FotosPorInfluenciador = Record<string, string>;

export const FOTOS_STORAGE_KEY = "betesporte_fotos";

export function lerFotos(): FotosPorInfluenciador {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FOTOS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function salvarFotos(fotos: FotosPorInfluenciador) {
  try {
    localStorage.setItem(FOTOS_STORAGE_KEY, JSON.stringify(fotos));
  } catch {
    // localStorage indisponível/cheio — ignora
  }
}
