// vitrificar.mjs — aplica glass-card em todos os cards do projeto
// Uso: node vitrificar.mjs   (rode a partir da raiz do projeto)

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const RAIZ = process.cwd();
const PASTAS = ["app", "components"];
const EXTENSOES = [".tsx", ".ts", ".jsx", ".js"];

function listarArquivos(pasta) {
  let arquivos = [];
  for (const item of readdirSync(pasta)) {
    const caminho = join(pasta, item);
    if (statSync(caminho).isDirectory()) {
      arquivos = arquivos.concat(listarArquivos(caminho));
    } else if (EXTENSOES.includes(extname(item))) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

let alterados = 0;

for (const pasta of PASTAS) {
  for (const arquivo of listarArquivos(join(RAIZ, pasta))) {
    const original = readFileSync(arquivo, "utf8");
    let conteudo = original;

    // 1) Padrão completo: borda do tema + fundo do card -> vidro (remove a borda duplicada)
    conteudo = conteudo.replace(/border\s+border-border\s+bg-card/g, "glass-card");
    // 2) bg-card isolado -> vidro (ignora bg-card-foreground e bg-card/50)
    conteudo = conteudo.replace(/bg-card(?![-\w/])/g, "glass-card");

    if (conteudo !== original) {
      writeFileSync(arquivo, conteudo);
      alterados++;
      console.log("✓", arquivo.replace(RAIZ + "/", ""));
    }
  }
}

console.log(`\n${alterados} arquivo(s) alterado(s).`);
if (alterados > 0) {
  console.log("Agora reinicie o servidor: Ctrl + C e depois npm run dev");
}