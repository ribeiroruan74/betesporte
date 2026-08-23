"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useInfluencers } from "@/lib/use-influencers";

type Tab = "diaria" | "semanal" | "mensal" | "individual";

function normaliza(s: string) {
  return (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function ehNaoPostou(status: string) {
  const n = normaliza(status).replace(/\s+/g, "");
  return n === "naopostou" || n === "pendente" || n === "nao" || n === "";
}

function paraISO(data: string) {
  const p = (data || "").split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function primeiroDoMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function montaMensagem(nome: string, periodo: string) {
  return `Olá ${nome}! 👋\n\nPassando para lembrar sobre a postagem do período (${periodo}) referente à parceria com a BETesporte. 🎯\n\nQualquer dúvida, estamos à disposição!\nAtenciosamente, Equipe BETesporte.`;
}

export default function CobrancaPage() {
  const { registros, loading } = useBancoDados();
  const { influencers } = useInfluencers();
  const [tab, setTab] = useState<Tab>("diaria");
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const [indNome, setIndNome] = useState("");
  const [indDe, setIndDe] = useState("");
  const [indAte, setIndAte] = useState("");

  const inadimplentesDiaria = useMemo(
    () => influencers.filter((i) => ehNaoPostou(i.status || "")),
    [influencers]
  );

  const inadimplentesSemana = useMemo(() => {
    const inicio = diasAtras(7);
    const porNome = new Map<string, Set<string>>();
    registros.forEach((r) => {
      const iso = paraISO(r.data);
      if (!iso || iso < inicio) return;
      if (ehNaoPostou(r.status)) {
        if (!porNome.has(r.nome)) porNome.set(r.nome, new Set());
        porNome.get(r.nome)!.add(iso);
      }
    });
    return Array.from(porNome.entries())
      .map(([nome, dias]) => ({ nome, dias: dias.size }))
      .filter((x) => x.dias > 0)
      .sort((a, b) => b.dias - a.dias);
  }, [registros]);

  const inadimplentesMes = useMemo(() => {
    const inicio = primeiroDoMes();
    const porNome = new Map<string, Set<string>>();
    registros.forEach((r) => {
      const iso = paraISO(r.data);
      if (!iso || iso < inicio) return;
      if (ehNaoPostou(r.status)) {
        if (!porNome.has(r.nome)) porNome.set(r.nome, new Set());
        porNome.get(r.nome)!.add(iso);
      }
    });
    return Array.from(porNome.entries())
      .map(([nome, dias]) => ({ nome, dias: dias.size }))
      .filter((x) => x.dias > 0)
      .sort((a, b) => b.dias - a.dias);
  }, [registros]);

  const inadimplentesIndividual = useMemo(() => {
    return registros.filter((r) => {
      if (indNome && normaliza(r.nome) !== normaliza(indNome)) return false;
      if (indDe || indAte) {
        const iso = paraISO(r.data);
        if (!iso) return false;
        if (indDe && iso < indDe) return false;
        if (indAte && iso > indAte) return false;
      }
      return ehNaoPostou(r.status);
    });
  }, [registros, indNome, indDe, indAte]);

  const nomes = useMemo(
    () => Array.from(new Set(registros.map((r) => r.nome))).sort((a, b) => a.localeCompare(b)),
    [registros]
  );

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  function copiar(texto: string, id: string) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  function waLink(phone: string, texto: string) {
    return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "diaria", label: "Diária" },
    { id: "semanal", label: "Semanal" },
    { id: "mensal", label: "Mensal" },
    { id: "individual", label: "Individual" },
  ];

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gere cobranças por período e envie via WhatsApp</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "individual" && (
        <div className="glass-card card-animate mt-6 rounded-2xl p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Influenciador</label>
              <select value={indNome} onChange={(e) => setIndNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Todos</option>
                {nomes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
              <input type="date" value={indDe} onChange={(e) => setIndDe(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data Final</label>
              <input type="date" value={indAte} onChange={(e) => setIndAte(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        </div>
      )}

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Inadimplentes {tab === "diaria" ? "hoje" : tab === "semanal" ? "na semana" : tab === "mensal" ? "no mês" : "no período"}
        </h2>

        {tab === "diaria" && (
          inadimplentesDiaria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum inadimplente hoje. 🎉</p>
          ) : (
            <div className="flex flex-col gap-3">
              {inadimplentesDiaria.map((inf) => {
                const id = String(inf.id ?? inf.username ?? inf.name);
                const msg = montaMensagem(inf.name, "hoje");
                const phone = phones[id] || "";
                return (
                  <div key={id} className="rounded-xl bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{inf.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{inf.username}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => copiar(msg, id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                          {copiado === id ? "Copiado ✓" : "Copiar"}
                        </button>
                        <a href={waLink(phone, msg)} target="_blank" rel="noreferrer"
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${phone ? "bg-green-600 hover:bg-green-700" : "pointer-events-none bg-gray-300"}`}>
                          wa.me
                        </a>
                      </div>
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhones((p) => ({ ...p, [id]: e.target.value }))}
                      placeholder="Telefone (ex: 5511999999999) para wa.me"
                      className="mt-2 w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          )
        )}

        {(tab === "semanal" || tab === "mensal") && (
          (tab === "semanal" ? inadimplentesSemana : inadimplentesMes).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum inadimplente no período. 🎉</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(tab === "semanal" ? inadimplentesSemana : inadimplentesMes).map((item) => {
                const id = item.nome;
                const periodo = tab === "semanal" ? "semana" : "mês";
                const msg = montaMensagem(item.nome, periodo);
                const phone = phones[id] || "";
                return (
                  <div key={id} className="rounded-xl bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.dias} {item.dias === 1 ? "dia sem postar" : "dias sem postar"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => copiar(msg, id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                          {copiado === id ? "Copiado ✓" : "Copiar"}
                        </button>
                        <a href={waLink(phone, msg)} target="_blank" rel="noreferrer"
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${phone ? "bg-green-600 hover:bg-green-700" : "pointer-events-none bg-gray-300"}`}>
                          wa.me
                        </a>
                      </div>
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhones((p) => ({ ...p, [id]: e.target.value }))}
                      placeholder="Telefone (ex: 5511999999999) para wa.me"
                      className="mt-2 w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === "individual" && (
          inadimplentesIndividual.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum inadimplente no período selecionado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {inadimplentesIndividual.map((r, i) => {
                const id = `${r.nome}-${i}`;
                const msg = montaMensagem(r.nome, `${r.data}`);
                const phone = phones[id] || "";
                return (
                  <div key={id} className="rounded-xl bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{r.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.username} · {r.data}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => copiar(msg, id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                          {copiado === id ? "Copiado ✓" : "Copiar"}
                        </button>
                        <a href={waLink(phone, msg)} target="_blank" rel="noreferrer"
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${phone ? "bg-green-600 hover:bg-green-700" : "pointer-events-none bg-gray-300"}`}>
                          wa.me
                        </a>
                      </div>
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhones((p) => ({ ...p, [id]: e.target.value }))}
                      placeholder="Telefone (ex: 5511999999999) para wa.me"
                      className="mt-2 w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}