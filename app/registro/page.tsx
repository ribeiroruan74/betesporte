"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { STATUS_CONFIG, type StatusType } from "@/lib/influencers";
import { useToast } from "@/components/toast";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, RefreshCwIcon, CloudOffIcon, ChevronDownIcon, UserRoundIcon } from "lucide-react";

const STORAGE_KEY = "betesporte_registro_indice";
const FILA_KEY = "betesporte_registro_fila";

interface Pendente { name: string; status: string; ts: number; }

function normaliza(s: string) {
  return (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

export default function RegistroPage() {
  const { influencers, loading } = useInfluencers();
  const { mostrar } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<StatusType[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [fila, setFila] = useState<Pendente[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filaRef = useRef<Pendente[]>([]);
  filaRef.current = fila;

  // Carrega o último índice salvo
  useEffect(() => {
    if (loading || influencers.length === 0) return;
    const salvo = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    const idx = isNaN(salvo) ? 0 : Math.min(Math.max(salvo, 0), influencers.length - 1);
    setCurrentIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (currentIndex > 0) localStorage.setItem(STORAGE_KEY, String(currentIndex));
  }, [currentIndex]);

  // Carrega a fila de pendentes do dispositivo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILA_KEY);
      if (raw) setFila(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Persiste a fila a cada mudança
  useEffect(() => {
    localStorage.setItem(FILA_KEY, JSON.stringify(fila));
  }, [fila]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function combinedLabel() {
    return selected.map((s) => STATUS_CONFIG[s].label).join(" / ");
  }

  function statusEfetivo(inf: { name: string; status?: string }) {
    return statuses[inf.name] ?? inf.status ?? "";
  }

  function ehPendente(inf: { name: string; status?: string }) {
    const s = normaliza(statusEfetivo(inf));
    return s === "" || s === "naopostou" || s === "nao" || s === "branding";
  }

  function toggleStatus(status: StatusType) {
    setSelected((prev) => {
      if (status === "nao-postou") {
        return prev.includes(status) ? [] : ["nao-postou" as StatusType];
      }
      if (prev.includes(status)) return prev.filter((s) => s !== status);
      return [...prev.filter((s) => s !== "nao-postou"), status];
    });
  }

  async function enviar(nome: string, status: string): Promise<boolean> {
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function adicionarNaFila(name: string, status: string) {
    setFila((f) => [...f.filter((x) => !(x.name === name && x.status === status)), { name, status, ts: Date.now() }]);
  }

  function removerDaFila(name: string, status: string) {
    setFila((f) => f.filter((x) => !(x.name === name && x.status === status)));
  }

  function salvarAtual() {
    if (selected.length === 0 || !influencers[currentIndex]) return;
    const inf = influencers[currentIndex];
    const status = combinedLabel();
    setSaving(true);
    timerRef.current = setTimeout(async () => {
      const ok = await enviar(inf.name, status);
      setStatuses((p) => ({ ...p, [inf.name]: status }));
      setSelected([]);
      setSaving(false);
      if (ok) {
        removerDaFila(inf.name, status);
        mostrar(`✓ ${inf.name} salvo`);
      } else {
        adicionarNaFila(inf.name, status);
        mostrar(`Sem conexão — ${inf.name} salvo no dispositivo`, "error");
      }
      if (currentIndex < influencers.length - 1) setCurrentIndex(currentIndex + 1);
    }, 700);
  }

  async function sincronizar() {
    const pendentes = [...filaRef.current];
    if (pendentes.length === 0) { mostrar("Nada pendente para sincronizar", "info"); return; }
    let okCount = 0;
    const restantes: Pendente[] = [];
    for (const p of pendentes) {
      if (await enviar(p.name, p.status)) okCount++;
      else restantes.push(p);
    }
    setFila(restantes);
    mostrar(`Sincronizados ${okCount} de ${pendentes.length}`, okCount === pendentes.length ? "success" : "info");
    if (restantes.length > 0) mostrar(`${restantes.length} ainda pendentes — tente de novo`, "error");
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  const inf = influencers[currentIndex];

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Marque os status — os dados ficam protegidos no dispositivo</p>
        </div>
        {fila.length > 0 && (
          <button
            onClick={sincronizar}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            <RefreshCwIcon className="h-4 w-4" />
            Sincronizar ({fila.length})
          </button>
        )}
      </div>

      {fila.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <CloudOffIcon className="h-4 w-4 shrink-0" />
          {fila.length} registro(s) salvos no dispositivo aguardando sincronização.
        </div>
      )}

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Anterior"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-lg font-semibold text-foreground">{inf?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{inf?.username} · {currentIndex + 1} de {influencers.length}</p>
          </div>
          <button
            onClick={() => setCurrentIndex(Math.min(influencers.length - 1, currentIndex + 1))}
            disabled={currentIndex >= influencers.length - 1}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Próximo"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-white/70 px-3 py-2.5 text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <UserRoundIcon className="h-4 w-4 text-muted-foreground" />
              {inf?.name}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          {showPicker && (
            <select
              className="mt-2 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
            >
              {influencers.map((i, idx) => (
                <option key={i.id} value={idx}>{idx + 1}. {i.name} {ehPendente(i) ? "· pendente" : ""}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {(Object.keys(STATUS_CONFIG) as StatusType[])
            .filter((s) => s !== "nao-postou")
            .map((status) => {
              const config = STATUS_CONFIG[status];
              const isSelected = selected.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition"
                  style={{
                    borderColor: `${config.color}55`,
                    backgroundColor: isSelected ? `${config.color}33` : `${config.color}1A`,
                    boxShadow: isSelected ? `0 0 0 2px ${config.color}` : "none",
                  }}
                >
                  <span className="text-2xl">{config.icon}</span>
                  <span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
                </button>
              );
            })}
        </div>

        {"nao-postou" in STATUS_CONFIG && (
          <button
            onClick={() => toggleStatus("nao-postou" as StatusType)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 transition ${
              selected.includes("nao-postou" as StatusType) ? "bg-[#FF3B30]/25" : "bg-[#FF3B30]/10"
            }`}
            style={{
              borderColor: "#FF3B3055",
              boxShadow: selected.includes("nao-postou" as StatusType) ? "0 0 0 2px #FF3B30" : "none",
            }}
          >
            <span className="text-2xl">{STATUS_CONFIG["nao-postou" as StatusType].icon}</span>
            <span className="text-sm font-medium" style={{ color: "#FF3B30" }}>
              {STATUS_CONFIG["nao-postou" as StatusType].label}
            </span>
          </button>
        )}

        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {selected.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: `${STATUS_CONFIG[s].color}22`, color: STATUS_CONFIG[s].color }}
              >
                {STATUS_CONFIG[s].label}
                <button onClick={() => toggleStatus(s)} aria-label="remover" className="opacity-70 hover:opacity-100">✕</button>
              </span>
            ))}
            <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground">
              Limpar
            </button>
          </div>
        )}

        <button
          onClick={salvarAtual}
          disabled={selected.length === 0 || saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-50"
        >
          {saving ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar e próximo"}
        </button>
      </div>
    </AppShell>
  );
}