"use client";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { FlagIcon, Loader2Icon } from "lucide-react";

export function FinalizarDiaButton() {
  const { mostrar } = useToast();
  const [carregando, setCarregando] = useState(false);

  async function finalizar() {
    if (!window.confirm("Finalizar o dia de hoje? Os status do ACOMPANHAMENTO serão copiados para o BANCO_DE_DADOS.")) return;
    setCarregando(true);
    try {
      const res = await fetch("/api/finalizar-dia", { method: "POST" });
      const data = await res.json();
      if (res.ok) mostrar(`Dia finalizado — ${data.salvos} registro(s) no banco`);
      else mostrar(data.error || "Erro ao finalizar o dia", "error");
    } catch {
      mostrar("Erro de conexão ao finalizar o dia", "error");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <button
      onClick={finalizar}
      disabled={carregando}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      {carregando ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <FlagIcon className="h-4 w-4" />}
      Finalizar dia
    </button>
  );
}