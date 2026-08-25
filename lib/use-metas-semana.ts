"use client";

import { useMemo } from "react";
import type { Influencer } from "@/lib/use-influencers";
import type { Registro } from "@/lib/use-banco-dados";
import { useMetas } from "@/lib/use-metas";
import { parseFormatos } from "@/lib/influencers";

export function paraISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

// Segunda-feira 00:00 da semana que contém `d`
export function inicioDaSemana(d: Date) {
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export function fimDaSemana(inicio: Date) {
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59, 999);
}

export function formataDia(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export interface LinhaMeta {
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
  cumpriu: boolean;
}

/** Calcula, pra cada influenciador, quanto foi entregue essa semana vs a meta semanal configurada. */
export function useLinhasMetaSemana(influencers: Influencer[], registros: Registro[]) {
  const { obterMeta, carregado } = useMetas();

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
        const temMeta = meta.storiesSemana > 0 || meta.feedSemana > 0;

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
          temMeta,
          cumpriu: temMeta && faltamStories === 0 && faltamFeed === 0,
        };
      })
      .sort((a, b) => b.faltamTotal - a.faltamTotal);
  }, [influencers, registros, obterMeta, inicio, fim]);

  return { linhas, inicio, fim, carregado };
}
