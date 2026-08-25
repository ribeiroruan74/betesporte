"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useInfluencers } from "@/lib/use-influencers";
import { useLinhasMetaSemana, formataDia } from "@/lib/use-metas-semana";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { contaComoPostou } from "@/lib/influencers";

const medals = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const { registros, loading: loadingRegistros } = useBancoDados();
  const { influencers, loading: loadingInfluencers } = useInfluencers();
  const { linhas: metas, inicio, fim } = useLinhasMetaSemana(influencers, registros);
  const [modo, setModo] = useState<"assiduidade" | "meta">("assiduidade");
  const [filtroCumprimento, setFiltroCumprimento] = useState<"todos" | "bateu" | "nao-bateu">("todos");

  const loading = loadingRegistros || loadingInfluencers;

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  // Assiduidade real: % de dias em que cada influenciador postou
  const diasUnicos = new Set(registros.map((r) => r.data));
  const totalDias = diasUnicos.size || 1;

  const porInfluenciador = new Map<
    string,
    { nome: string; username: string; postou: number }
  >();

  registros.forEach((r) => {
    const postou = contaComoPostou(r.status);
    const atual = porInfluenciador.get(r.nome) || {
      nome: r.nome,
      username: r.username,
      postou: 0,
    };
    if (postou) atual.postou += 1;
    porInfluenciador.set(r.nome, atual);
  });

  const sorted = Array.from(porInfluenciador.values())
    .map((inf) => ({
      ...inf,
      attendance: Math.round((inf.postou / totalDias) * 100),
    }))
    .sort((a, b) => b.attendance - a.attendance);

  const top3 = sorted.slice(0, 3);
  const worst = sorted.slice(-3).reverse();

  const chartData = sorted.map((inf) => ({
    name: inf.nome.split(" ")[0],
    attendance: inf.attendance,
    color: inf.attendance >= 80 ? "#30D158" : inf.attendance >= 60 ? "#FF9500" : "#FF3B30",
  }));

  // Ranking de cumprimento da meta semanal
  const comMeta = metas
    .filter((m) => m.temMeta)
    .map((m) => {
      const totalMeta = m.storiesMeta + m.feedMeta;
      const totalEntregue = Math.min(m.storiesEntregues, m.storiesMeta) + Math.min(m.feedEntregues, m.feedMeta);
      const pct = totalMeta > 0 ? Math.round((totalEntregue / totalMeta) * 100) : 0;
      return { ...m, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  const metaTop3 = comMeta.slice(0, 3);
  const metaChartData = comMeta.map((m) => ({
    name: m.nome.split(" ")[0],
    pct: m.pct,
    color: m.pct >= 100 ? "#30D158" : m.pct >= 50 ? "#FF9500" : "#FF3B30",
  }));

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">
          {modo === "assiduidade" ? "Ranking de Assiduidade" : "Ranking de Meta Semanal"}
        </h1>
        <div className="flex rounded-lg border border-border bg-card p-1">
          {([
            { key: "assiduidade", label: "Assiduidade" },
            { key: "meta", label: "Meta semanal" },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setModo(m.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                modo === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {modo === "assiduidade" ? (
        sorted.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Nenhum dado no banco de dados ainda.</p>
        ) : (
          <>
            {/* Pódio Top 3 */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {top3.map((inf, i) => (
                <div
                  key={inf.nome}
                  className={cn(
                    "rounded-2xl border bg-card p-4 text-center",
                    i === 0 ? "border-[#FFD60A]/50" : "border-border"
                  )}
                >
                  <div className="text-2xl">{medals[i]}</div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{inf.nome}</p>
                  <p className="text-xs text-muted-foreground">{inf.username}</p>
                  <p className="mt-2 text-xl font-bold text-[#30D158]">{inf.attendance}%</p>
                </div>
              ))}
            </div>

            {/* Gráfico de barras */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                Assiduidade por influenciador
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                      contentStyle={{
                        backgroundColor: "#0B0F1A",
                        border: "1px solid #1E293B",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(value) => [`${value}%`, "Assiduidade"]}
                    />
                    <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Piores (em risco) */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">⚠️ Em risco de queda</h2>
              <div className="flex flex-col gap-3">
                {worst.map((inf) => (
                  <div
                    key={inf.nome}
                    className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{inf.nome}</p>
                      <p className="text-xs text-muted-foreground">{inf.username}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        inf.attendance < 60 ? "bg-[#FF3B30] text-white" : "bg-[#FF9500] text-white"
                      )}
                    >
                      {inf.attendance}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      ) : comMeta.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Nenhum influenciador com meta semanal configurada ainda. Defina em Configurações.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Semana de {formataDia(inicio)} a {formataDia(fim)} · % de stories + feed/reels entregues sobre a meta
          </p>

          {/* Pódio Top 3 */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {metaTop3.map((m, i) => (
              <div
                key={m.nome}
                className={cn(
                  "rounded-2xl border bg-card p-4 text-center",
                  i === 0 ? "border-[#FFD60A]/50" : "border-border"
                )}
              >
                <div className="text-2xl">{medals[i]}</div>
                <p className="mt-2 text-sm font-semibold text-foreground">{m.nome}</p>
                <p className="text-xs text-muted-foreground">{m.username}</p>
                <p className={cn("mt-2 text-xl font-bold", m.pct >= 100 ? "text-[#30D158]" : "text-[#FF9500]")}>
                  {m.pct}%
                </p>
              </div>
            ))}
          </div>

          {/* Gráfico de barras */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Cumprimento da meta semanal por influenciador
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.1)" }}
                    contentStyle={{ backgroundColor: "#0B0F1A", border: "1px solid #1E293B", borderRadius: "12px", color: "#fff" }}
                    formatter={(value) => [`${value}%`, "Meta cumprida"]}
                  />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {metaChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista completa */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Todos os influenciadores com meta</h2>
              <div className="flex gap-1.5">
                {([
                  { key: "todos", label: "Todos" },
                  { key: "bateu", label: "Bateu a meta" },
                  { key: "nao-bateu", label: "Não bateu" },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFiltroCumprimento(f.key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      filtroCumprimento === f.key
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {comMeta.filter((m) => {
                if (filtroCumprimento === "bateu") return m.pct >= 100;
                if (filtroCumprimento === "nao-bateu") return m.pct < 100;
                return true;
              }).length === 0 && (
                <p className="text-sm text-muted-foreground">Ninguém nesse filtro.</p>
              )}
              {comMeta
                .filter((m) => {
                  if (filtroCumprimento === "bateu") return m.pct >= 100;
                  if (filtroCumprimento === "nao-bateu") return m.pct < 100;
                  return true;
                })
                .map((m) => (
                <div key={m.nome} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      📱 {m.storiesEntregues}/{m.storiesMeta} · 🎬 {m.feedEntregues}/{m.feedMeta}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium text-white",
                      m.pct >= 100 ? "bg-[#30D158]" : m.pct >= 50 ? "bg-[#FF9500]" : "bg-[#FF3B30]"
                    )}
                  >
                    {m.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
