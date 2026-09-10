import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";
import { hojeSP, componentesDe, mesmaData, acharColunasBanco } from "@/lib/sheet-dates";

function normalizeStatus(raw: string): string {
  const s = (raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("storylink")) return "story-link";
  if (s.includes("storysemlink")) return "story-sem-link";
  if (s.includes("branding")) return "branding";
  if (s.includes("feedreels") || s.includes("reels")) return "feed-reels";
  if (s.includes("naopostou")) return "nao-postou";
  return "";
}

export async function GET() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "ACOMPANHAMENTO!A1:Z100",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values || [];
    if (rows.length === 0) return NextResponse.json({ influencers: [] });

    // Acha a linha do cabeçalho (onde está "INFLUENCIADOR" ou "NOME")
    let headerRow = 0;
    for (let r = 0; r < Math.min(rows.length, 3); r++) {
      const first = String(rows[r][0] || "").toLowerCase();
      if (first.includes("influenciador") || first.includes("nome") || first.includes("nº")) {
        headerRow = r;
        break;
      }
    }

    // O status de "hoje" vem do BANCO_DE_DADOS (fonte de verdade, sempre
    // atualizada por /api/registro) em vez da coluna "atual" de
    // ACOMPANHAMENTO — essa coluna é mantida manualmente fora deste app e
    // frequentemente fica desatualizada, o que fazia todo mundo aparecer
    // como "ainda não registrado" mesmo já tendo status salvo hoje.
    const hoje = hojeSP();
    const componentesHoje = componentesDe(hoje);
    const bancoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A1:D2000",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const bancoRows = bancoRes.data.values || [];
    const { headerRow: bancoHeaderRow, colData, colNome, colStatus } = acharColunasBanco(bancoRows);

    const statusHojePorNome = new Map<string, string>();
    for (let r = bancoHeaderRow + 1; r < bancoRows.length; r++) {
      const row = bancoRows[r] || [];
      if (!mesmaData(row[colData], componentesHoje)) continue;
      const nome = String(row[colNome] || "").trim();
      if (nome) statusHojePorNome.set(nome, String(row[colStatus] || ""));
    }

    // Lista todos os influenciadores (nome na col A, username na col B)
    const influencers = rows
      .slice(headerRow + 1)
      .filter((row) => row[0] && row[0].toString().trim() !== "")
      .map((row, i) => {
        const name = row[0]?.toString().trim() || "";
        return {
          id: i + 1,
          name,
          username: row[1]?.toString().trim() || "",
          link: row[2]?.toString().trim() || "",
          status: statusHojePorNome.has(name) ? normalizeStatus(statusHojePorNome.get(name)!) : "",
        };
      });

    return NextResponse.json({ influencers });
  } catch (error) {
    console.error("Erro ao ler planilha:", error);
    return NextResponse.json({ error: "Falha ao ler a planilha" }, { status: 500 });
  }
}
