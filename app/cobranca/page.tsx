"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { useToast } from "@/components/toast";

type CobrancaStatus = "pendente" | "cobrado" | "pago";

function normaliza(s: string) {
  return (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

function ehNaoPostou(status: string) {
  const n = normaliza(status);
  return n === "naopostou" || n === "pendente" || n === "nao" || n === "";
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CHAVE() {
  return `betesporte_cobrancas_${hojeISO()}`;
}

function buildWhatsAppText(name: string, username: string) {
  return encodeURIComponent(
    `Olá ${name} (${username})! 👋\n\n` +
    `Notamos que você ainda não realizou a postagem de hoje. ` +
    `Conforme o combinado, pedimos que realize a entrega o quanto antes para manter o acordo ativo. ` +
    `Qualquer dúvida, estamos à disposição!\n\n` +
    `Atenciosamente, Equipe BETesporte.`
  );
}

export default function CobrancaPage() {
  const { influencers, loading } = useInfluencers();
  const { mostrar } = useToast();
  const [cobrancas, setCobrancas] = useState<Record<number, CobrancaStatus>>({});
  const [cobradoEm, setCobradoEm] = useState<Record<number, string>>({});

  // Carrega o estado persistido do dia
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAVE());
      if (raw) {
        const p = JSON.parse(raw);
        setCobrancas(p.cobrancas || {});
        setCobradoEm(p.cobradoEm || {});
      }
    } catch { /* ignore */ }
  }, []);

  // Persiste a cada mudança
  useEffect(() => {
    localStorage.setItem(CHAVE(), JSON.stringify({ cobrancas, cobradoEm }));
  }, [cobrancas, cobradoEm]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  const inadimplentes = influencers.filter((i) => ehNaoPostou(i.status || ""));
  const pendentes = inadimplentes.filter((i) => (cobrancas[i.id] || "pendente") === "pendente");

  function marcarCobrado(id: number) {
    setCobrancas((prev) => ({ ...prev, [id]: "cobrado" }));
    setCobradoEm((prev) => ({
      ...prev,
      [id]: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }));
    mostrar("Marcado como cobrado");
  }

  function marcarPago(id: number) {
    setCobrancas((prev) => ({ ...prev, [id]: "pago" }));
    mostrar("Marcado como pago ✓");
  }

  function voltarParaPendente(id: number) {
    setCobrancas((prev) => ({ ...prev, [id]: "pendente" }));
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pendentes.length} inadimplente{pendentes.length !== 1 ? "s" : ""} para cobrar hoje
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-[#FF3B30]">{pendentes.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Cobrados</p>
          <p className="mt-1 text-2xl font-bold text-[#FF9500]">
            {inadimplentes.filter((i) => cobrancas[i.id] === "cobrado").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Pagos</p>
          <p className="mt-1 text-2xl font-bold text-[#30D158]">
            {inadimplentes.filter((i) => cobrancas[i.id] === "pago").length}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {inadimplentes.map((inf) => {
          const status = cobrancas[inf.id] || "pendente";
          const whatsappLink = `https://wa.me/?text=${buildWhatsAppText(inf.name, inf.username)}`;

          return (
            <div key={inf.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{inf.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{inf.username}</p>
                </div>
                {status === "pendente" && (
                  <span className="rounded-full bg-[#FF3B30] px-3 py-1 text-xs font-medium text-white">Não Postou</span>
                )}
                {status === "cobrado" && (
                  <span className="rounded-full bg-[#FF9500] px-3 py-1 text-xs font-medium text-white">
                    Cobrado às {cobradoEm[inf.id]}
                  </span>
                )}
                {status === "pago" && (
                  <span className="rounded-full bg-[#30D158] px-3 py-1 text-xs font-medium text-white">Pago ✅</span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {status === "pendente" && (
                  <>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg bg-[#25D366] py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      💬 Cobrar via WhatsApp
                    </a>
                    <button
                      onClick={() => marcarCobrado(inf.id)}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Já cobrei
                    </button>
                  </>
                )}
                {status === "cobrado" && (
                  <>
                    <button
                      onClick={() => marcarPago(inf.id)}
                      className="flex-1 rounded-lg bg-[#30D158] py-2.5 text-sm font-semibold text-white"
                    >
                      ✅ Marcou como pago
                    </button>
                    <button
                      onClick={() => voltarParaPendente(inf.id)}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Desfazer
                    </button>
                  </>
                )}
                {status === "pago" && (
                  <button
                    onClick={() => voltarParaPendente(inf.id)}
                    className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Desfazer
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {inadimplentes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum inadimplente hoje. 🎉</p>
        )}
      </div>
    </AppShell>
  );
}