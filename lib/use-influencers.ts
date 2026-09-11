"use client";

import { useCallback, useEffect, useState } from "react";

export type Influencer = {
  id: number;
  name: string;
  username: string;
  link?: string;
  status?: string;
};

export function useInfluencers() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/influencers");
      const data = await res.json();
      if (data.influencers) {
        setInfluencers(data.influencers);
      }
    } catch (e) {
      setError("Falha ao carregar os influenciadores");
    }
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  return { influencers, loading, error, refetch };
}
