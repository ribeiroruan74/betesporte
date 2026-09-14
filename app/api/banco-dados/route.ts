import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";
import { normalizarDataCelula, acharColunasBanco } from "@/lib/sheet-dates";

export async function GET() {
  try {
    // UNFORMATTED_VALUE (não FORMATTED_VALUE) porque a coluna de data pode
    // estar formatada como data de verdade na planilha — nesse caso
    // FORMATTED_VALUE devolve o texto exibido, que pode variar (ex.:
    // "9/9/2026" sem zero à esquerda) dependendo da formatação da célula,
    // e todo o resto do app compara essa data como string exata contra um
    // "dd/mm/aaaa" sempre zero-padded. normalizarDataCelula() garante que
    // a data sempre sai daqui no mesmo formato, não importa como a
    // planilha guarda a célula.
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A:D",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values || [];
    const { headerRow, colData, colNome, colUser, colStatus } = acharColunasBanco(rows);

    const registros = rows
      .slice(headerRow + 1)
      .filter((row) => row[colNome] && row[colNome].toString().trim() !== "")
      .map((row) => ({
        data: normalizarDataCelula(row[colData]),
        nome: row[colNome]?.toString().trim() || "",
        username: row[colUser]?.toString().trim() || "",
        status: row[colStatus]?.toString().trim() || "",
      }));

    return NextResponse.json({ registros });
  } catch (error) {
    console.error("Erro ao ler BANCO_DE_DADOS:", error);
    return NextResponse.json({ error: "Falha ao ler o banco de dados" }, { status: 500 });
  }
}
