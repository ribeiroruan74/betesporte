"use client";
import { useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { CopyIcon, MessageCircleIcon, CalendarRangeIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

interface Influenciador {
  id: number;
  name: string;
  username: string;
  status?: string;
  link?: string;
}

interface Registro {
  data: string;
  nome: string;
  username: string;
  status: string;
}

function normaliza(s: string) {
  return (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]/g, "");
}

function contaComoPostou(status: string) {
  const n = normaliza(status);
  return n === "story+link" || n === "storysemlink" || n === "feedreels";
}

function statusLabel(status: string) {
  const n = normaliza(status);
  if (n === "story+link") return "Story + Link";
  if (n === "storysemlink") return "Story Sem Link";
  if (n === "branding") return "Branding";
  if (n === "feedreels") return "Feed/Reels";
  return "Não Postou";
}

function isoParaBR(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function brParaISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  return `${p[2]}-${p[1]}-${p[0]}`;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasAtrasISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gerarMensagem(
  inf: Influenciador,
  registros: Registro[],
  deISO: string,
  ateISO: string
): string {
  const deBR = isoParaBR(deISO);
  const ateBR = isoParaBR(ateISO);

  const porData = new Map<string, string>();
  registros
    .filter((r) => r.nome === inf.name)
    .forEach((r) => porData.set(r.data, r.status));

  const linhas: string[] = [];
  let entregas = 0;

  const inicio = new Date(deISO + "T12:00:00");
  const fim = new Date(ateISO + "T12:00:00");
  let idx = 1;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const br = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const status = porData.get(br) || "";
    const postou = contaComoPostou(status);
    if (postou) entregas++;
    const simbolo = postou ? "✅" : "❌";
    linhas.push(`${idx}. ${simbolo} ${br} — ${statusLabel(status)}`);
    idx++;
  }

  const totalDias = idx - 1;
  const diasSem = totalDias - entregas;

  return [
    "📲 *COBRANÇA DE POSTAGENS*",
    "━━━━━━━━━━━━━━━━━━━━",
    `👤 *Influenciador:* ${inf.name}`,
    `📅 *Período:* ${deBR} a ${ateBR}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `✅ *Entregas confirmadas:* ${entregas}`,
    `❌ *Dias sem postar:* ${diasSem}`,
    "━━━━━━━━━━━━━━━━━━━━",
    "*Status por dia:*",
    ...linhas,
    "Qualquer dúvida, me avise. Obrigado! 🙏",
  ].join("\n");
}

export function GeradorCobranca({
  influenciador,
  registros,
}: {
  influenciador: Influenciador;
  registros: Registro[];
}) {
  const { mostrar } = useToast();
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(diasAtrasISO(6));
  const [ate, setAte] = useState(hojeISO());
  const [texto, setTexto] = useState("");
  const [gerado, setGerado] = useState(false);

  const mensagem = useMemo(
    () => (gerado && de && ate ? gerarMensagem(influenciador, registros, de, ate) : ""),
    [influenciador, registros, de, ate, gerado]
  );

  function gerar() {
    if (!de || !ate) {
      mostrar("Informe as datas inicial e final", "error");
      return;
    }
    if (de > ate) {
      mostrar("A data inicial não pode ser depois da final", "error");
      return;
    }
    setGerado(true);
    setTexto(gerarMensagem(influenciador, registros, de, ate));
    mostrar("Mensagem gerada");
  }

  async function copiar() {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      mostrar("Mensagem copiada para a área de transferência");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      mostrar("Mensagem copiada");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-white/40 p-3">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <CalendarRangeIcon className="h-4 w-4 text-primary" />
          Cobrança personalizada
        </span>
        {aberto ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
      </button>

      {aberto && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <input
                type="date"
                value={de}
                onChange={(e) => { setDe(e.target.value); setGerado(false); }}
                className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => { setAte(e.target.value); setGerado(false); }}
                className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={gerar}
            className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Gerar mensagem
          </button>

          {texto && (
            <div className="mt-3">
              <textarea
                readOnly
                value={texto}
                rows={10}
                className="w-full resize-y rounded-lg border border-border bg-white/70 px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:border-primary"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={copiar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <CopyIcon className="h-4 w-4" />
                  Copiar
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2.5 text-sm font-semibold text-white"
                >
                  <MessageCircleIcon className="h-4 w-4" />
                  Abrir WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}