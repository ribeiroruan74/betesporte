import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";

function normalizeStatus(raw: string): string {
  const s = (raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("storylink")) return "story-link";
  if (s.includes("storysemlink")) return "story-sem-link";
  if (s.includes("branding")) return "branding";
  if (s.includes("feedreels") || s.includes("reels")) return "feed-reels";
  if (s.includes("naopostou")) return "nao-postou";
  return "";
}

function sameDate(cell: unknown, target: Date): boolean {
  if (cell instanceof Date) {
    return cell.getDate() === target.getDate() && cell.getMonth() === target.getMonth() && cell.getFullYear() === target.getFullYear();
  }
  if (typeof cell === "number") {
    const d = new Date(1899, 11, 30 + Math.round(cell));
    return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
  }
  const digits = String(cell || "").match(/\d+/g)?.map(Number) || [];
  if (digits.length < 3) return false;
  let [a, b, c] = digits.slice(-3);
  if (digits[0] > 1000) { a = digits[2]; b = digits[1]; c = digits[0]; }
  if (c < 100) c += 2000;
  return a === target.getDate() && b === target.getMonth() + 1 && c === target.getFullYear();
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

    // Acha a coluna da data de hoje (na linha do cabeçalho)
    const today = new Date();
    let statusCol = -1;
    for (let c = 0; c < (rows[headerRow] || []).length; c++) {
      if (sameDate(rows[headerRow][c], today)) { statusCol = c; break; }
    }

    // Lista todos os influenciadores (nome na col A, username na col B)
    const influencers = rows
      .slice(headerRow + 1)
      .filter((row) => row[0] && row[0].toString().trim() !== "")
      .map((row, i) => ({
        id: i + 1,
        name: row[0]?.toString().trim() || "",
        username: row[1]?.toString().trim() || "",
        link: row[2]?.toString().trim() || "",
        status: statusCol >= 0 ? normalizeStatus(String(row[statusCol] ?? "")) : "",
      }));

    return NextResponse.json({ influencers });
  } catch (error) {
    console.error("Erro ao ler planilha:", error);
    return NextResponse.json({ error: "Falha ao ler a planilha" }, { status: 500 });
  }
}