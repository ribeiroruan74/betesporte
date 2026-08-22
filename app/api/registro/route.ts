import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";
import { STATUS_TO_SHEET, type StatusType } from "@/lib/influencers";

function sameDate(cell: unknown, target: Date): boolean {
  if (cell instanceof Date) {
    return (
      cell.getDate() === target.getDate() &&
      cell.getMonth() === target.getMonth() &&
      cell.getFullYear() === target.getFullYear()
    );
  }
  if (typeof cell === "number") {
    const d = new Date(1899, 11, 30 + Math.round(cell));
    return (
      d.getDate() === target.getDate() &&
      d.getMonth() === target.getMonth() &&
      d.getFullYear() === target.getFullYear()
    );
  }
  const digits = String(cell || "").match(/\d+/g)?.map(Number) || [];
  if (digits.length < 3) return false;
  let [a, b, c] = digits.slice(-3);
  if (digits[0] > 1000) {
    a = digits[2]; b = digits[1]; c = digits[0];
  }
  if (c < 100) c += 2000;
  return a === target.getDate() && b === target.getMonth() + 1 && c === target.getFullYear();
}

export async function POST(req: Request) {
  try {
    const { name, status } = await req.json();
    if (!name || !status || !STATUS_TO_SHEET[status as StatusType]) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "ACOMPANHAMENTO!A1:Z100",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values || [];

    // Acha a coluna da data de hoje
    const today = new Date();
    let statusCol = -1;
    let dataRow = 1;
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < (rows[r] || []).length; c++) {
        if (sameDate(rows[r][c], today)) { statusCol = c; dataRow = r; break; }
      }
      if (statusCol >= 0) break;
    }
    if (statusCol < 0) {
      return NextResponse.json({ error: "Data de hoje não encontrada na planilha" }, { status: 404 });
    }

    // Acha a linha do influenciador pelo nome
    let rowIndex = -1;
    for (let r = dataRow + 1; r < rows.length; r++) {
      if ((rows[r][0] || "").toString().trim() === name) { rowIndex = r; break; }
    }
    if (rowIndex < 0) {
      return NextResponse.json({ error: "Influenciador não encontrado" }, { status: 404 });
    }

    const colLetter = String.fromCharCode(65 + statusCol);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `ACOMPANHAMENTO!${colLetter}${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[STATUS_TO_SHEET[status as StatusType]]] },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao salvar status:", error);
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
}