"use client";

import { useCallback, useEffect, useState } from "react";
import { lerFotos, salvarFotos, type FotosPorInfluenciador } from "@/lib/fotos";

export function useFotos() {
  const [fotos, setFotos] = useState<FotosPorInfluenciador>({});

  useEffect(() => {
    setFotos(lerFotos());
  }, []);

  const definirFoto = useCallback((nome: string, url: string) => {
    setFotos((atuais) => {
      const novas = { ...atuais };
      if (url.trim()) novas[nome] = url.trim();
      else delete novas[nome];
      salvarFotos(novas);
      return novas;
    });
  }, []);

  const obterFoto = useCallback((nome: string) => fotos[nome] || "", [fotos]);

  return { fotos, definirFoto, obterFoto };
}
