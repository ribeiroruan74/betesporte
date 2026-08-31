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
  CalendarRangeIcon,
  RotateCcwIcon,
} from "lucide-react";
import { contaComoPostou, parseFormatos } from "@/lib/influencers";
import { useMetas } from "@/lib/use-metas";
import type { MetaSemanal } from "@/lib/metas";
import { useFinanceiro } from "@/lib/use-financeiro";
import { inicioDaSemana, fimDaSemana } from "@/lib/use-metas-semana";
import { cn } from "@/lib/utils";

function formatarBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function paraISOLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function semanaAtualISO() {
  const inicio = inicioDaSemana(new Date());
  return { de: paraISOLocal(inicio), ate: paraISOLocal(fimDaSemana(inicio)) };
}

function mesAtualISO() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { de: paraISOLocal(inicio), ate: paraISOLocal(hoje) };
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
  storiesEntregues: number;
  feedEntregues: number;
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
    let storiesEntregues = 0;
    let feedEntregues = 0;
    dias.forEach((d) => {
      const formatos = parseFormatos(d.status);
      if (formatos.includes("story-link") || formatos.includes("story-sem-link")) storiesEntregues++;
      if (formatos.includes("feed-reels")) feedEntregues++;
    });
    return { inf, entregas, diasSem, dias, storiesEntregues, feedEntregues };
  });
}

// Meta semanal configurada, ajustada proporcionalmente ao tamanho do
// período cobrado (7 dias = meta cheia, 30 dias ≈ 4x a meta semanal etc.)
function metaProporcional(meta: MetaSemanal, diasNoPeriodo: number) {
  const fator = diasNoPeriodo / 7;
  return {
    storiesMeta: Math.round(meta.storiesSemana * fator),
    feedMeta: Math.round(meta.feedSemana * fator),
  };
}

function gerarMensagem(a: AnaliseInfluenciador, deBR: string, ateBR: string, valorPorEntrega: number): string {
  const blocoValor =
    valorPorEntrega > 0
      ? ["━━━━━━━━━━━━━━━━━━━━", `💰 *Valor a receber:* ${formatarBRL(a.entregas * valorPorEntrega)} (${a.entregas} × ${formatarBRL(valorPorEntrega)})`]
      : [];

  return [
    "📲 *COBRANÇA DE POSTAGENS*",
    "━━━━━━━━━━━━━━━━━━━━",
    `👤 *Influenciador:* ${a.inf.name}`,
    `📅 *Período:* ${deBR} a ${ateBR}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `✅ *Entregas confirmadas:* ${a.entregas}`,
    `❌ *Dias sem postar:* ${a.diasSem}`,
    ...blocoValor,
    "━━━━━━━━━━━━━━━━━━━━",
    "Qualquer dúvida, me avise. Obrigado! 🙏",
  ].join("\n");
}

export default function CobrancaPage() {
  const { influencers, loading } = useInfluencers();
  const { registros } = useBancoDados();
  const { mostrar } = useToast();
  const { obterMeta } = useMetas();
  const { obterFinanceiro } = useFinanceiro();

  const [de, setDe] = useState(diasAtrasISO(6));
  const [ate, setAte] = useState(hojeISO());
  const [indice, setIndice] = useState(0);
  const [cobrados, setCobrados] = useState<Record<string, boolean>>({});

  function aplicarPreset(preset: "semana" | "mes") {
    const { de: novoDe, ate: novoAte } = preset === "semana" ? semanaAtualISO() : mesAtualISO();
    setDe(novoDe);
    setAte(novoAte);
    setIndice(0);
  }

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

  const mensagem = atual
    ? gerarMensagem(atual, deBR, ateBR, obterFinanceiro(atual.inf.name).valorPorEntrega)
    : "";
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          {([
            { key: "semana", label: "Semana atual" },
            { key: "mes", label: "Mês atual" },
          ] as const).map((p) => (
            <button
              key={p.key}
              onClick={() => aplicarPreset(p.key)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Personalizado: ajuste as datas abaixo
          </span>
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
          <div className="glass-card card-animate mt-3 rounded-2xl p-6 pb-28">
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

            {(() => {
              const meta = obterMeta(atual.inf.name);
              if (meta.storiesSemana === 0 && meta.feedSemana === 0) return null;
              const { storiesMeta, feedMeta } = metaProporcional(meta, atual.dias.length);
              return (
                <div className="mt-3 flex flex-wrap gap-3 rounded-xl bg-white/60 px-3 py-2.5 text-xs">
                  <span className="text-muted-foreground">Meta do período:</span>
                  <span className={cn("font-semibold", atual.storiesEntregues < storiesMeta ? "text-[#FF3B30]" : "text-[#30D158]")}>
                    📱 Stories {atual.storiesEntregues}/{storiesMeta}
                  </span>
                  <span className={cn("font-semibold", atual.feedEntregues < feedMeta ? "text-[#FF3B30]" : "text-[#30D158]")}>
                    🎬 Feed/Reels {atual.feedEntregues}/{feedMeta}
                  </span>
                </div>
              );
            })()}

            {(() => {
              const valorPorEntrega = obterFinanceiro(atual.inf.name).valorPorEntrega;
              if (valorPorEntrega <= 0) return null;
              return (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#30D158]/10 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Valor a receber no período</span>
                  <span className="font-bold text-[#30D158]">{formatarBRL(atual.entregas * valorPorEntrega)}</span>
                </div>
              );
            })()}

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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#007BFF] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
        <div className="glass-card card-animate mt-6 rounded-2xl p-5 pb-28">
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