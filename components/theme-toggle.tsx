"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lerTema, estaEscuro, salvarTema } from "@/lib/tema";

export function ThemeToggle() {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setEscuro(estaEscuro(lerTema()));
  }, []);

  function alternar() {
    const novoEscuro = !escuro;
    setEscuro(novoEscuro);
    salvarTema(novoEscuro ? "escuro" : "claro");
  }

  return (
    <Button
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      size="icon"
      variant="ghost"
      onClick={alternar}
    >
      {escuro === null ? null : escuro ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
