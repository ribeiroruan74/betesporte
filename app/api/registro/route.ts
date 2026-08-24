import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";

const FUSO = "America/Sao_Paulo";

// Retorna a data de hoje no fuso do Brasil no formato dd/mm/aaaa
function hojeSP() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

// Retorna os componentes (dia, mes, ano) de hoje no fuso do Brasil
function hojeComponentes() {
  const p = hojeSP().split("/");
  return { dia: parseInt(p[0]), mes: parseInt(p[1]), ano: parseInt(p[2]) };
}

function sameDate(cell: unknown) {
  if (!cell) return false;
  const s = String(cell).trim();
  if (!s.includes("/")) return false;
  const p = s.split("/");
  const dia = parseInt(p[0]);
  const mes = parseInt(p[1]);
  const ano = parseInt(p[2]);
  const h = hojeComponentes();
  return dia === h.dia && mes === h.mes && (ano === h.ano || ano === h.ano % 100);
}

export async function POST(req: Request) {
  try {
    const { name, status } = await req.json();
    if (!name || !status) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // ===== 1. Lê ACOMPANHAMENTO para achar coluna de hoje e o @username =====
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

    let rowIndex = -1;
    let username = "";
    for (let r = dataRow + 1; r < rows.length; r++) {
      if ((rows[r][0] || "").toString().trim() === name) {
        rowIndex = r;
        username = (rows[r][1] || "").toString().trim() || "";
        break;
      }
    }

    // ===== 2. Salva no ACOMPANHAMENTO (coluna de hoje) =====
    if (statusCol >= 0 && rowIndex >= 0) {
      const colLetter = String.fromCharCode(65 + statusCol);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `ACOMPANHAMENTO!${colLetter}${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[status]] },
      });
    }

    // ===== 3. Salva/atualiza no BANCO_DE_DADOS (com a data correta do Brasil) =====
    const hoje = hojeSP();
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

    let existingRow = -1;
    for (let r = headerRow + 1; r < bancoRows.length; r++) {
      const row = bancoRows[r] || [];
      const d = String(row[colData] || "").trim();
      const n = String(row[colNome] || "").trim();
      if (d === hoje && n === name) { existingRow = r; break; }
    }

    if (existingRow >= 0) {
      const colLetter = String.fromCharCode(65 + colStatus);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `BANCO_DE_DADOS!${colLetter}${existingRow + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[status]] },
      });
    } else {
      const maxCol = Math.max(colData, colNome, colUser, colStatus);
      const values: string[] = [];
      for (let i = 0; i <= maxCol; i++) values.push("");
      values[colData] = hoje;
      values[colNome] = name;
      values[colUser] = username;
      values[colStatus] = status;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `BANCO_DE_DADOS!A${headerRow + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao salvar registro:", error);
    return NextResponse.json({ error: "Falha ao salvar o registro" }, { status: 500 });
  }
}