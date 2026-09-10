const FUSO = "America/Sao_Paulo";

export type Componentes = { dia: number; mes: number; ano: number };

// Retorna a data de hoje no fuso do Brasil no formato dd/mm/aaaa
export function hojeSP(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

// Extrai { dia, mes, ano } de uma string dd/mm/aaaa (formato que sempre
// vem do cliente, nunca é célula de planilha)
export function componentesDe(valor: string): Componentes {
  const p = valor.split("/");
  return { dia: parseInt(p[0]), mes: parseInt(p[1]), ano: parseInt(p[2]) };
}

// Extrai { dia, mes, ano } de uma CÉLULA de planilha, que pode vir como
// texto "dd/mm/aaaa" OU como número serial de data do Google Sheets — com
// valueRenderOption "UNFORMATTED_VALUE", uma célula digitada como data é
// convertida pelo Sheets num número de dias desde 30/12/1899, não fica
// como texto.
export function componentesDaCelula(cell: unknown): Componentes | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") {
    const EPOCH_SHEETS = Date.UTC(1899, 11, 30);
    const d = new Date(EPOCH_SHEETS + cell * 86400000);
    return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() };
  }
  const s = String(cell).trim();
  if (!s.includes("/")) return null;
  const p = s.split("/");
  if (p.length !== 3) return null;
  const dia = parseInt(p[0], 10);
  const mes = parseInt(p[1], 10);
  const ano = parseInt(p[2], 10);
  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
  return { dia, mes, ano };
}

export function mesmaData(cell: unknown, alvo: Componentes): boolean {
  const c = componentesDaCelula(cell);
  if (!c) return false;
  return c.dia === alvo.dia && c.mes === alvo.mes && (c.ano === alvo.ano || c.ano === alvo.ano % 100);
}

// Acha { headerRow, colData, colNome, colUser, colStatus } no BANCO_DE_DADOS,
// tolerando variação de nome de coluna (mesma heurística usada em /api/registro
// e /api/influencers — extraída pra um lugar só pra não desviar entre si).
export function acharColunasBanco(bancoRows: unknown[][]) {
  let headerRow = 0;
  let colData = 0, colNome = 1, colUser = 2, colStatus = 3;
  for (let r = 0; r < Math.min(bancoRows.length, 5); r++) {
    const row = (bancoRows[r] || []).map((c: unknown) => String(c || "").toLowerCase());
    if (row.some((c: string) => c.includes("influenciador") || c.includes("nome"))) {
      headerRow = r;
      row.forEach((c: string, i: number) => {
        if (c.includes("data")) colData = i;
        if (c.includes("influenciador") || c.includes("nome")) colNome = i;
        if (c.includes("user") || c.includes("username") || c.includes("@")) colUser = i;
        if (c.includes("status")) colStatus = i;
      });
      break;
    }
  }
  return { headerRow, colData, colNome, colUser, colStatus };
}
