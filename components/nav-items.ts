import {
  LayoutDashboard,
  ClipboardCheck,
  DollarSign,
  Trophy,
  FileText,
  History,
  Settings,
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Registro", href: "/registro", icon: ClipboardCheck },
  { title: "Cobrança", href: "/cobranca", icon: DollarSign },
  { title: "Ranking", href: "/ranking", icon: Trophy },
  { title: "Relatórios", href: "/relatorios", icon: FileText },
  { title: "Histórico", href: "/historico", icon: History },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];