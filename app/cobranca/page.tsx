"use client";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useToast } from "@/components/toast";
import {
  CopyIcon,
  MessageCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarRangeIcon,
  RotateCcwIcon,
} from "lucide-react";

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

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasAtrasISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

interface AnaliseInfluenciador {
  inf: Influenciador;
  entregas: number;
  diasSem: number;
  dias: { br: string; status: string; postou: boolean }[];
}

function analisar(influenciadores: Influenciador[], registros: Registro[], deISO: string, ateISO: string): AnaliseInfluenciador[] {
  const porData = new Map<string, Map<string, string>>();
  registros.forEach((r) => {
    if (!porData.has(r.nome)) porData.set(r.nome, new Map());
    porData.get(r.nome)!.set(r.data, r.status);
  });

  const inicio = new Date(deISO + "T12:00:00");
  const fim = new Date(ateISO + "T12:00:00");
  const datas: string[] = [];
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    datas.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
  }

  return influenciadores.map((inf) => {
    const mapa = porData.get(inf.name) || new Map();
    const dias = datas.map((br) => {
      const status = mapa.get(br) || "";
      const postou = contaComoPostou(status);
      return { br, status, postou };
    });
    const entregas = dias.filter((d) => d.postou).length;
    const diasSem = dias.length - entregas;
    return { inf, entregas, diasSem, dias };
  });
}

