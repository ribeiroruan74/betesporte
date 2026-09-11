"use client";

import { useCallback, useEffect, useState } from "react";

export interface Registro {
  data: string;
  nome: string;
  username: string;
  status: string;
}

export function useBancoDados() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    return fetch("/api/banco-dados")
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  return { registros, loading, refetch };
}
