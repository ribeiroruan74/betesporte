import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";

function hojeSP() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function sameDate(cell: unknown) {
  if (!cell) return false;
  const p = String(cell).trim().split("/");
  if (p.length !== 3) return false;
  const hoje = hojeSP().split("/");
  return p[0] === hoje[0] && p[1] === hoje[1] && (p[2] === hoje[2] || p[2] === hoje[2].slice(2));
}

export async function POST() {
  try {
    // Lê ACOMPANHAMENTO e acha a coluna de hoje
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "ACOMPANHAMENTO!A1:Z100",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values || [];
    let statusCol = -1;
    let dataRow = 1;
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < (rows[r] || []).length; c++) {
        if (sameDate(rows[r][c])) { statusCol = c; dataRow = r; break; }
      }
      if (statusCol >= 0) break;
    }
    if (statusCol < 0) {
      return NextResponse.json({ error: "Data de hoje não encontrada no ACOMPANHAMENTO" }, { status: 404 });
    }

    // Lê BANCO_DE_DADOS para localizar cabeçalho e colunas
    const bancoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A1:D2000",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const bancoRows = bancoRes.data.values || [];
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

    const hoje = hojeSP();
    const colLetter = String.fromCharCode(65 + statusCol);
    const updates: { nome: string; username: string; status: string }[] = [];
    for (let r = dataRow + 1; r < rows.length; r++) {
      const nome = String(rows[r][0] || "").trim();
      const status = String(rows[r][statusCol] || "").trim();
      if (!nome || !status) continue;
      updates.push({ nome, username: String(rows[r][1] || "").trim(), status });
    }

    let salvos = 0;
    for (const u of updates) {
      let existingRow = -1;
      for (let r = headerRow + 1; r < bancoRows.length; r++) {
        const row = bancoRows[r] || [];
        if (String(row[colData] || "").trim() === hoje && String(row[colNome] || "").trim() === u.nome) {
          existingRow = r;
          break;
        }
      }
      if (existingRow >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `BANCO_DE_DADOS!${String.fromCharCode(65 + colStatus)}${existingRow + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[u.status]] },
        });
      } else {
        const maxCol = Math.max(colData, colNome, colUser, colStatus);
        const values: string[] = [];
        for (let i = 0; i <= maxCol; i++) values.push("");
        values[colData] = hoje;
        values[colNome] = u.nome;
        values[colUser] = u.username;
        values[colStatus] = u.status;
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `BANCO_DE_DADOS!A${headerRow + 2}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [values] },
        });
      }
      salvos++;
    }

    return NextResponse.json({ ok: true, salvos });
  } catch (error) {
    console.error("Erro ao finalizar dia:", error);
    return NextResponse.json({ error: "Falha ao finalizar o dia" }, { status: 500 });
  }
}