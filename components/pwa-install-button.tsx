"use client";

import { useEffect, useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [deferido, setDeferido] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function aoFicarInstalavel(e: Event) {
      e.preventDefault();
      setDeferido(e as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setDeferido(null);
    }
    window.addEventListener("beforeinstallprompt", aoFicarInstalavel);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoFicarInstalavel);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (!deferido) return null;

  async function instalar() {
    if (!deferido) return;
    await deferido.prompt();
    await deferido.userChoice;
    setDeferido(null);
  }

  return (
    <Button aria-label="Instalar aplicativo" size="icon" variant="ghost" onClick={instalar} title="Instalar app">
      <DownloadIcon />
    </Button>
  );
}
