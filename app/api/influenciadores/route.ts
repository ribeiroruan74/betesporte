import { NextResponse } from "next/server";
import { sheets, SPREADSHEET_ID } from "@/lib/sheets";

async function lerLinhas() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "ACOMPANHAMENTO!A1:C100",
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return res.data.values || [];
}

function acharHeader(rows: string[][]) {
  for (let r = 0; r < Math.min(rows.length, 3); r++) {
    const first = String(rows[r][0] || "").toLowerCase();
    if (first.includes("influenciador") || first.includes("nome") || first.includes("nº")) return r;
  }
  return 0;
}

export async function GET() {
  try {
    const rows = await lerLinhas();
    const headerRow = acharHeader(rows);
    const lista = rows
      .slice(headerRow + 1)
      .map((row, i) => ({
        linha: headerRow + 2 + i,
        nome: String(row[0] || "").trim(),
        username: String(row[1] || "").trim(),
        link: String(row[2] || "").trim(),
      }))
      .filter((x) => x.nome !== "");
    return NextResponse.json({ influenciadores: lista });
  } catch (error) {
    console.error("Erro ao ler influenciadores:", error);
    return NextResponse.json({ error: "Falha ao ler influenciadores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nome = String(body.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const rows = await lerLinhas();
    const headerRow = acharHeader(rows);
    let linha = -1;
    for (let r = headerRow + 1; r < rows.length; r++) {
      if (!String(rows[r][0] || "").trim()) { linha = r; break; }
    }
    if (linha < 0) linha = Math.max(rows.length, headerRow + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `ACOMPANHAMENTO!A${linha + 1}:C${linha + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nome, String(body.username || "").trim(), String(body.link || "").trim()]] },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao adicionar:", error);
    return NextResponse.json({ error: "Falha ao adicionar" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const nomeAtual = String(body.nome || "").trim();
    if (!nomeAtual) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const rows = await lerLinhas();
    const headerRow = acharHeader(rows);
    let linha = -1;
    for (let r = headerRow + 1; r < rows.length; r++) {
      if (String(rows[r][0] || "").trim() === nomeAtual) { linha = r; break; }
    }
    if (linha < 0) return NextResponse.json({ error: "Influenciador não encontrado" }, { status: 404 });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `ACOMPANHAMENTO!A${linha + 1}:C${linha + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[String(body.novoNome ?? body.nome).trim(), String(body.username || "").trim(), String(body.link || "").trim()]] },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const nome = String(body.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const rows = await lerLinhas();
    const headerRow = acharHeader(rows);
    let linha = -1;
    for (let r = headerRow + 1; r < rows.length; r++) {
      if (String(rows[r][0] || "").trim() === nome) { linha = r; break; }
    }
    if (linha < 0) return NextResponse.json({ error: "Influenciador não encontrado" }, { status: 404 });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `ACOMPANHAMENTO!A${linha + 1}:C${linha + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["", "", ""]] },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover:", error);
    return NextResponse.json({ error: "Falha ao remover" }, { status: 500 });
  }
}