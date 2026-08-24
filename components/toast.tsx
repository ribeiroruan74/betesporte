"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2Icon, AlertCircleIcon, InfoIcon } from "lucide-react";

type TipoToast = "success" | "error" | "info";
interface ToastItem { id: number; tipo: TipoToast; mensagem: string; }

const ToastContext = createContext<{ mostrar: (msg: string, tipo?: TipoToast) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrar = useCallback((mensagem: string, tipo: TipoToast = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, mensagem }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-animate pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl"
          >
            {t.tipo === "success" ? (
              <CheckCircle2Icon className="h-4 w-4 shrink-0 text-green-500" />
            ) : t.tipo === "error" ? (
              <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <InfoIcon className="h-4 w-4 shrink-0 text-blue-500" />
            )}
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}