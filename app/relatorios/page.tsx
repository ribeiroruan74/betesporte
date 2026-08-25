"use client";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";
import { STATUS_CONFIG, contaComoPostou, normalizaTexto, parseFormatos, type StatusType } from "@/lib/influencers";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUpIcon, PrinterIcon, CalendarClockIcon } from "lucide-react";

const FILTROS_FORMATO: (StatusType | "todos")[] = [
  "todos",
  "story-link",
  "story-sem-link",
  "feed-reels",
  "branding",
  "nao-postou",
];

function paraISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function deISOCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function RelatoriosPage() {
  const { registros, loading } = useBancoDados();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [mes, setMes] = useState("");
  const [influenciador, setInfluenciador] = useState("");
  const [formatoFiltro, setFormatoFiltro] = useState<StatusType | "todos">("todos");

  const nomes = useMemo(
    () => Array.from(new Set(registros.map((r) => r.nome))).sort((a, b) => a.localeCompare(b)),
    [registros]
  );

  const filtrados = useMemo(() => {
    const temFiltro = de || ate || mes || influenciador;
    return registros.filter((r) => {
      if (influenciador && normalizaTexto(r.nome) !== normalizaTexto(influenciador)) return false;
      if (mes) {
        const p = r.data.split("/");
        if (p.length !== 3) return false;
        const ano = String(parseInt(p[2]) || 0);
        const mesNum = String(parseInt(p[1]) || 0).padStart(2, "0");
        if (`${ano}-${mesNum}` !== mes) return false;
      }
      if (de || ate) {
        const iso = paraISO(r.data);
        if (!iso) return false;
        if (de && iso < de) return false;
        if (ate && iso > ate) return false;
      }
      if (formatoFiltro !== "todos" && !parseFormatos(r.status).includes(formatoFiltro)) return false;
      if (!temFiltro) {
        return paraISO(r.data) === hojeISO();
      }
      return true;
    });
  }, [registros, de, ate, mes, influenciador, formatoFiltro]);

  // Evolução de entregas ao longo do tempo para o influenciador selecionado
  // (ignora o filtro de formato — mostra sempre todos os formatos na linha do tempo)
  const evolucao = useMemo(() => {
    if (!influenciador) return [];
    const doInfluenciador = registros.filter((r) => normalizaTexto(r.nome) === normalizaTexto(influenciador));
    const comFiltroData = doInfluenciador.filter((r) => {
      if (mes) {
        const p = r.data.split("/");
        if (p.length !== 3) return false;
        const ano = String(parseInt(p[2]) || 0);
        const mesNum = String(parseInt(p[1]) || 0).padStart(2, "0");
        if (`${ano}-${mesNum}` !== mes) return false;
      }
      if (de || ate) {
        const iso = paraISO(r.data);
        if (!iso) return false;
        if (de && iso < de) return false;
        if (ate && iso > ate) return false;
      }
      return true;
    });

    const porDia = new Map<string, { stories: number; feed: number; branding: number }>();
    comFiltroData.forEach((r) => {
      const iso = paraISO(r.data);
      if (!iso) return;
      const atual = porDia.get(iso) || { stories: 0, feed: 0, branding: 0 };
      const formatos = parseFormatos(r.status);
      if (formatos.includes("story-link") || formatos.includes("story-sem-link")) atual.stories++;
      if (formatos.includes("feed-reels")) atual.feed++;
      if (formatos.includes("branding")) atual.branding++;
      porDia.set(iso, atual);
    });

    return Array.from(porDia.entries())
      .map(([iso, v]) => ({ data: deISOCurta(iso), ...v, iso }))
      .sort((a, b) => (a.iso < b.iso ? -1 : 1));
  }, [registros, influenciador, de, ate, mes]);

  // Comparativo mês atual vs mês passado — independente dos filtros ativos
  const comparativoMensal = useMemo(() => {
    const hoje = new Date();
    const mesAtualChave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const passadoDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesPassadoChave = `${passadoDate.getFullYear()}-${String(passadoDate.getMonth() + 1).padStart(2, "0")}`;

    function statsDoMes(chave: string) {
      const doMes = registros.filter((r) => {
        const p = r.data.split("/");
        if (p.length !== 3) return false;
        const ano = String(parseInt(p[2]) || 0);
        const mesNum = String(parseInt(p[1]) || 0).padStart(2, "0");
        return `${ano}-${mesNum}` === chave;
      });
      const totalMes = doMes.length;
      const postaramMes = doMes.filter((r) => contaComoPostou(r.status)).length;
      return {
        total: totalMes,
        postaram: postaramMes,
        adesao: totalMes > 0 ? Math.round((postaramMes / totalMes) * 100) : 0,
      };
    }

    const atual = statsDoMes(mesAtualChave);
    const passado = statsDoMes(mesPassadoChave);
    const nomeMesAtual = hoje.toLocaleDateString("pt-BR", { month: "long" });
    const nomeMesPassado = passadoDate.toLocaleDateString("pt-BR", { month: "long" });
    return { atual, passado, nomeMesAtual, nomeMesPassado };
  }, [registros]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  const total = filtrados.length;
  const postaram = filtrados.filter((r) => contaComoPostou(r.status)).length;
  const inadimplentes = total - postaram;
  const adesao = total > 0 ? Math.round((postaram / total) * 100) : 0;

  const kpis = [
    { label: "Registros", value: total, color: "#0A84FF" },
    { label: "Postaram", value: postaram, color: "#30D158" },
    { label: "Não postaram", value: inadimplentes, color: inadimplentes > 0 ? "#FF453A" : "#30D158" },
    { label: "% adesão", value: `${adesao}%`, color: "#AF52DE" },
  ];

  const temFiltro = de || ate || mes || influenciador || formatoFiltro !== "todos";

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filtre por período, mês, influenciador ou formato</p>
        </div>
        <div className="flex gap-2 print:hidden">
          {temFiltro && (
            <button
              onClick={() => { setDe(""); setAte(""); setMes(""); setInfluenciador(""); setFormatoFiltro("todos"); }}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            <PrinterIcon className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros — grid-cols-1 no mobile para as datas não se sobreporem */}
      <div className="glass-card card-animate mt-6 rounded-2xl p-6 print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Mês</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Influenciador</label>
            <select
              value={influenciador}
              onChange={(e) => setInfluenciador(e.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Todos</option>
              {nomes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por formato — permite ver só Feed/Reels ou só Story+Link,
            mesmo em dias em que os dois foram postados juntos */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTROS_FORMATO.map((f) => (
            <button
              key={f}
              onClick={() => setFormatoFiltro(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105",
                formatoFiltro === f
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {f === "todos" ? "Todos os formatos" : `${STATUS_CONFIG[f].icon} ${STATUS_CONFIG[f].label}`}
            </button>
          ))}
        </div>
      </div>

      {influenciador && evolucao.length > 0 && (
        <div className="glass-card card-animate mt-6 rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Evolução de {influenciador}</h2>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="data" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0B0F1A", border: "1px solid #1E293B", borderRadius: "12px", color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="stories" name="Stories" stroke="#75CEFF" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="feed" name="Feed/Reels" stroke="#FF9500" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="branding" name="Branding" stroke="#AF52DE" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <CalendarClockIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold capitalize text-foreground">
            {comparativoMensal.nomeMesAtual} vs {comparativoMensal.nomeMesPassado}
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            { label: "Registros", atual: comparativoMensal.atual.total, passado: comparativoMensal.passado.total, sufixo: "" },
            { label: "Postaram", atual: comparativoMensal.atual.postaram, passado: comparativoMensal.passado.postaram, sufixo: "" },
            { label: "% adesão", atual: comparativoMensal.atual.adesao, passado: comparativoMensal.passado.adesao, sufixo: "%" },
          ] as const).map((item) => {
            const diff = item.atual - item.passado;
            return (
              <div key={item.label} className="rounded-xl bg-white/60 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{item.atual}{item.sufixo}</p>
                  {comparativoMensal.passado.total > 0 && (
                    <span className={cn("text-xs font-semibold", diff > 0 ? "text-[#30D158]" : diff < 0 ? "text-[#FF3B30]" : "text-muted-foreground")}>
                      {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"} {Math.abs(diff)}{item.sufixo}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  mês passado: {item.passado}{item.sufixo}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card card-animate rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Registros ({total})</h2>
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro com os filtros selecionados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrados
              .slice()
              .sort((a, b) => (a.data < b.data ? 1 : -1))
              .map((r, i) => {
                const formatos = parseFormatos(r.status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 p-3">
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
              })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
