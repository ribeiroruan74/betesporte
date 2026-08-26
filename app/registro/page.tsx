"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { STATUS_CONFIG, parseFormatos, type StatusType } from "@/lib/influencers";
import { useFotos } from "@/lib/use-fotos";
import { InfluencerAvatar } from "@/components/influencer-avatar";
import { useToast } from "@/components/toast";
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, CheckIcon, RotateCcwIcon, UserRoundIcon, ChevronDownIcon, WifiOffIcon, KeyboardIcon } from "lucide-react";

const STORAGE_KEY = "betesporte_registro_indice";
const FILA_KEY = "betesporte_registro_fila";

interface ItemFila {
  name: string;
  status: string;
  timestamp: number;
}

function hojeFormatado() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function lerFila(): ItemFila[] {
  try {
    const raw = localStorage.getItem(FILA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarFila(fila: ItemFila[]) {
  try {
    localStorage.setItem(FILA_KEY, JSON.stringify(fila));
  } catch {
    // localStorage indisponível — a fila só vive nesta sessão
  }
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

const STATUS_ORDEM = (Object.keys(STATUS_CONFIG) as StatusType[]).filter((s) => s !== "nao-postou");

export default function RegistroPage() {
  const { influencers, loading } = useInfluencers();
  const { obterFoto } = useFotos();
  const { mostrar } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<StatusType[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSeletor, setShowSeletor] = useState(false);
  const [filaPendente, setFilaPendente] = useState<ItemFila[]>([]);
  const [ultimoAtalho, setUltimoAtalho] = useState<string | null>(null);
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

  // Fila offline: tenta enviar de novo quando a conexão voltar
  const sincronizarFila = useCallback(async () => {
    const fila = lerFila();
    if (fila.length === 0) return;
    const restantes: ItemFila[] = [];
    let enviados = 0;
    for (const item of fila) {
      try {
        const res = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.name, status: item.status }),
        });
        if (res.ok) enviados++;
        else restantes.push(item);
      } catch {
        restantes.push(item);
      }
    }
    salvarFila(restantes);
    setFilaPendente(restantes);
    if (enviados > 0) {
      mostrar(`${enviados} registro(s) pendente(s) sincronizado(s)`);
    }
  }, [mostrar]);

  useEffect(() => {
    setFilaPendente(lerFila());
    window.addEventListener("online", sincronizarFila);
    return () => window.removeEventListener("online", sincronizarFila);
  }, [sincronizarFila]);

  function combinedLabel() {
    return selected.map((s) => STATUS_CONFIG[s].label).join(" / ");
  }

  // Salva o status de um influenciador (usado tanto no fluxo principal
  // quanto na revisão rápida do fim do dia). Se estiver offline, guarda
  // numa fila local e sincroniza quando a conexão voltar.
  async function persistirStatus(nome: string, sel: StatusType[]) {
    if (sel.length === 0) return;
    const combined = sel.map((s) => STATUS_CONFIG[s].label).join(" / ");
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, status: combined }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setStatuses((prev) => ({ ...prev, [nome]: combined }));
    } catch {
      const fila = [...lerFila(), { name: nome, status: combined, timestamp: Date.now() }];
      salvarFila(fila);
      setFilaPendente(fila);
      setStatuses((prev) => ({ ...prev, [nome]: combined }));
      mostrar({ titulo: "Sem conexão", descricao: "Guardado localmente — sincroniza quando a internet voltar", tipo: "info" });
    }
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
    setSaving(true);
    try {
      await persistirStatus(current.name, sel);
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

  const current = influencers[currentIndex];
  const isDone = currentIndex >= influencers.length;

  // Atalhos de teclado: 1-4 pra cada status, 0 pra não postou, setas pra navegar.
  // Usa e.code (posição física da tecla) como principal, com e.key como
  // fallback — em teclados com layout diferente do padrão US (ex.: ABNT2
  // em certas configurações) e.key pode não bater com o dígito esperado.
  useEffect(() => {
    const CODE_PARA_DIGITO: Record<string, string> = {
      Digit0: "0", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4",
      Numpad0: "0", Numpad1: "1", Numpad2: "2", Numpad3: "3", Numpad4: "4",
    };

    function onKeyDown(e: KeyboardEvent) {
      if (saving || showSeletor || isDone) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (["INPUT", "SELECT", "TEXTAREA"].includes(alvo.tagName) || alvo.isContentEditable)) return;

      const digito = CODE_PARA_DIGITO[e.code] ?? (e.key >= "0" && e.key <= "9" ? e.key : null);

      if (digito && digito >= "1" && digito <= "4") {
        const idx = parseInt(digito, 10) - 1;
        if (STATUS_ORDEM[idx]) {
          e.preventDefault();
          setUltimoAtalho(digito);
          toggleStatus(STATUS_ORDEM[idx]);
        }
      } else if (digito === "0") {
        e.preventDefault();
        setUltimoAtalho("0");
        toggleStatus("nao-postou");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        pular();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, showSeletor, isDone, currentIndex, selected]);

  // Feedback visual rápido de que uma tecla de atalho foi reconhecida
  useEffect(() => {
    if (!ultimoAtalho) return;
    const t = setTimeout(() => setUltimoAtalho(null), 400);
    return () => clearTimeout(t);
  }, [ultimoAtalho]);

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

  const postedCount = Object.keys(statuses).length;

  if (isDone) {
    return (
      <AppShell>
        <div className="glass-card card-animate mt-6 rounded-2xl p-6 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Dia finalizado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {postedCount} de {influencers.length} influenciadores registrados. Revise ou corrija abaixo se precisar.
          </p>
          <button
            onClick={comecarDoInicio}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcwIcon className="h-4 w-4" />
            Começar novo registro
          </button>
        </div>

        {/* Revisão rápida — editável na hora */}
        <div className="glass-card card-animate mt-4 rounded-2xl p-4">
          <h2 className="px-2 text-sm font-semibold text-foreground">Revisão de hoje</h2>
          <div className="mt-2 flex flex-col gap-2">
            {influencers.map((inf) => {
              const raw = statuses[inf.name] ?? inf.status ?? "";
              const formatos = parseFormatos(raw);
              return (
                <div key={inf.id} className="rounded-xl bg-white/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <InfluencerAvatar nome={inf.name} fotoUrl={obterFoto(inf.name)} className="h-8 w-8 text-xs" />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{inf.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {STATUS_ORDEM.map((s) => {
                      const ativo = formatos.includes(s);
                      const config = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            const semNao = formatos.filter((f) => f !== "nao-postou");
                            const nova = semNao.includes(s) ? semNao.filter((f) => f !== s) : [...semNao, s];
                            persistirStatus(inf.name, nova);
                          }}
                          className="rounded-full px-2.5 py-1 text-xs font-medium transition"
                          style={{
                            backgroundColor: ativo ? config.color : `${config.color}1A`,
                            color: ativo ? "#fff" : config.color,
                          }}
                        >
                          {config.icon} {config.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => persistirStatus(inf.name, ["nao-postou"])}
                      className="rounded-full px-2.5 py-1 text-xs font-medium transition"
                      style={{
                        backgroundColor: formatos.includes("nao-postou") ? "#FF3B30" : "#FF3B301A",
                        color: formatos.includes("nao-postou") ? "#fff" : "#FF3B30",
                      }}
                    >
                      🚫 Não Postou
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Registro</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">{hojeFormatado()}</span>
            <span className="text-border">·</span>
            {currentIndex + 1} / {influencers.length} · {postedCount} registrados
          </p>
        </div>
        {filaPendente.length > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF9500]/10 px-3 py-1.5 text-xs font-medium text-[#FF9500]">
            <WifiOffIcon className="h-3.5 w-3.5" />
            {filaPendente.length} pendente{filaPendente.length !== 1 ? "s" : ""}
          </span>
        )}
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
          <InfluencerAvatar nome={current.name} fotoUrl={obterFoto(current.name)} className="h-12 w-12 text-lg" />
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
          {STATUS_ORDEM.map((status, i) => {
            const config = STATUS_CONFIG[status];
            const isSelected = selected.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                disabled={saving}
                className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-50"
                style={{
                  borderColor: isSelected ? config.color : config.color + "55",
                  backgroundColor: isSelected ? `${config.color}33` : `${config.color}1A`,
                  boxShadow: isSelected ? `0 0 0 2px ${config.color}` : "none",
                }}
              >
                <span className="absolute left-2 top-2 hidden h-4 w-4 items-center justify-center rounded bg-black/10 text-[10px] font-bold text-current sm:flex">
                  {i + 1}
                </span>
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

        <p className="relative mt-3 hidden items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground sm:flex">
          <KeyboardIcon className="h-3 w-3" />
          Atalhos: 1-4 status · 0 não postou · ← anterior · → pular
          {ultimoAtalho && (
            <span className="atalho-flash absolute -top-9 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {ultimoAtalho}
            </span>
          )}
        </p>

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
