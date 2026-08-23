"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";

const STATUS_META: Record<string, { label: string; color: string }> = {
  "story + link": { label: "Story + Link", color: "#75CEFF" },
  "story sem link": { label: "Story Sem Link", color: "#5AC8FA" },
  branding: { label: "Branding", color: "#AF52DE" },
  "feed/reels": { label: "Feed/Reels", color: "#FF9500" },
  "nao postou": { label: "Não Postou", color: "#FF3B30" },
  "não postou": { label: "Não Postou", color: "#FF3B30" },
};

function normaliza(s: string) {
  return (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// CORREÇÃO: detecta "não postou" com ou sem espaço (nao postou / naopostou)
function ehNaoPostou(status: string) {
  const n = normaliza(status).replace(/\s+/g, "");
  return n === "naopostou" || n === "pendente" || n === "nao" || n === "";
}

function metaStatus(status: string) {
  const meta = STATUS_META[normaliza(status)];
  return meta ? { ...meta } : { label: status || "—", color: "#94A3B8" };
}

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

export default function RelatoriosPage() {
  const { registros, loading } = useBancoDados();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [mes, setMes] = useState("");
  const [influenciador, setInfluenciador] = useState("");

  const nomes = useMemo(
    () => Array.from(new Set(registros.map((r) => r.nome))).sort((a, b) => a.localeCompare(b)),
    [registros]
  );

  const filtrados = useMemo(() => {
    const temFiltro = de || ate || mes || influenciador;
    return registros.filter((r) => {
      if (influenciador && normaliza(r.nome) !== normaliza(influenciador)) return false;
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
      if (!temFiltro) {
        return paraISO(r.data) === hojeISO();
      }
      return true;
    });
  }, [registros, de, ate, mes, influenciador]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  const total = filtrados.length;
  const postaram = filtrados.filter((r) => !ehNaoPostou(r.status)).length;
  const inadimplentes = total - postaram;
  const adesao = total > 0 ? Math.round((postaram / total) * 100) : 0;

  const kpis = [
    { label: "Registros", value: total, color: "#0071E3" },
    { label: "Postaram", value: postaram, color: "#30D158" },
    { label: "Não postaram", value: inadimplentes, color: inadimplentes > 0 ? "#FF3B30" : "#30D158" },
    { label: "% adesão", value: `${adesao}%`, color: "#AF52DE" },
  ];

  const temFiltro = de || ate || mes || influenciador;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filtre por período, mês ou influenciador</p>
        </div>
        {temFiltro && (
          <button
            onClick={() => { setDe(""); setAte(""); setMes(""); setInfluenciador(""); }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Mês</label>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Influenciador</label>
            <select value={influenciador} onChange={(e) => setInfluenciador(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="">Todos</option>
              {nomes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
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
                const meta = metaStatus(r.status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.username} · {r.data}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
