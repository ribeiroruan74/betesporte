"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ClipboardCheckIcon, MessageSquareIcon, BarChart3Icon, SettingsIcon } from "lucide-react";

const tabs = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/registro", label: "Registro", icon: ClipboardCheckIcon },
  { href: "/cobranca", label: "Cobrança", icon: MessageSquareIcon },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3Icon },
  { href: "/configuracoes", label: "Ajustes", icon: SettingsIcon },
];

export function IosTabBar() {
  const pathname = usePathname();

  return (
    <nav className="ios-tabbar md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`ios-tab-item ${isActive ? "active" : ""}`}
          >
            <span className="ios-tab-icon">
              <Icon />
            </span>
            <span className="ios-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}