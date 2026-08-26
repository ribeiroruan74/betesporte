"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useLinhasMetaSemana, formataDia, type LinhaMeta } from "@/lib/use-metas-semana";
import { useFotos } from "@/lib/use-fotos";
import { InfluencerAvatar } from "@/components/influencer-avatar";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import {
  TargetIcon,
  CopyIcon,
  MessageCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PartyPopperIcon,
  ExternalLinkIcon,
} from "lucide-react";

function gerarMensagemMeta(m: LinhaMeta): string {
  if (m.cumpriu) {
    return [
      "🎉 *PARABÉNS PELA META BATIDA!*",
      "━━━━━━━━━━━━━━━━━━━━",
      `👤 *${m.nome}*`,
      "━━━━━━━━━━━━━━━━━━━━",
      `📱 Stories: ${m.storiesEntregues}/${m.storiesMeta}`,
      `🎬 Feed/Reels: ${m.feedEntregues}/${m.feedMeta}`,
      "━━━━━━━━━━━━━━━━━━━━",
      "Você bateu a meta semanal! Obrigado pelo empenho e pela parceria. Continue assim! 🚀",
    ].join("\n");
  }

  const linhas = ["📲 *FALTAM POSTAGENS PRA BATER A META*", "━━━━━━━━━━━━━━━━━━━━", `👤 *${m.nome}*`, "━━━━━━━━━━━━━━━━━━━━"];
  if (m.storiesMeta > 0) {
    linhas.push(
      m.faltamStories > 0
        ? `📱 Stories: ${m.storiesEntregues}/${m.storiesMeta} — faltam ${m.faltamStories}`
        : `📱 Stories: ${m.storiesEntregues}/${m.storiesMeta} ✅`
    );
  }
  if (m.feedMeta > 0) {
    linhas.push(
      m.faltamFeed > 0
        ? `🎬 Feed/Reels: ${m.feedEntregues}/${m.feedMeta} — faltam ${m.faltamFeed}`
        : `🎬 Feed/Reels: ${m.feedEntregues}/${m.feedMeta} ✅`
    );
  }
  linhas.push(
    "━━━━━━━━━━━━━━━━━━━━",
    `Faltam ${m.faltamTotal} postage${m.faltamTotal !== 1 ? "ns" : "m"} pra bater a meta dessa semana. Contamos com você! 💪`
  );
  return linhas.join("\n");
}

type Filtro = "todos" | "bateu" | "nao-bateu" | "sem-meta";

export function MetasCard({ linha }: { linha: LinhaMeta }) {
  const { obterFoto } = useFotos();
  const { mostrar } = useToast();
  const [aberto, setAberto] = useState(false);

  const mensagem = gerarMensagemMeta(linha);
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      mostrar("Mensagem copiada");
    } catch {
      mostrar("Não foi possível copiar", "error");
    }
  }

  return (
    <div className="glass-card-soft overflow-hidden rounded-2xl">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/40 dark:hover:bg-white/5"
      >
        <InfluencerAvatar nome={linha.nome} fotoUrl={obterFoto(linha.nome)} className="h-10 w-10 shrink-0 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{linha.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{linha.username}</p>
        </div>
        {linha.temMeta ? (
          <div className="hidden shrink-0 items-center gap-3 text-xs sm:flex">
            <span className={cn("font-semibold", linha.faltamStories > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
              📱 {linha.storiesEntregues}/{linha.storiesMeta}
            </span>
            <span className={cn("font-semibold", linha.faltamFeed > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
              🎬 {linha.feedEntregues}/{linha.feedMeta}
            </span>
          </div>
        ) : (
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">Sem meta definida</span>
        )}
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            !linha.temMeta
              ? "bg-muted text-muted-foreground"
              : linha.cumpriu
                ? "bg-[#30D158]/15 text-[#30D158]"
                : "bg-[#FF3B30]/15 text-[#FF3B30]"
          )}
        >
          {!linha.temMeta ? "—" : linha.cumpriu ? "Bateu ✓" : `Faltam ${linha.faltamTotal}`}
        </span>
        {aberto ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {aberto && (
        <div className="border-t border-border/60 p-4">
          <div className="mb-3 flex items-center gap-3 text-xs sm:hidden">
            <span className={cn("font-semibold", linha.faltamStories > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
              📱 {linha.storiesEntregues}/{linha.storiesMeta}
            </span>
            <span className={cn("font-semibold", linha.faltamFeed > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
              🎬 {linha.feedEntregues}/{linha.feedMeta}
            </span>
          </div>
          <textarea
            readOnly
            value={mensagem}
            rows={8}
            className="w-full resize-y rounded-xl border border-border bg-white/70 px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:border-primary dark:bg-black/30"
          />
          <div className="mt-3 flex gap-2">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
            >
              <MessageCircleIcon className="h-4 w-4" />
              WhatsApp
            </a>
            <button
              onClick={copiar}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground active:scale-[0.98]"
            >
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetasPage() {
  const { influencers, loading: loadingInfluencers } = useInfluencers();
  const { registros, loading: loadingRegistros } = useBancoDados();
  const { linhas, inicio, fim, carregado } = useLinhasMetaSemana(influencers, registros);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const loading = loadingInfluencers || loadingRegistros || !carregado;

  const filtrados = useMemo(() => {
    return linhas.filter((l) => {
      if (filtro === "bateu") return l.temMeta && l.cumpriu;
      if (filtro === "nao-bateu") return l.temMeta && !l.cumpriu;
      if (filtro === "sem-meta") return !l.temMeta;
      return true;
    });
  }, [linhas, filtro]);

  const comMeta = linhas.filter((l) => l.temMeta);
  const bateram = comMeta.filter((l) => l.cumpriu).length;
  const naoBateram = comMeta.length - bateram;
  const semMeta = linhas.length - comMeta.length;

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <TargetIcon className="h-5 w-5 text-primary" />
            Metas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana de {formataDia(inicio)} a {formataDia(fim)} — gere mensagem de parabéns ou de cobrança pra cada influenciador
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="glass-card-soft rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#30D158]">{bateram}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">bateram a meta</p>
        </div>
        <div className="glass-card-soft rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#FF3B30]">{naoBateram}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">não bateram</p>
        </div>
        <div className="glass-card-soft rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{semMeta}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">sem meta definida</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {([
          { key: "todos", label: "Todos" },
          { key: "bateu", label: "🎉 Bateram a meta" },
          { key: "nao-bateu", label: "⏳ Faltam entregas" },
          { key: "sem-meta", label: "Sem meta definida" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105",
              filtro === f.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtrados.length === 0 ? (
          <div className="glass-card-soft card-animate flex flex-col items-center gap-2 rounded-2xl p-8 text-center">
            <PartyPopperIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ninguém nesse filtro.</p>
          </div>
        ) : (
          filtrados.map((l, i) => (
            <div key={l.nome} className="card-animate" style={{ animationDelay: `${i * 40}ms` }}>
              <MetasCard linha={l} />
            </div>
          ))
        )}
      </div>

      {comMeta.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Nenhum influenciador com meta semanal configurada ainda. Defina em{" "}
          <a href="/configuracoes" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            Configurações <ExternalLinkIcon className="h-3 w-3" />
          </a>
          .
        </p>
      )}
    </AppShell>
  );
}
