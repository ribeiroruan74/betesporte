import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";
import { hojeSP, componentesDe, mesmaData, acharColunasBanco } from "@/lib/sheet-dates";

export async function POST() {
  try {
    const hoje = hojeSP();
    const componentesHoje = componentesDe(hoje);

    // Lê BANCO_DE_DADOS primeiro — é a fonte de verdade (já atualizada em
    // tempo real por /api/registro a cada status salvo).
    const bancoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A:D",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const bancoRows = bancoRes.data.values || [];
    const { headerRow, colData, colNome, colUser, colStatus } = acharColunasBanco(bancoRows);

    // ===== ACOMPANHAMENTO (best-effort) =====
    // Tem só UMA coluna de data "atual", mantida manualmente fora deste
    // app — se ela não bater com hoje, não tem nada pra espelhar daqui
    // (mas o BANCO_DE_DADOS já está correto de qualquer forma).
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "ACOMPANHAMENTO!A:Z",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values || [];
    let statusCol = -1;
    let dataRow = 1;
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < (rows[r] || []).length; c++) {
        if (mesmaData(rows[r][c], componentesHoje)) { statusCol = c; dataRow = r; break; }
      }
      if (statusCol >= 0) break;
    }

    let salvos = 0;
    if (statusCol >= 0) {
      const updates: { nome: string; username: string; status: string }[] = [];
      for (let r = dataRow + 1; r < rows.length; r++) {
        const nome = String(rows[r][0] || "").trim();
        const status = String(rows[r][statusCol] || "").trim();
        if (!nome || !status) continue;
        updates.push({ nome, username: String(rows[r][1] || "").trim(), status });
      }

      for (const u of updates) {
        let existingRow = -1;
        for (let r = headerRow + 1; r < bancoRows.length; r++) {
          const row = bancoRows[r] || [];
          if (String(row[colNome] || "").trim() === u.nome && mesmaData(row[colData], componentesHoje)) {
            existingRow = r;
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
    } else {
      // Sem coluna de hoje no ACOMPANHAMENTO: conta o que já está salvo
      // no BANCO_DE_DADOS pra hoje (não tem nada pra copiar de novo).
      salvos = bancoRows.slice(headerRow + 1).filter((row) => mesmaData(row[colData], componentesHoje)).length;
    }

    return NextResponse.json({ ok: true, salvos });
  } catch (error) {
    console.error("Erro ao finalizar dia:", error);
    return NextResponse.json({ error: "Falha ao finalizar o dia" }, { status: 500 });
  }
}
