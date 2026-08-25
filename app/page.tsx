"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FinalizarDiaButton } from "@/components/finalizar-dia-button";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { useBancoDados } from "@/lib/use-banco-dados";
import { STATUS_CONFIG, contaComoPostou, parseFormatos, type StatusType } from "@/lib/influencers";
import { MetasSemana } from "@/components/metas-semana";
import { StatCard } from "@/components/stat-card";
import { CheckCircle2Icon, AlertCircleIcon, TargetIcon, UsersIcon, TrendingUpIcon, LayersIcon, AlarmClockIcon } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

function paraISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function brDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function Home() {
  const { influencers, loading } = useInfluencers();
  const { registros } = useBancoDados();

  // Lembrete de dia não finalizado: só calcula no cliente (depende do
  // horário atual e da config salva) pra não conflitar com a hidratação.
  const [passouHorarioLimite, setPassouHorarioLimite] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("betesporte_config");
      const horarioLimite = raw ? (JSON.parse(raw)?.regras?.horarioLimite as string | undefined) : undefined;
      const [h, m] = (horarioLimite || "23:59").split(":").map((n) => parseInt(n, 10));
      const limite = new Date();
      limite.setHours(isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 0, 0);
      setPassouHorarioLimite(new Date() >= limite);
    } catch {
      // ignora — sem lembrete se a config não puder ser lida
    }
  }, []);

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  // ===== KPIs de hoje (ACOMPANHAMENTO) =====
  const total = influencers.length;
  const posted = influencers.filter((i) => contaComoPostou(i.status || "")).length;
  const inadimplentes = total - posted;
  const adesao = total > 0 ? Math.round((posted / total) * 100) : 0;
  const formatosUsados = new Set(
    influencers.flatMap((i) => parseFormatos(i.status || "").filter((f) => f !== "nao-postou"))
  ).size;

  // ===== Adesão por dia (BANCO_DE_DADOS) =====
  const porDia = new Map<string, { postaram: number; total: number }>();
  registros.forEach((r) => {
    const atual = porDia.get(r.data) || { postaram: 0, total: 0 };
    atual.total += 1;
    if (contaComoPostou(r.status)) atual.postaram += 1;
    porDia.set(r.data, atual);
  });

  const serieAdesao = Array.from(porDia.entries())
    .map(([data, v]) => ({
      data,
      iso: paraISO(data),
      adesao: v.total > 0 ? Math.round((v.postaram / v.total) * 100) : 0,
    }))
    .filter((d) => d.iso)
    .sort((a, b) => (a.iso < b.iso ? -1 : 1))
    .slice(-10);

  const mediaAdesao = serieAdesao.length
    ? Math.round(serieAdesao.reduce((s, d) => s + d.adesao, 0) / serieAdesao.length)
    : 0;

  // Comparativo com o mesmo dia da semana passada (arquivado no BANCO_DE_DADOS
  // quando aquele dia foi finalizado) — só mostra o delta se houver esse dado.
  const semanaPassadaBR = brDate(new Date(Date.now() - 7 * 86400000));
  const statsSemanaPassada = porDia.get(semanaPassadaBR);
  const deltaPostaram = statsSemanaPassada ? posted - statsSemanaPassada.postaram : undefined;
  const adesaoSemanaPassada =
    statsSemanaPassada && statsSemanaPassada.total > 0
      ? Math.round((statsSemanaPassada.postaram / statsSemanaPassada.total) * 100)
      : undefined;
  const deltaAdesao = adesaoSemanaPassada !== undefined ? adesao - adesaoSemanaPassada : undefined;

  // ===== Distribuição por formato =====
  // Cada formato entregue hoje soma na sua própria fatia — um influenciador
  // que postou Story + Link E Feed/Reels no mesmo dia soma nas duas fatias,
  // em vez de virar uma fatia combinada única.
  const formatCounts: Partial<Record<StatusType, number>> = {};
  influencers.forEach((i) => {
    parseFormatos(i.status || "")
      .filter((f) => f !== "nao-postou")
      .forEach((f) => {
        formatCounts[f] = (formatCounts[f] || 0) + 1;
      });
  });
  const chartData = (Object.entries(formatCounts) as [StatusType, number][]).map(([formato, value]) => ({
    name: STATUS_CONFIG[formato].label,
    value,
    color: STATUS_CONFIG[formato].color,
  }));

  const attentionList = influencers.filter((i) => !contaComoPostou(i.status || ""));

  const kpis = [
    { label: "Postaram hoje", value: posted, color: "#30D158", sub: `de ${total} influenciadores`, icon: CheckCircle2Icon, hero: true, delta: deltaPostaram },
    { label: "Não postaram", value: inadimplentes, color: "#FF3B30", sub: "inadimplentes", icon: AlertCircleIcon, hero: false, delta: undefined },
    { label: "% adesão hoje", value: `${adesao}%`, color: "#0071E3", sub: "meta do dia", icon: TargetIcon, hero: false, delta: deltaAdesao },
    { label: "Total", value: total, color: "#AF52DE", sub: "influenciadores", icon: UsersIcon, hero: false, delta: undefined },
    { label: "Média de adesão", value: `${mediaAdesao}%`, color: "#5AC8FA", sub: "últimos dias", icon: TrendingUpIcon, hero: false, delta: undefined },
    { label: "Formatos usados", value: formatosUsados, color: "#FF9500", sub: "hoje", icon: LayersIcon, hero: false, delta: undefined },
  ];

  const ultimosRegistros = registros
    .slice()
    .sort((a, b) => (paraISO(a.data) < paraISO(b.data) ? 1 : -1))
    .slice(0, 8);

  return (
    <AppShell>
            <div className="flex justify-end">
        <FinalizarDiaButton />
      </div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#0071E3]">BETesporte</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/registro" className="rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#0071E3]/25 transition hover:bg-[#0077ED]">
            + Registrar status
          </Link>
          <Link href="/cobranca" className="rounded-xl border border-border bg-white/60 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/80">
            Cobrança
          </Link>
        </div>
      </div>

      {passouHorarioLimite && inadimplentes > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF9500]/30 bg-[#FF9500]/10 px-4 py-3">
          <AlarmClockIcon className="h-4 w-4 shrink-0 text-[#FF9500]" />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            Já passou do horário limite e {inadimplentes} influenciador{inadimplentes !== 1 ? "es" : ""} ainda sem status hoje.
          </p>
          <Link href="/registro" className="shrink-0 text-sm font-semibold text-[#FF9500] hover:underline">
            Registrar agora →
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            icon={kpi.icon}
            color={kpi.color}
            hero={kpi.hero}
            delta={kpi.delta}
            className="card-animate"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* Metas da semana — automação de quantas entregas faltam por influenciador */}
      <div className="mt-6">
        <MetasSemana influencers={influencers} registros={registros} />
      </div>

      {/* Gráficos principais */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Adesão por dia */}
        <div className="glass-card card-animate rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Adesão nos últimos dias</h2>
            <span className="rounded-full bg-[#0071E3]/10 px-3 py-1 text-xs font-medium text-[#0071E3]">
              média {mediaAdesao}%
            </span>
          </div>
          <div className="mt-4 h-56">
            {serieAdesao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no banco ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serieAdesao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAdesao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071E3" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0071E3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="data" tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Adesão"]}
                    contentStyle={{ backgroundColor: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#1D1D1F", backdropFilter: "blur(8px)" }}
                  />
                  <Area type="monotone" dataKey="adesao" stroke="#0071E3" strokeWidth={2.5} fill="url(#gradAdesao)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribuição por formato */}
        <div className="glass-card card-animate rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Distribuição por formato</h2>
          <div className="mt-2 h-44">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém postou ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", color: "#1D1D1F" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Atenção + últimos registros */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass-card card-animate rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">⚠️ Precisa de atenção</h2>
            <span className="rounded-full bg-[#FF3B30]/10 px-3 py-1 text-xs font-medium text-[#FF3B30]">
              {attentionList.length}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {attentionList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum inadimplente hoje. 🎉</p>
            ) : (
              attentionList.slice(0, 6).map((inf) => (
                <div key={inf.id} className="flex items-center justify-between rounded-xl border border-[#FF3B30]/20 bg-white/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{inf.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{inf.username}</p>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-[#FF3B30] px-3 py-1 text-xs font-medium text-white">Não Postou</span>
                </div>
              ))
            )}
            {attentionList.length > 6 && (
              <Link href="/cobranca" className="mt-1 text-center text-xs font-medium text-[#0071E3] hover:underline">
                Ver todos ({attentionList.length})
              </Link>
            )}
          </div>
        </div>

        <div className="glass-card card-animate rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Últimos registros</h2>
          <div className="mt-4 flex flex-col gap-2">
            {ultimosRegistros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros no histórico.</p>
            ) : (
              ultimosRegistros.map((r, i) => {
                const formatos = parseFormatos(r.status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.username} · {r.data}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {formatos.length === 0 ? (
                        <span className="rounded-full bg-[#94A3B8] px-3 py-1 text-xs font-medium text-white">
                          {r.status || "—"}
                        </span>
                      ) : (
                        formatos.map((f) => (
                          <span
                            key={f}
                            className="rounded-full px-3 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: STATUS_CONFIG[f].color }}
                          >
                            {STATUS_CONFIG[f].label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
