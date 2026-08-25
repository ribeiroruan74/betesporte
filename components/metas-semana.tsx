"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TargetIcon } from "lucide-react";
import type { Influencer } from "@/lib/use-influencers";
import type { Registro } from "@/lib/use-banco-dados";
import { useMetas } from "@/lib/use-metas";
import { parseFormatos } from "@/lib/influencers";
import { cn } from "@/lib/utils";

function paraISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

// Segunda-feira 00:00 da semana que contém `d`
function inicioDaSemana(d: Date) {
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return seg;
}

function fimDaSemana(inicio: Date) {
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59, 999);
}

function formataDia(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface LinhaMeta {
  nome: string;
  username: string;
  storiesEntregues: number;
  storiesMeta: number;
  feedEntregues: number;
  feedMeta: number;
  faltamStories: number;
  faltamFeed: number;
  faltamTotal: number;
  temMeta: boolean;
}

export function MetasSemana({ influencers, registros }: { influencers: Influencer[]; registros: Registro[] }) {
  const { obterMeta, carregado } = useMetas();
  const [soComPendencia, setSoComPendencia] = useState(false);

  const inicio = useMemo(() => inicioDaSemana(new Date()), []);
  const fim = useMemo(() => fimDaSemana(inicio), [inicio]);

  const linhas = useMemo<LinhaMeta[]>(() => {
    const registrosDaSemana = registros.filter((r) => {
      const iso = paraISO(r.data);
      if (!iso) return false;
      const d = new Date(`${iso}T12:00:00`);
      return d >= inicio && d <= fim;
    });

    return influencers
      .filter((inf) => inf.name)
      .map((inf) => {
        const meta = obterMeta(inf.name);
        const doInfluenciador = registrosDaSemana.filter((r) => r.nome === inf.name);

        let storiesEntregues = 0;
        let feedEntregues = 0;
        doInfluenciador.forEach((r) => {
          const formatos = parseFormatos(r.status);
          if (formatos.includes("story-link") || formatos.includes("story-sem-link")) storiesEntregues++;
          if (formatos.includes("feed-reels")) feedEntregues++;
        });

        const faltamStories = Math.max(0, meta.storiesSemana - storiesEntregues);
        const faltamFeed = Math.max(0, meta.feedSemana - feedEntregues);

        return {
          nome: inf.name,
          username: inf.username,
          storiesEntregues,
          storiesMeta: meta.storiesSemana,
          feedEntregues,
          feedMeta: meta.feedSemana,
          faltamStories,
          faltamFeed,
          faltamTotal: faltamStories + faltamFeed,
          temMeta: meta.storiesSemana > 0 || meta.feedSemana > 0,
        };
      })
      .sort((a, b) => b.faltamTotal - a.faltamTotal);
  }, [influencers, registros, obterMeta, inicio, fim]);

  const comMeta = linhas.filter((l) => l.temMeta);
  const semMeta = linhas.filter((l) => !l.temMeta);
  const visiveis = soComPendencia ? comMeta.filter((l) => l.faltamTotal > 0) : comMeta;
  const totalPendentes = comMeta.filter((l) => l.faltamTotal > 0).length;

  if (!carregado) return null;

  return (
    <div className="glass-card card-animate rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Metas da semana</h2>
            <p className="text-xs text-muted-foreground">
              {formataDia(inicio)} a {formataDia(fim)} · entregas que faltam por influenciador
            </p>
          </div>
        </div>
        <button
          onClick={() => setSoComPendencia((v) => !v)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            soComPendencia
              ? "bg-primary text-primary-foreground shadow-md"
              : "border border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {soComPendencia ? "Mostrando só pendentes" : "Só com pendência"} ({totalPendentes})
        </button>
      </div>

      {comMeta.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum influenciador com meta semanal configurada ainda. Vá em{" "}
          <Link href="/configuracoes" className="font-medium text-primary hover:underline">
            Configurações
          </Link>{" "}
          para definir quantos stories e feeds/reels cada um deve entregar por semana.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém com pendência nesta semana. 🎉</p>
          ) : (
            visiveis.map((l) => (
              <div key={l.nome} className="flex flex-col gap-2 rounded-xl bg-white/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 sm:w-40">
                  <p className="truncate text-sm font-medium text-foreground">{l.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.username}</p>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">📱 Stories</span>
                    <span className={cn("font-semibold", l.faltamStories > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
                      {l.storiesEntregues}/{l.storiesMeta}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">🎬 Feed/Reels</span>
                    <span className={cn("font-semibold", l.faltamFeed > 0 ? "text-[#FF3B30]" : "text-[#30D158]")}>
                      {l.feedEntregues}/{l.feedMeta}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium sm:self-auto",
                    l.faltamTotal > 0 ? "bg-[#FF3B30]/10 text-[#FF3B30]" : "bg-[#30D158]/10 text-[#30D158]"
                  )}
                >
                  {l.faltamTotal > 0 ? `Faltam ${l.faltamTotal}` : "Meta batida"}
                </span>
              </div>
            ))
          )}
          {semMeta.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {semMeta.length} influenciador(es) sem meta definida —{" "}
              <Link href="/configuracoes" className="font-medium text-primary hover:underline">
                configurar
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
