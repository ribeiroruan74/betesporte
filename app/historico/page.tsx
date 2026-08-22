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

// Normaliza: minúsculas, sem acento, sem pontuação, sem espaços extras
function normaliza(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Fonte única da verdade: é "não postou"?
function ehNaoPostou(status: string) {
  const n = normaliza(status);
  return (
    n === "naopostou" ||
    n === "naopostou" ||
    n === "pendente" ||
    n === "nao" ||
    n === "nao-postou" ||
    n === "" ||
    n === "nao postou"
  );
}

function metaStatus(status: string) {
  if (ehNaoPostou(status)) {
    return { label: "Não Postou", color: "#FF3B30" };
  }
  const meta = STATUS_META[normaliza(status)];
  return meta ? { ...meta } : { label: status || "—", color: "#94A3B8" };
}

function paraISO(data: string) {
  const p = data.split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function deISO(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export default function HistoricoPage() {
  const { registros, loading } = useBancoDados();
  const [busca, setBusca] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");

  const datasDisponiveis = useMemo(() => {
    return Array.from(new Set(registros.map((r) => r.data)))
      .map((d) => ({ original: d, iso: paraISO(d) }))
      .filter((d) => d.iso)
      .sort((a, b) => (a.iso < b.iso ? 1 : -1));
  }, [registros]);

  const filtrados = useMemo(() => {
    let lista = registros;
    if (dataSelecionada) {
      lista = lista.filter((r) => paraISO(r.data) === dataSelecionada);
    }
    if (busca) {
      lista = lista.filter(
        (r) =>
          normaliza(r.nome).includes(normaliza(busca)) ||
          normaliza(r.username).includes(normaliza(busca))
      );
    }
    return lista;
  }, [registros, busca, dataSelecionada]);

  const grupos = useMemo(() => {
    const porData = new Map<string, typeof registros>();
    filtrados.forEach((r) => {
      const lista = porData.get(r.data) || [];
      lista.push(r);
      porData.set(r.data, lista);
    });
    return Array.from(porData.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([data, lista]) => ({ data, lista }));
  }, [filtrados]);

  const relatorioDia = useMemo(() => {
    if (!dataSelecionada) return null;
    const doDia = registros.filter((r) => paraISO(r.data) === dataSelecionada);
    const total = doDia.length;
    const postaram = doDia.filter((r) => !ehNaoPostou(r.status)).length;
    const inadimplentes = total - postaram;
    const adesao = total > 0 ? Math.round((postaram / total) * 100) : 0;

    const porFormato: Record<string, number> = {};
    doDia.forEach((r) => {
      const label = metaStatus(r.status).label;
      porFormato[label] = (porFormato[label] || 0) + 1;
    });

    return { total, postaram, inadimplentes, adesao, porFormato, doDia };
  }, [registros, dataSelecionada]);

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
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte por data específica ou navegue pelo arquivo diário (BANCO_DE_DADOS)
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar influenciador ou @username..."
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary sm:w-64"
          />
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary sm:w-44"
          />
        </div>
      </div>

      {relatorioDia && (
        <div className="glass-card card-animate mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              📊 Relatório do dia {deISO(dataSelecionada)}
            </h2>
            <button
              onClick={() => setDataSelecionada("")}
              className="rounded-lg border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-white/60 p-4">
              <p className="text-xs text-muted-foreground">Registros</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{relatorioDia.total}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-4">
              <p className="text-xs text-muted-foreground">Postaram</p>
              <p className="mt-1 text-2xl font-bold text-[#30D158]">{relatorioDia.postaram}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-4">
              <p className="text-xs text-muted-foreground">Não postaram</p>
              <p className="mt-1 text-2xl font-bold text-[#FF3B30]">{relatorioDia.inadimplentes}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-4">
              <p className="text-xs text-muted-foreground">% adesão</p>
              <p className="mt-1 text-2xl font-bold text-[#AF52DE]">{relatorioDia.adesao}%</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(relatorioDia.porFormato).map(([label, qtd]) => {
              const meta = metaStatus(label);
              return (
                <span
                  key={label}
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {label}: {qtd}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {dataSelecionada
            ? `Nenhum registro na data ${deISO(dataSelecionada)}.`
            : "Nenhum registro encontrado."}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {grupos.map((grupo) => (
            <div key={grupo.data} className="glass-card card-animate rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{grupo.data}</h2>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {grupo.lista.length} registro(s)
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {grupo.lista.map((r, i) => {
                  const meta = metaStatus(r.status);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{r.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.username}</p>
                      </div>
                      <span
                        className="ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}