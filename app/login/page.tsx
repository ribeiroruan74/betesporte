"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 🔑 SENHA ÚNICA DO SISTEMA — troque pela senha que sua equipe vai usar
const PASSWORD = "betesporte2026";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === PASSWORD) {
      document.cookie = "auth=1; path=/; max-age=2592000";
      router.push("/");
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            B
          </div>
          <h1 className="text-xl font-bold text-foreground">BETesporte</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de Influenciadores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Senha"
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          {error && (
            <p className="text-sm text-destructive">Senha incorreta. Tente novamente.</p>
          )}
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}