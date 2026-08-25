"use client";

import { useCallback, useEffect, useState } from "react";
import {
  lerFinanceiro,
  salvarFinanceiro,
  FINANCEIRO_PADRAO,
  type DadosFinanceiros,
  type FinanceiroPorInfluenciador,
} from "@/lib/financeiro";

export function useFinanceiro() {
  const [dados, setDados] = useState<FinanceiroPorInfluenciador>({});

  useEffect(() => {
    setDados(lerFinanceiro());
  }, []);

  const definirValorPorEntrega = useCallback((nome: string, valorPorEntrega: number) => {
    setDados((atuais) => {
      const novos = { ...atuais, [nome]: { valorPorEntrega } };
      salvarFinanceiro(novos);
      return novos;
    });
  }, []);

  const obterFinanceiro = useCallback((nome: string): DadosFinanceiros => dados[nome] || FINANCEIRO_PADRAO, [dados]);

  return { definirValorPorEntrega, obterFinanceiro };
}
