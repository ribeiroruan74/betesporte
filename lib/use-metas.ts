"use client";

import { useCallback, useEffect, useState } from "react";
import { lerMetas, salvarMetas, metaDe, type MetaSemanal, type MetasPorInfluenciador } from "@/lib/metas";

export function useMetas() {
  const [metas, setMetas] = useState<MetasPorInfluenciador>({});
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setMetas(lerMetas());
    setCarregado(true);
  }, []);

  const definirMeta = useCallback((nome: string, meta: MetaSemanal) => {
    setMetas((atuais) => {
      const novas = { ...atuais, [nome]: meta };
      salvarMetas(novas);
      return novas;
    });
  }, []);

  const obterMeta = useCallback((nome: string) => metaDe(metas, nome), [metas]);

  return { metas, definirMeta, obterMeta, carregado };
}
