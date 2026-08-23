"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { navLinks } from "@/components/app-shared";
import { SearchIcon, BellIcon, HeadsetIcon, XIcon } from "lucide-react";

const activeItem = navLinks.find((item) => item.isActive);

export function AppHeader() {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);
  const [suporteAberto, setSuporteAberto] = useState(false);

  return (
    <header className={cn("sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 md:px-6")}>
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Separator className="mr-2 data-[orientation=vertical]:h-4 md:hidden" orientation="vertical" />
        <AppBreadcrumbs page={activeItem} />
      </div>

      <div className="flex items-center gap-2">
        {/* Busca */}
        <div className="relative flex items-center">
          {buscaAberta && (
            <input
              autoFocus
              placeholder="Buscar influenciador..."
              className="mr-1 h-9 w-40 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary md:w-56"
            />
          )}
          <Button
            aria-label="Buscar"
            size="icon"
            variant="ghost"
            onClick={() => { setBuscaAberta((v) => !v); setNotifAberta(false); setSuporteAberto(false); }}
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
          </Button>
          {notifAberta && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-card p-4 shadow-lg">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              <p className="mt-2 text-xs text-muted-foreground">Nenhuma notificação no momento.</p>
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