"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon, XIcon, AlertCircleIcon, InfoIcon } from "lucide-react";

type TipoToast = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tipo: TipoToast;
  titulo: string;
  descricao?: string;
}

type ToastInput = string | { titulo: string; descricao?: string; tipo?: TipoToast };

const ToastContext = createContext<{ mostrar: (input: ToastInput, tipo?: TipoToast) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrar = useCallback((input: ToastInput, tipo?: TipoToast) => {
    let titulo: string;
    let descricao: string | undefined;
    let tipoToast: TipoToast = "success";

    if (typeof input === "string") {
      titulo = input;
      tipoToast = tipo ?? "success";
    } else {
      titulo = input.titulo;
      descricao = input.descricao;
      tipoToast = input.tipo ?? "success";
    }

    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo: tipoToast, titulo, descricao }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  function fechar(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="pointer-events-none fixed top-20 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-animate pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground"
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                t.tipo === "success" ? "bg-[#30D158]" : t.tipo === "error" ? "bg-[#FF3B30]" : "bg-primary"
              }`}
            >
              {t.tipo === "success" ? (
                <CheckIcon className="h-4 w-4" />
              ) : t.tipo === "error" ? (
                <AlertCircleIcon className="h-4 w-4" />
              ) : (
                <InfoIcon className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t.titulo}</p>
              {t.descricao && <p className="mt-0.5 text-xs text-muted-foreground">{t.descricao}</p>}
            </div>
            <button
              onClick={() => fechar(t.id)}
              className="shrink-0 text-muted-foreground transition hover:text-foreground"
              aria-label="Fechar"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}