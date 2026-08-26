"use client";

import { useState } from "react";
import Link from "next/link";
import { TargetIcon } from "lucide-react";
import type { Influencer } from "@/lib/use-influencers";
import type { Registro } from "@/lib/use-banco-dados";
import { useLinhasMetaSemana, formataDia } from "@/lib/use-metas-semana";
import { cn } from "@/lib/utils";

export function MetasSemana({ influencers, registros }: { influencers: Influencer[]; registros: Registro[] }) {
  const { linhas, inicio, fim, carregado } = useLinhasMetaSemana(influencers, registros);
  const [soComPendencia, setSoComPendencia] = useState(false);

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
        <div className="flex items-center gap-2">
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
          <Link
            href="/metas"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            Gerar mensagens →
          </Link>
        </div>
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
