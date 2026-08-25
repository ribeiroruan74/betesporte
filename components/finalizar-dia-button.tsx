"use client";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { STATUS_CONFIG, parseFormatos } from "@/lib/influencers";
import type { Influencer } from "@/lib/use-influencers";
import { FlagIcon, Loader2Icon, CheckCircle2Icon, XIcon } from "lucide-react";

export function FinalizarDiaButton({ influencers = [] }: { influencers?: Influencer[] }) {
  const { mostrar } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [resumo, setResumo] = useState<{ salvos: number; horario: string } | null>(null);

  async function finalizar() {
    if (!window.confirm("Finalizar o dia de hoje? Os status do ACOMPANHAMENTO serão copiados para o BANCO_DE_DADOS.")) return;
    setCarregando(true);
    try {
      const res = await fetch("/api/finalizar-dia", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResumo({ salvos: data.salvos, horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
      } else {
        mostrar(data.error || "Erro ao finalizar o dia", "error");
      }
    } catch {
      mostrar("Erro de conexão ao finalizar o dia", "error");
    } finally {
      setCarregando(false);
    }
  }

  const porFormato = influencers.length
    ? influencers.reduce<Partial<Record<string, number>>>((acc, i) => {
        parseFormatos(i.status || "")
          .filter((f) => f !== "nao-postou")
          .forEach((f) => {
            acc[f] = (acc[f] || 0) + 1;
          });
        return acc;
      }, {})
    : {};
  const inadimplentes = influencers.filter((i) => parseFormatos(i.status || "").length === 0).length;

  return (
    <>
      <button
        onClick={finalizar}
        disabled={carregando}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        {carregando ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <FlagIcon className="h-4 w-4" />}
        Finalizar dia
      </button>

      {resumo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="modal-animate w-full max-w-sm rounded-2xl border border-border bg-popover p-6 text-popover-foreground">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#30D158]/15 text-[#30D158]">
                <CheckCircle2Icon className="h-6 w-6" />
              </div>
              <button onClick={() => setResumo(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-bold">Dia finalizado!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {resumo.salvos} registro(s) salvos no banco de dados às {resumo.horario}.
            </p>

            {Object.keys(porFormato).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(porFormato).map(([formato, qtd]) => {
                  const config = STATUS_CONFIG[formato as keyof typeof STATUS_CONFIG];
                  if (!config) return null;
                  return (
                    <span
                      key={formato}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.icon} {config.label}: {qtd}
                    </span>
                  );
                })}
              </div>
            )}
            {inadimplentes > 0 && (
              <p className="mt-3 text-xs font-medium text-[#FF3B30]">
                {inadimplentes} influenciador(es) sem status hoje.
              </p>
            )}

            <button
              onClick={() => setResumo(null)}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
