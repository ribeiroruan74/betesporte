"use client";

import { useEffect, useState } from "react";

export interface Registro {
  data: string;
  nome: string;
  username: string;
  status: string;
}

export function useBancoDados() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/banco-dados")
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros || []))
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false));
  }, []);

  return { registros, loading };
}