function gerarMensagem(a: AnaliseInfluenciador, deBR: string, ateBR: string): string {
  const linhas = a.dias.map((d, i) => `${i + 1}. ${d.postou ? "✅" : "❌"} ${d.br} — ${statusLabel(d.status)}`);
  return [
    "📲 *COBRANÇA DE POSTAGENS*",
    "━━━━━━━━━━━━━━━━━━━━",
    `👤 *Influenciador:* ${a.inf.name}`,
    `📅 *Período:* ${deBR} a ${ateBR}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `✅ *Entregas confirmadas:* ${a.entregas}`,
    `❌ *Dias sem postar:* ${a.diasSem}`,
    "━━━━━━━━━━━━━━━━━━━━",
    "*Status por dia:*",
    ...linhas,
    "Qualquer dúvida, me avise. Obrigado! 🙏",
  ].join("\n");
}

export default function CobrancaPage() {
  const { influencers, loading } = useInfluencers();
  const { registros } = useBancoDados();
  const { mostrar } = useToast();

  const [de, setDe] = useState(diasAtrasISO(6));
  const [ate, setAte] = useState(hojeISO());
  const [indice, setIndice] = useState(0);
  const [cobrados, setCobrados] = useState<Record<string, boolean>>({});

  // Chave de persistência baseada no período
  const chavePersistencia = useMemo(() => `betesporte_cobranca_${de}_${ate}`, [de, ate]);

  // Carrega progresso persistido do período
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chavePersistencia);
      if (raw) {
        const p = JSON.parse(raw);
        setCobrados(p.cobrados || {});
        setIndice(p.indice || 0);
      }
    } catch { /* ignore */ }
  }, [chavePersistencia]);

  // Persiste a cada mudança
  useEffect(() => {
    try {
      localStorage.setItem(chavePersistencia, JSON.stringify({ cobrados, indice }));
    } catch { /* ignore */ }
  }, [chavePersistencia, cobrados, indice]);

  // Lista de inadimplentes do período, em ordem alfabética
  const analise = useMemo(() => {
    if (!de || !ate || de > ate) return [];
    return analisar(influencers, registros, de, ate)
      .filter((a) => a.diasSem > 0)
      .sort((a, b) => a.inf.name.localeCompare(b.inf.name));
  }, [influencers, registros, de, ate]);

  // Filtra os que ainda não foram cobrados
  const pendentes = useMemo(
    () => analise.filter((a) => !cobrados[a.inf.name]),
    [analise, cobrados]
  );

  const atual = pendentes[Math.min(indice, pendentes.length - 1)] || null;

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  const deBR = isoParaBR(de);
  const ateBR = isoParaBR(ate);

  const mensagem = atual ? gerarMensagem(atual, deBR, ateBR) : "";
  const whatsappLink = atual
    ? `https://wa.me/?text=${encodeURIComponent(mensagem)}`
    : "";

  function marcarCobrado() {
    if (!atual) return;
    setCobrados((prev) => ({ ...prev, [atual.inf.name]: true }));
    setIndice(0);
    mostrar(`✓ ${atual.inf.name} marcado como cobrado`);
  }

  function desfazer(nome: string) {
    setCobrados((prev) => {
      const novo = { ...prev };
      delete novo[nome];
      return novo;
    });
    mostrar("Marcado como pendente");
  }

  async function copiar() {
    if (!mensagem) return;
    try {
      await navigator.clipboard.writeText(mensagem);
      mostrar("Mensagem copiada");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = mensagem;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      mostrar("Mensagem copiada");
    }
  }

  function resetar() {
    setCobrados({});
    setIndice(0);
    mostrar("Progresso do período resetado");
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cobrança automática por período</p>
        </div>
      </div>

      {/* Seleção de período */}
      <div className="glass-card card-animate mt-6 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <CalendarRangeIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Período</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <input
              type="date"
              value={de}
              onChange={(e) => { setDe(e.target.value); setIndice(0); }}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <input
              type="date"
              value={ate}
              onChange={(e) => { setAte(e.target.value); setIndice(0); }}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {analise.length} inadimplente{analise.length !== 1 ? "s" : ""} no período ·{" "}
          {pendentes.length} ainda para cobrar
        </p>
      </div>

      {atual ? (
        <>
          {/* Progresso */}
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Cobrando {pendentes.length - indice} de {pendentes.length}
            </span>
            <button onClick={resetar} className="flex items-center gap-1 hover:text-foreground">
              <RotateCcwIcon className="h-3.5 w-3.5" /> Resetar
            </button>
          </div>

          {/* Card do influenciador atual */}
          <div className="glass-card card-animate mt-3 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                {atual.inf.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-foreground">{atual.inf.name}</p>
                <p className="truncate text-sm text-muted-foreground">{atual.inf.username}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#FF3B30]/10 px-3 py-1 text-xs font-medium text-[#FF3B30]">
                {atual.diasSem} dia{atual.diasSem !== 1 ? "s" : ""} sem postar
              </span>
            </div>

            {/* Texto da mensagem */}
            <textarea
              readOnly
              value={mensagem}
              rows={Math.min(atual.dias.length + 8, 16)}
              className="mt-4 w-full resize-y rounded-xl border border-border bg-white/70 px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:border-primary"
            />

            {/* Botões principais */}
            <div className="mt-4 flex gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <MessageCircleIcon className="h-4 w-4" />
                Abrir WhatsApp
              </a>
              <button
                onClick={copiar}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={marcarCobrado}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <CheckIcon className="h-4 w-4" />
              Já cobrei — próximo
            </button>
          </div>
        </>
      ) : (
        <div className="glass-card card-animate mt-6 rounded-2xl p-8 text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="mt-3 text-xl font-bold text-foreground">
            {analise.length === 0 ? "Nenhum inadimplente no período" : "Todos cobrados!"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {analise.length === 0
              ? "Todos os influenciadores postaram no período selecionado."
              : `${analise.length} influenciador(es) cobrados neste período.`}
          </p>
          {analise.length > 0 && (
            <button
              onClick={resetar}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcwIcon className="h-4 w-4" />
              Cobrar de novo
            </button>
          )}
        </div>
      )}

      {/* Lista de cobrados */}
      {Object.keys(cobrados).length > 0 && (
        <div className="glass-card card-animate mt-6 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Cobrados neste período ({Object.keys(cobrados).length})</h2>
          <div className="mt-3 flex flex-col gap-2">
            {analise
              .filter((a) => cobrados[a.inf.name])
              .map((a) => (
                <div key={a.inf.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.inf.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.inf.username}</p>
                  </div>
                  <button
                    onClick={() => desfazer(a.inf.name)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Desfazer
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}