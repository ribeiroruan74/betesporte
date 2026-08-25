"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";
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
  const { registros, loading } = useBancoDados();
  const [period, setPeriod] = useState<"semana" | "mes">("semana");

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

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ranking de Assiduidade</h1>
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(["semana", "mes"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
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
      )}
    </AppShell>
  );
}