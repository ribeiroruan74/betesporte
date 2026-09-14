import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";
import { hojeSP, componentesDe, mesmaData, acharColunasBanco } from "@/lib/sheet-dates";

export async function POST(req: Request) {
  try {
    const { name, status, date } = await req.json();
    if (!name || !status) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    // `date` (opcional, formato dd/mm/aaaa) permite editar/corrigir um dia
    // anterior em vez de sempre gravar em "hoje".
    const dataAlvo: string = typeof date === "string" && date.trim() ? date.trim() : hojeSP();
    const componentesAlvo = componentesDe(dataAlvo);

    // ===== 1. Lê ACOMPANHAMENTO (best-effort) =====
    // ACOMPANHAMENTO tem só UMA coluna de data "atual" (mantida manualmente
    // fora deste app) — se ela não bater com a data alvo, statusCol fica -1
    // e esse espelhamento é simplesmente pulado. O BANCO_DE_DADOS (passo 2)
    // é a fonte de verdade real e sempre é atualizado.
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
        if (mesmaData(rows[r][c], componentesAlvo)) { statusCol = c; dataRow = r; break; }
      }
      if (statusCol >= 0) break;
    }

    let rowIndex = -1;
    if (statusCol >= 0) {
      for (let r = dataRow + 1; r < rows.length; r++) {
        if ((rows[r][0] || "").toString().trim() === name) { rowIndex = r; break; }
      }
    }

    if (statusCol >= 0 && rowIndex >= 0) {
      const colLetter = String.fromCharCode(65 + statusCol);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `ACOMPANHAMENTO!${colLetter}${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[status]] },
      });
    }

    // ===== 2. Salva/atualiza no BANCO_DE_DADOS (fonte de verdade) =====
    const bancoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A:D",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const bancoRows = bancoRes.data.values || [];
    const { headerRow, colData, colNome, colUser, colStatus } = acharColunasBanco(bancoRows);

    // @username: pega da ACOMPANHAMENTO se achou a linha, senão de uma
    // entrega anterior já gravada no BANCO_DE_DADOS pra esse nome.
    let username = rowIndex >= 0 ? (rows[rowIndex][1] || "").toString().trim() : "";
    if (!username) {
      const existente = bancoRows.slice(headerRow + 1).find((r) => String(r[colNome] || "").trim() === name);
      username = existente ? String(existente[colUser] || "").trim() : "";
    }

    let existingRow = -1;
    for (let r = headerRow + 1; r < bancoRows.length; r++) {
      const row = bancoRows[r] || [];
      const n = String(row[colNome] || "").trim();
      if (n === name && mesmaData(row[colData], componentesAlvo)) { existingRow = r; break; }
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
      values[colData] = dataAlvo;
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
