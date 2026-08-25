"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { ThemeToggle } from "@/components/theme-toggle";
import { navLinks } from "@/components/app-shared";
import { useInfluencers } from "@/lib/use-influencers";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useLinhasMetaSemana } from "@/lib/use-metas-semana";
import { contaComoPostou, normalizaTexto } from "@/lib/influencers";
import { SearchIcon, BellIcon, HeadsetIcon, XIcon, UserRoundIcon, AlertCircleIcon, TargetIcon } from "lucide-react";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const activeItem = navLinks.find((item) => item.url === pathname);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);
  const [suporteAberto, setSuporteAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { influencers } = useInfluencers();
  const { registros } = useBancoDados();
  const { linhas: metas } = useLinhasMetaSemana(influencers, registros);

  const resultados = useMemo(() => {
    const t = normalizaTexto(termo);
    if (!t) return [];
    return influencers
      .filter((i) => normalizaTexto(i.name).includes(t) || normalizaTexto(i.username || "").includes(t))
      .slice(0, 6);
  }, [influencers, termo]);

  const inadimplentes = influencers.filter((i) => !contaComoPostou(i.status || ""));
  const metasPendentes = metas.filter((m) => m.temMeta && m.faltamTotal > 0);
  const metasBatidas = metas.filter((m) => m.cumpriu);
  const semNotificacoes = inadimplentes.length === 0 && metasPendentes.length === 0;

  function irPara(nome: string) {
    setBuscaAberta(false);
    setTermo("");
    router.push(`/historico?q=${encodeURIComponent(nome)}`);
  }

  return (
    <header className={cn("sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 md:px-6")}>
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Separator className="mr-2 data-[orientation=vertical]:h-4 md:hidden" orientation="vertical" />
        <AppBreadcrumbs page={activeItem} />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Busca */}
        <div className="relative flex items-center">
          {buscaAberta && (
            <div className="mr-1">
              <input
                ref={inputRef}
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar influenciador..."
                className="h-9 w-40 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary md:w-56"
              />
              {termo && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-lg">
                  {resultados.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">Nenhum influenciador encontrado.</p>
                  ) : (
                    resultados.map((inf) => (
                      <button
                        key={inf.id}
                        onClick={() => irPara(inf.name)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {inf.name.charAt(0)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{inf.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{inf.username}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <Button
            aria-label="Buscar"
            size="icon"
            variant="ghost"
            onClick={() => {
              setBuscaAberta((v) => !v);
              setNotifAberta(false);
              setSuporteAberto(false);
            }}
          >
            {buscaAberta ? <XIcon /> : <SearchIcon />}
          </Button>
        </div>

        {/* Notificações */}
        <div className="relative">
          <Button
            aria-label="Notificações"
            size="icon"
            variant="ghost"
            onClick={() => { setNotifAberta((v) => !v); setBuscaAberta(false); setSuporteAberto(false); }}
          >
            <BellIcon />
            {!semNotificacoes && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#FF3B30]" />
            )}
          </Button>
          {notifAberta && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              {semNotificacoes ? (
                <p className="mt-2 text-xs text-muted-foreground">Tudo em dia por aqui. 🎉</p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {inadimplentes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#FF3B30]">
                        <AlertCircleIcon className="h-3.5 w-3.5" />
                        {inadimplentes.length} inadimplente{inadimplentes.length !== 1 ? "s" : ""} hoje
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {inadimplentes.slice(0, 4).map((i) => (
                          <li key={i.id} className="truncate text-xs text-muted-foreground">
                            <UserRoundIcon className="mr-1 inline h-3 w-3" />
                            {i.name}
                          </li>
                        ))}
                        {inadimplentes.length > 4 && (
                          <li className="text-xs text-muted-foreground">+{inadimplentes.length - 4} outros</li>
                        )}
                      </ul>
                      <a href="/cobranca" className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline">
                        Ver na Cobrança →
                      </a>
                    </div>
                  )}
                  {metasPendentes.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#FF9500]">
                        <TargetIcon className="h-3.5 w-3.5" />
                        {metasPendentes.length} com pendência na meta semanal
                      </div>
                      <a href="/" className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline">
                        Ver Metas da semana →
                      </a>
                    </div>
                  )}
                  {metasBatidas.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <div className="text-xs font-medium text-[#30D158]">
                        🎉 {metasBatidas.length} bateu{metasBatidas.length !== 1 ? "ram" : ""} a meta semanal
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suporte */}
        <div className="relative">
          <Button
            aria-label="Suporte"
            size="icon"
            variant="ghost"
            onClick={() => { setSuporteAberto((v) => !v); setBuscaAberta(false); setNotifAberta(false); }}
          >
            <HeadsetIcon />
          </Button>
          {suporteAberto && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-card p-4 shadow-lg">
              <p className="text-sm font-semibold text-foreground">Suporte</p>
              <a
                href="mailto:suporte@betesporte.com"
                className="mt-2 block text-xs text-muted-foreground hover:text-foreground"
              >
                suporte@betesporte.com
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
