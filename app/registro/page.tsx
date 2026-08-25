"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { STATUS_CONFIG, parseFormatos, type StatusType } from "@/lib/influencers";
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, CheckIcon, RotateCcwIcon, UserRoundIcon, ChevronDownIcon } from "lucide-react";

const STORAGE_KEY = "betesporte_registro_indice";

function hojeFormatado() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function RegistroPage() {
  const { influencers, loading } = useInfluencers();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<StatusType[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSeletor, setShowSeletor] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o último índice salvo quando os influenciadores carregam
  useEffect(() => {
    if (loading || influencers.length === 0) return;
    const salvo = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    const idx = isNaN(salvo) ? 0 : Math.min(Math.max(salvo, 0), influencers.length - 1);
    setCurrentIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Salva o índice atual sempre que mudar (para retomar de onde parou)
  useEffect(() => {
    if (currentIndex > 0) {
      localStorage.setItem(STORAGE_KEY, String(currentIndex));
    }
  }, [currentIndex]);

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function combinedLabel() {
    return selected.map((s) => STATUS_CONFIG[s].label).join(" / ");
  }

  function toggleStatus(status: StatusType) {
    if (saving) return;
    let nova: StatusType[];
    if (status === "nao-postou") {
      nova = selected.includes("nao-postou") ? [] : ["nao-postou"];
    } else {
      const semNao = selected.filter((s) => s !== "nao-postou");
      nova = semNao.includes(status) ? semNao.filter((s) => s !== status) : [...semNao, status];
    }
    setSelected(nova);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (nova.length > 0) {
        salvarEavancar(nova);
      }
    }, 1000);
  }

  async function salvarEavancar(sel: StatusType[]) {
    if (!current || sel.length === 0 || saving) return;
    const combined = sel.map((s) => STATUS_CONFIG[s].label).join(" / ");
    setSaving(true);
    try {
      await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: current.name, status: combined }),
      });
      setStatuses((prev) => ({ ...prev, [current.name]: combined }));
    } catch (e) {
      alert("Erro ao salvar o status. Tente novamente.");
    } finally {
      setSaving(false);
      setSelected([]);
      if (currentIndex + 1 < influencers.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(influencers.length);
      }
    }
  }

  function goBack() {
    if (currentIndex > 0 && !saving) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrentIndex(currentIndex - 1);
      setSelected([]);
    }
  }

  function pular() {
    if (saving) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected([]);
    if (currentIndex + 1 < influencers.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(influencers.length);
    }
  }

  function comecarDoInicio() {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(STORAGE_KEY);
    setStatuses({});
    setSelected([]);
    setCurrentIndex(0);
    setShowSeletor(false);
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  if (influencers.length === 0) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Nenhum influenciador encontrado na planilha para hoje.</p>
      </AppShell>
    );
  }

  const current = influencers[currentIndex];
  const isDone = currentIndex >= influencers.length;
  const postedCount = Object.keys(statuses).length;

  if (isDone) {
    return (
      <AppShell>
        <div className="glass-card card-animate mt-6 rounded-2xl p-8 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Dia finalizado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {postedCount} de {influencers.length} influenciadores registrados.
          </p>
          <button
            onClick={comecarDoInicio}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcwIcon className="h-4 w-4" />
            Começar novo registro
          </button>
        </div>
      </AppShell>
    );
  }

  // Status já salvo hoje: prioriza o que acabou de ser salvo nesta sessão,
  // senão usa o que já estava na planilha para hoje (current.status)
  const statusHojeRaw = statuses[current.name] ?? current.status ?? "";
  const statusHojeFormatos = parseFormatos(statusHojeRaw);
  const registradoNestaSessao = current.name in statuses;

  // Abre o Instagram: usa o link da coluna C se existir; senão monta a partir do @username
  const instagramUrl = current.link
    ? current.link
    : current.username
      ? `https://instagram.com/${current.username.replace(/^@/, "")}`
      : null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{hojeFormatado()}</span>
            <span className="text-border">·</span>
            {currentIndex + 1} / {influencers.length} · {postedCount} registrados
          </p>
        </div>
      </div>

      <div className="glass-card card-animate mt-6 rounded-2xl p-6">
        {/* Botão/select: ir para um influenciador específico */}
        <div className="mb-4">
          {!showSeletor ? (
            <button
              onClick={() => setShowSeletor(true)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <UserRoundIcon className="h-4 w-4 text-muted-foreground" />
                Ir para influenciador específico...
              </span>
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                autoFocus
                value={currentIndex}
                onChange={(e) => {
                  setCurrentIndex(parseInt(e.target.value, 10));
                  setSelected([]);
                  if (timerRef.current) clearTimeout(timerRef.current);
                }}
                className="w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {influencers.map((inf, idx) => {
                  const jaTemStatus = (statuses[inf.name] ?? inf.status ?? "") !== "" && parseFormatos(statuses[inf.name] ?? inf.status ?? "").length > 0;
                  return (
                    <option key={inf.id ?? idx} value={idx}>
                      {jaTemStatus ? "✓" : "○"} {idx + 1}. {inf.name} {inf.username ? `(${inf.username})` : ""}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => setShowSeletor(false)}
                className="shrink-0 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Ícone do influenciador (avatar com inicial) + nome */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {current.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">{current.name}</p>
            <p className="truncate text-sm text-muted-foreground">{current.username}</p>
          </div>
        </div>

        {/* Status já registrado hoje — pra não confundir se já passou por aqui */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            {registradoNestaSessao ? "Você acabou de registrar:" : "Status de hoje:"}
          </span>
          {statusHojeFormatos.length === 0 ? (
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Ainda não registrado
            </span>
          ) : (
            statusHojeFormatos.map((f) => (
              <span
                key={f}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: STATUS_CONFIG[f].color }}
              >
                {STATUS_CONFIG[f].icon} {STATUS_CONFIG[f].label}
              </span>
            ))
          )}
        </div>

        {/* Botão GRANDE de abrir Instagram */}
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E1306C] py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:bg-[#C72B60] hover:shadow-xl active:scale-95"
          >
            <InstagramIcon className="h-5 w-5" />
            Abrir Instagram
          </a>
        )}

        {/* Status (grade 2x2) */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(Object.keys(STATUS_CONFIG) as StatusType[])
            .filter((s) => s !== "nao-postou")
            .map((status) => {
              const config = STATUS_CONFIG[status];
              const isSelected = selected.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  disabled={saving}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-50"
                  style={{
                    borderColor: isSelected ? config.color : config.color + "55",
                    backgroundColor: isSelected ? `${config.color}33` : `${config.color}1A`,
                    boxShadow: isSelected ? `0 0 0 2px ${config.color}` : "none",
                  }}
                >
                  <span className="text-2xl">{config.icon}</span>
                  <span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
                  {isSelected && <CheckIcon className="h-4 w-4" style={{ color: config.color }} />}
                </button>
              );
            })}
        </div>

        <button
          onClick={() => toggleStatus("nao-postou")}
          disabled={saving}
          className={`mt-3 w-full rounded-2xl py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50 ${
            selected.includes("nao-postou") ? "bg-[#FF3B30] shadow-[#FF3B30]/25" : "bg-[#FF3B30]/70"
          }`}
        >
          🚫 Não Postou
        </button>

        {/* Linha selecionada aguardando salvar */}
        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3">
            <span className="text-sm font-medium text-foreground">{combinedLabel()}</span>
            <span className="text-xs text-muted-foreground">Salvando em 1s...</span>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={goBack}
            disabled={currentIndex === 0 || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Anterior
          </button>
          <button
            onClick={pular}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            Pular
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>

        {currentIndex > 0 && (
          <button
            onClick={comecarDoInicio}
            className="mt-3 w-full rounded-xl py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Começar do início (reseta o progresso salvo)
          </button>
        )}
      </div>
    </AppShell>
  );
}