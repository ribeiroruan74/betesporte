"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/influencers");
        const data = await res.json();
        if (data.influencers) {
          setInfluencers(data.influencers);
        }
      } catch (e) {
        setError("Falha ao carregar os influenciadores");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { influencers, loading, error };
}