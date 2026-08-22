import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";

export async function GET() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "BANCO_DE_DADOS!A1:D2000",
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = res.data.values || [];

    let headerRow = 0;
    let colData = 0, colNome = 1, colUser = 2, colStatus = 3;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = (rows[r] || []).map((c: unknown) => String(c || "").toLowerCase());
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

    const registros = rows
      .slice(headerRow + 1)
      .filter((row) => row[colNome] && row[colNome].toString().trim() !== "")
      .map((row) => ({
        data: row[colData]?.toString().trim() || "",
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