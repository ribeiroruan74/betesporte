export type StatusType =
  | "story-link"
  | "story-sem-link"
  | "branding"
  | "feed-reels"
  | "nao-postou";

export const STATUS_CONFIG: Record<
  StatusType,
  { label: string; color: string; icon: string }
> = {
  "story-link": { label: "Story + Link", color: "#75CEFF", icon: "🔗" },
  "story-sem-link": { label: "Story Sem Link", color: "#5AC8FA", icon: "📱" },
  branding: { label: "Branding", color: "#AF52DE", icon: "✨" },
  "feed-reels": { label: "Feed / Reels", color: "#FF9500", icon: "🎬" },
  "nao-postou": { label: "Não Postou", color: "#FF3B30", icon: "🚫" },
};

// Texto EXATO que o site grava na planilha
export const STATUS_TO_SHEET: Record<StatusType, string> = {
  "story-link": "Story + Link",
  "story-sem-link": "Story Sem Link",
  branding: "Branding",
  "feed-reels": "Feed / Reels",
  "nao-postou": "Não Postou",
};

export function normalizaTexto(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Um dia de registro pode conter mais de uma entrega (ex.: influenciador posta
 * Story + Link E Feed/Reels no mesmo dia). O site salva isso como um único
 * texto combinado ("Feed / Reels / Story + Link"). Esta função quebra esse
 * texto em cada StatusType individual que ele contém, para permitir contar e
 * filtrar feed/reels separado de story+link mesmo quando foram postados
 * juntos no mesmo dia.
 */
export function parseFormatos(statusRaw: string): StatusType[] {
  const n = normalizaTexto(statusRaw);
  if (!n) return [];

  const encontrados: StatusType[] = [];
  // "Story Sem Link" precisa ser checado antes de "story" genérico
  if (n.includes("story") && n.includes("sem") && n.includes("link")) {
    encontrados.push("story-sem-link");
  } else if (n.includes("story") && n.includes("link")) {
    encontrados.push("story-link");
  } else if (n.includes("story")) {
    encontrados.push("story-sem-link");
  }
  if (n.includes("branding")) encontrados.push("branding");
  if (n.includes("feed") || n.includes("reels")) encontrados.push("feed-reels");

  if (encontrados.length > 0) return encontrados;
  if (n.includes("nao") || n.includes("pendente")) return ["nao-postou"];
  return [];
}

/** true se o registro do dia conta como "postou" (tem alguma entrega válida) */
export function contaComoPostou(statusRaw: string): boolean {
  const formatos = parseFormatos(statusRaw);
  return formatos.length > 0 && !formatos.includes("nao-postou");
}

// Lista de exemplo (usada só enquanto a API não está conectada)
export const influencers = [
  { id: 1, name: "Ana Souza", username: "@anasouza" },
  { id: 2, name: "Bruno Lima", username: "@brunolima" },
  { id: 3, name: "Carla Mendes", username: "@carlamendes" },
  { id: 4, name: "Diego Rocha", username: "@diegorocha" },
  { id: 5, name: "Eduarda Pires", username: "@eduardapires" },
  { id: 6, name: "Felipe Costa", username: "@felipcosta" },
  { id: 7, name: "Gabriela Nunes", username: "@gabnunes" },
  { id: 8, name: "Henrique Alves", username: "@henriquealves" },
  { id: 9, name: "Isabela Rocha", username: "@isarocha" },
  { id: 10, name: "João Pedro", username: "@joaopedro" },
  { id: 11, name: "Larissa Faria", username: "@larifaria" },
  { id: 12, name: "Marcos Vinícius", username: "@marcosvini" },
];